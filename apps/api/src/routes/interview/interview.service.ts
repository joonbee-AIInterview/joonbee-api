import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Interview } from "@app/common/db/entity/interview.entity";
import { DataSource, QueryRunner, Repository } from "typeorm";
import { ResponseInterviewInfoDTO, ResponseInterviewsDTO, ResponseInterviewsWithLikeMemberQuestionData, ResponseQuestionInfo } from "./dto/response.dto";
import { Member } from '@app/common/db/entity/member.entity';
import { Like } from '@app/common/db/entity/like.entity';
import { InterviewAndQuestion } from '@app/common/db/entity/and.question.entity';
import { Question } from '@app/common/db/entity/question.entity';
import { ResponseInterviewDetail } from "../member/dto/response.dto";
import { CustomError } from "@app/common/config/common";

@Injectable()
export class InterviewService {

     private PAGE_SIZE: number;

     constructor(
          @InjectRepository(Interview)
          private readonly interviewRepository: Repository<Interview>,
          @InjectRepository(InterviewAndQuestion)
          private readonly interviewAndQuestionRepository: Repository<InterviewAndQuestion>,
          @InjectRepository(Member)
          private readonly memberRepository: Repository<Member>,
          private readonly dataSourse: DataSource
     ) {
          this.PAGE_SIZE = 16;
     }

     /**
      * 로그인하지 않은 상태에서 카테고리별로 인터뷰를 9개씩 가져오는 코드
      * 
      * @param page 
      * @param categoryName 
      * @param sort 
      * @returns 
      * @author 송재근
      */
     async getInterviewsByCategoryWithoutMemberId(page: number, categoryName: string, sort: string): Promise<ResponseInterviewsDTO> {
          
          const subCategoryMap  = new Map<string, Set<string>> ();

          const countQuery = await this.interviewRepository.createQueryBuilder('i')
                    .select('COUNT(i.id)', 'count')
                    .where('i.categoryName = :categoryName', { categoryName })
                    .getRawOne();
          //this.validationPagination(Number(countQuery.count), page);

          try {
               const tempPacket = await this.interviewRepository.createQueryBuilder('i')
                    .select([
                         'i.id as interviewId',
                         'i.member_id as memberId',
                         'm.thumbnail as thumbnail', 
                         'm.nick_name as nickname', 
                         'i.category_name as categoryName',
                         'COUNT(l.member_id) as likeCount',
                         'i.createdAt as createdAt'])
                    .innerJoin('member', 'm', 'i.member_id = m.id')
                    .leftJoin('like', 'l', 'i.id = l.interview_id')
                    .where('i.categoryName = :categoryName', { categoryName })
                    .groupBy('i.id, i.member_id, m.thumbnail, i.category_name');

               let rowPacket;
               if (sort === 'latest') rowPacket = await tempPacket.orderBy('i.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
               else rowPacket = await tempPacket.orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();

               const interviewIdList = rowPacket.map((row) => row.interviewId);

               let questionPacket = [];
               if(interviewIdList.length) {
                    questionPacket = await this.interviewAndQuestionRepository.createQueryBuilder('iaq')
                         .select([
                              'iaq.interview_id as interviewId',
                              'iaq.question_id as questionId',
                              'q.question_content as questionContent',
                              'c.category_name as subCategoryName',
                              "iaq.interview_id as interviewId"   
                         ])
                         .innerJoin('question', 'q', 'iaq.question_id = q.id')
                         .innerJoin('category', 'c' , 'q.category_id = c.id')
                         .andWhere('iaq.interview_id IN (:...interviewIdList)', {
                              interviewIdList: interviewIdList.map((interviewId) => Number(interviewId))
                         })
                         .getRawMany();

               }

               const resultDTOs: ResponseInterviewsWithLikeMemberQuestionData[] = rowPacket.map(packet => ({
                    interviewId: Number(packet.interviewId),
                    memberId: packet.memberId,
                    nickname: packet.nickname,
                    thumbnail: packet.thumbnail,
                    categoryName: packet.categoryName,
                    likeCount: Number(packet.likeCount),
                    questions: questionPacket
                         .filter(question => question.interviewId === packet.interviewId)
                         .map(interviewQuestion => {
                              const categorySetForInterviewID = subCategoryMap.get(packet.interviewId);

                              if(!categorySetForInterviewID) {
                                   const subCategorySet = new Set<string>();
                                   subCategorySet.add(interviewQuestion.subCategoryName);
                                   subCategoryMap.set(packet.interviewId, subCategorySet);
                              }else {
                                   categorySetForInterviewID.add(interviewQuestion.subCategoryName as string);
                              }
                              
                              return {
                                   questionId: Number(interviewQuestion.questionId),
                                   questionContent: interviewQuestion.questionContent,
                              }
                         }),
                    subCategoryName: Array.from(subCategoryMap.get(packet.interviewId)) || []
               }));
               return this.makeResult(Number(countQuery.count), resultDTOs);
          } catch (error) {
               console.error('getInterviewsByCategoryWithoutMemberId ERROR interview.service \n' + error);
               throw new CustomError('getInterviewsByCategoryWithoutMemberId 코드 오류 발생 ', 500);
          }
     }

     /**
      * 로그인한 상태에서 카테고리별로 인터뷰를 9개씩 가져오고 본인이 좋아요를 누른 인터뷰를 표시하는 코드
      * 
      * @param page 
      * @param categoryName 
      * @param memberId 
      * @param sort 
      * @returns 
      * @author 송재근
      */
     async getInterviewsByCategoryWithMemberId(page: number, categoryName: string, memberId: string, sort: string): Promise<ResponseInterviewsDTO> {

          const subCategoryMap = new Map<string, Set<string>>();

          const countQuery = await this.interviewRepository.createQueryBuilder('i')
                    .select('COUNT(i.id)', 'count')
                    .where('i.categoryName = :categoryName', { categoryName })
                    .getRawOne();
        //  this.validationPagination(Number(countQuery.count), page);
          
          try {
               const tempPacket = await this.interviewRepository.createQueryBuilder('i')
                    .select([
                         'i.id as interviewId',
                         'i.member_id as memberId',
                         'm.thumbnail as thumbnail', 
                         'm.nick_name as nickname', 
                         'i.category_name as categoryName',
                         'COUNT(l.member_id) as likeCount',
                         `CASE WHEN EXISTS (
                              SELECT 1 FROM joonbee.like as ll 
                              WHERE ll.interview_id = i.id and ll.member_id = :memberId
                              ) then 1 ELSE 0 END as bool`])
                    .innerJoin('member', 'm', 'i.member_id = m.id')
                    .leftJoin('like', 'l', 'i.id = l.interview_id')
                    .where('i.categoryName = :categoryName')
                    .groupBy('i.id, i.member_id, m.thumbnail, i.category_name').setParameters({ memberId, categoryName });

               let rowPacket;
               if (sort === 'latest') rowPacket = await tempPacket.orderBy('i.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
               else rowPacket = await tempPacket.orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();

               const interviewIdList = rowPacket.map((row) => row.interviewId);
               let questionPacket = [];

               if(interviewIdList.length){
                    questionPacket = await this.interviewAndQuestionRepository.createQueryBuilder('iaq')
                         .select([
                              'iaq.interview_id as interviewId',
                              'iaq.question_id as questionId',
                              'q.question_content as questionContent',
                              'c.category_name as subCategoryName'
                         ])
                         .innerJoin('question', 'q', 'iaq.question_id = q.id')
                         .innerJoin('category', 'c' , 'q.category_id = c.id')
                         .andWhere('iaq.interview_id IN (:...interviewIdList)', {
                              interviewIdList: interviewIdList.map((interviewId) => Number(interviewId))
                         })
                         .getRawMany();
               }
               
               const resultDTOs: ResponseInterviewsWithLikeMemberQuestionData[] = rowPacket.map(packet => ({
                    interviewId: Number(packet.interviewId),
                    liked: Boolean(packet.bool),
                    memberId: packet.memberId,
                    nickname: packet.nickname,
                    thumbnail: packet.thumbnail,
                    categoryName: packet.categoryName,
                    likeCount: Number(packet.likeCount),
                    questions: questionPacket
                         .filter(question => question.interviewId === packet.interviewId)
                         .map(interviewQuestion => {
                              const categorySetForInterviewID = subCategoryMap.get(packet.interviewId);

                              if(!categorySetForInterviewID) {
                                   const subCategorySet = new Set<string>();
                                   subCategorySet.add(interviewQuestion.subCategoryName);
                                   subCategoryMap.set(packet.interviewId, subCategorySet);
                              }else{
                                   categorySetForInterviewID.add(interviewQuestion.subCategoryName as string);
                              }

                              return {
                                   questionId: Number(interviewQuestion.questionId),
                                   questionContent: interviewQuestion.questionContent,
                              }
                         }),
                    subCategoryName: Array.from(subCategoryMap.get(packet.interviewId)) || []
               }));

               return this.makeResult(Number(countQuery.count), resultDTOs);
          } catch (error) {
               console.error('getInterviewsByCategoryWithMemberId ERROR interview.service \n' + error);
               throw new CustomError('getInterviewsByCategoryWithMemberId 코드 오류 발생 ', 500);
          }
     }

     /**
      * 로그인하지 않은 상태에서 인터뷰를 9개씩 가져오는 코드
      * 
      * @param page 
      * @param sort 
      * @returns 
      * @author 송재근
      */
     async getInterviewsWithoutMemberId(page: number, sort: string): Promise<ResponseInterviewsDTO> {

          const subCategoryMap = new Map<string, Set<string>>();

          const countQuery = await this.interviewRepository.createQueryBuilder('i')
               .select('COUNT(i.id)', 'count')
               .getRawOne();
          //this.validationPagination(Number(countQuery.count), page);
     
          try {
               const tempPacket = await this.interviewRepository.createQueryBuilder('i')
                    .select([
                         'i.id as interviewId',
                         'i.member_id as memberId',
                         'm.thumbnail as thumbnail', 
                         'm.nick_name as nickname', 
                         'i.category_name as categoryName',
                         'COUNT(l.member_id) as likeCount',
                         'i.createdAt as createdAt'])
                    .innerJoin('member', 'm', 'i.member_id = m.id')
                    .leftJoin('like', 'l', 'i.id = l.interview_id')
                    .groupBy('i.id, i.member_id, m.thumbnail, i.category_name');

               let rowPacket;
               if (sort === 'latest') rowPacket = await tempPacket.orderBy('i.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
               else rowPacket = await tempPacket.orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();           

               const interviewIdList = rowPacket.map((row) => row.interviewId);

               let questionPacket = [];
               if(interviewIdList.length){
                    questionPacket = await this.interviewAndQuestionRepository.createQueryBuilder('iaq')
                         .select([
                              'iaq.interview_id as interviewId',
                              'iaq.question_id as questionId',
                              'q.question_content as questionContent',
                              'c.category_name as subCategoryName'
                         ])
                         .innerJoin('question', 'q', 'iaq.question_id = q.id')
                         .innerJoin('category', 'c', 'q.category_id = c.id')
                         .andWhere('iaq.interview_id IN (:...interviewIdList)', {
                              interviewIdList: interviewIdList.map((interviewId) => Number(interviewId))
                         })
                         .getRawMany();
               }

               const resultDTOs: ResponseInterviewsWithLikeMemberQuestionData[] = rowPacket.map(packet => {
                    return {
                         interviewId: Number(packet.interviewId),
                         memberId: packet.memberId,
                         nickname: packet.nickname,
                         thumbnail: packet.thumbnail,
                         categoryName: packet.categoryName,
                         likeCount: Number(packet.likeCount),
                         questions: questionPacket
                              .filter(question => question.interviewId === packet.interviewId)
                              .map(interviewQuestion => {
                                   const categorySetForInterviewID = subCategoryMap.get(packet.interviewId);

                                   if(!categorySetForInterviewID){
                                        const subCategorySet = new Set<string>();
                                        subCategorySet.add(interviewQuestion.subCategoryName);
                                        subCategoryMap.set(packet.interviewId, subCategorySet);
                                   }else{
                                        categorySetForInterviewID.add(interviewQuestion.subCategoryName as string);
                                   }

                                   return {
                                        questionId: Number(interviewQuestion.questionId),
                                        questionContent: interviewQuestion.questionContent,
                         }}),
                         subCategoryName: Array.from(subCategoryMap.get(packet.interviewId)) || []
                    }
               });

               return this.makeResult(Number(countQuery.count), resultDTOs);
          } catch (error) {
               console.error('getInterviewsWithoutMemberId ERROR interview.service \n' + error);
               throw new CustomError('getInterviewsWithoutMemberId 코드 오류 발생 ', 500);
          }
     }

     /**
      * 로그인한 상태에서 인터뷰를 9개씩 가져오고 본인이 좋아요를 누른 인터뷰를 표시하는 코드
      * 
      * @param page  
      * @param memberId 
      * @param sort 
      * @returns 
      * @author 송재근
      */
     async getInterviewsWithMemberId(page: number, memberId: string, sort: string): Promise<ResponseInterviewsDTO> {

          const subCategoryMap = new Map<string, Set<string>>();

          const countQuery = await this.interviewRepository.createQueryBuilder('i')
               .select('COUNT(i.id)', 'count')
               .getRawOne();
          //this.validationPagination(Number(countQuery.count), page);

          try {
               const tempPacket = await this.interviewRepository.createQueryBuilder('i')
                    .select([
                         'i.id as interviewId',
                         'i.member_id as memberId',
                         'm.thumbnail as thumbnail', 
                         'm.nick_name as nickname', 
                         'i.category_name as categoryName',
                         'COUNT(l.member_id) as likeCount', 
                         `CASE WHEN EXISTS (
                              SELECT 1 FROM joonbee.like as ll 
                              WHERE ll.interview_id = i.id and ll.member_id = :memberId
                              ) then 1 ELSE 0 END as bool`])
                    .innerJoin('member', 'm', 'i.member_id = m.id')
                    .leftJoin('like', 'l', 'i.id = l.interview_id')
                    .groupBy('i.id, i.member_id, m.thumbnail, i.category_name')
                    .setParameter('memberId', memberId);

               let rowPacket;
               if (sort === 'latest') rowPacket = await tempPacket.orderBy('i.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
               else rowPacket = await tempPacket.orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();

               const interviewIdList = rowPacket.map((row) => row.interviewId);

               let questionPacket = [];
               if(interviewIdList.length){
                    questionPacket = await this.interviewAndQuestionRepository.createQueryBuilder('iaq')
                         .select([
                              'iaq.interview_id as interviewId',
                              'iaq.question_id as questionId',
                              'q.question_content as questionContent',
                              'c.category_name as subCategoryName'
                         ])
                         .innerJoin('question', 'q', 'iaq.question_id = q.id')
                         .innerJoin('category', 'c', 'q.category_id = c.id')
                         .andWhere('iaq.interview_id IN (:...interviewIdList)', {
                              interviewIdList: interviewIdList.map((interviewId) => Number(interviewId))
                         })
                         .getRawMany();
               }

               const resultDTOs: ResponseInterviewsWithLikeMemberQuestionData[] = rowPacket.map(packet => ({
                    interviewId: Number(packet.interviewId),
                    liked: Boolean(packet.bool),
                    memberId: packet.memberId,
                    nickname: packet.nickname,
                    thumbnail: packet.thumbnail,
                    categoryName: packet.categoryName,
                    likeCount: Number(packet.likeCount),
                    questions: questionPacket
                         .filter(question => question.interviewId === packet.interviewId)
                         .map(interviewQuestion => {
                              
                              const categorySetForInterviewID = subCategoryMap.get(packet.interviewId);
                              if(!categorySetForInterviewID) {
                                   const subCategorySet = new Set<string>();
                                   subCategorySet.add(interviewQuestion.subCategoryName);
                                   subCategoryMap.set(packet.interviewId, subCategorySet);
                              }else {
                                   categorySetForInterviewID.add(interviewQuestion.subCategoryName as string);
                              }
                              
                              return {
                                   questionId: Number(interviewQuestion.questionId),
                                   questionContent: interviewQuestion.questionContent,
                              }
                         }),
                         subCategoryName: Array.from(subCategoryMap.get(packet.interviewId)) || []
               }));

               return this.makeResult(Number(countQuery.count), resultDTOs);
          } catch (error) {
               console.error('getInterviewsWithMemberId ERROR interview.service \n' + error);
               throw new CustomError('getInterviewsWithMemberId 코드 오류 발생 ', 500);
          }
     }

     /**
      * @note 인터뷰 데이터 조호하지만 인증없이 조회이기 때문에 gpt 의견에 대한 정보는 조회하지 않음
      */
     async interviewInfoData(interviewId: number): Promise<ResponseInterviewInfoDTO> {

         const questionInfos: ResponseQuestionInfo[] = [];
         const queryRunner: QueryRunner = this.dataSourse.createQueryRunner();

          await queryRunner.connect();
          await queryRunner.startTransaction();

          try{
               const data = await queryRunner.manager.createQueryBuilder()
                    .select([
                         'm.thumbnail as profile', 
                         'm.nickName as nickName',
                         'i.categoryName as categoryName', 
                         'q.questionContent as questionContent',
                         'q.id as questionId',
                         'iaq.commentary as commentary',
                         'iaq.evaluation as evaluation',
                         'iaq.answer_content as answerContent'   
                    ])
                    .from(Interview, 'i')
                    .innerJoin('i.member', 'm')
                    .innerJoin('i.interviewAndQuestions','iaq')
                    .innerJoin('iaq.question', 'q')
                    .where('i.id = :interviewId',{interviewId})
                    .getRawMany();

               const likeCount = await queryRunner.manager.createQueryBuilder(Like, 'l')
                         .where('l.interviewId = :interviewId',{interviewId})
                         .getCount();

               await queryRunner.commitTransaction();

               if(!data.length) throw new CustomError('존재하지 않는 면접정보입니다.',400);

               data.forEach((result) => {
                    questionInfos.push({
                         questionId: +result.questionId,
                         questionContent: result.questionContent,
                         commentary: result.commentary,
                         evaluation: result.evaluation,
                         answerContent: result.answerContent
                    })
               });

               const resultDTO: ResponseInterviewInfoDTO = {
                    memberThumnbail: data[0].profile,
                    memberNickName: data[0].nickName,
                    questionContents: questionInfos,
                    categoryName: data[0].categoryName,
                    likeCount: +likeCount
               }

               return resultDTO;

          }catch(err){
               console.error(err)
               await queryRunner.rollbackTransaction();

               if(err instanceof CustomError){
                    throw new CustomError(err.message, err.statusCode);
               }

               throw new CustomError('면접 데이터 조회 중 알 수없는 에러 발생',500);
          }finally{
               await queryRunner.release();
          }
          return null;
     }

     /**
      * @note redis에서 sub받은 데이터들로 인터뷰 목록 정보 받아오기  
      */



     /**
      * page관한 유효성을 체크하는 코드
      * 
      * @param page
      * @author 송재근
      */
     validationCheckPage(page: number) {
          if (isNaN(Number(page))) 
               throw new CustomError('page에는 문자가 아닌 숫자를 입력해주세요. ', 400);
          if (Number(page) <= 0) 
               throw new CustomError('page에는 1보다 큰 값을 입력해주세요. ', 400);
     }

     /**
      * sort에 관한 유효성을 체크하는 코드
      * 
      * @param sort
      * @author 송재근
      */
     validationCheckSort(sort: string) {
          if (!['latest', 'like'].includes(sort)) 
               throw new CustomError(`정렬 기준은 '최신순', '좋아요'만 가능합니다. `, 400);
     }

     /**
      * categoryName에 정해진 형태만 오는지 확인하는 코드
      * 
      * @param categoryName
      * @author 송재근
      */
     validationCheckCategory(categoryName: string) {
          if (!['', 'fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) 
               throw new CustomError('상위카테고리가 아닙니다. ', 400);
     }

     /**
      * 로그인한 사용자가 존재하는 사용자인지 확인하는 코드
      * 
      * @param memberId
      * @author 송재근
      */
     async validationCheckMember(memberId: string): Promise<void> {
          const checkMember = await this.memberRepository.findOne({
               where: {
                    id: memberId,
               },
          });
          if (!checkMember) 
               throw new CustomError('존재하지 않는 사용자입니다. ', 400);
     }

     /**
      * total과 만들어진 데이터를 result에 담는 코드
      * 
      * @param count 
      * @param resultDTOs 
      * @returns 
      * @author 송재근
      */
     makeResult(count: number, resultDTOs: ResponseInterviewsWithLikeMemberQuestionData[]): ResponseInterviewsDTO {
          const result: ResponseInterviewsDTO = {
               total: count,
               result: resultDTOs,
          };
          return result;
     }

     /**
      * page 유효성을 체크하는 코드
      * 
      * @param countQuery 
      * @author 송재근
      */
     validationPagination(countQuery: number, page: number) {
          const maxPage = Math.ceil(countQuery / this.PAGE_SIZE);
          if (page > maxPage) throw new CustomError('해당 페이지에는 데이터가 존재하지 않습니다.', 400);
     } 
}