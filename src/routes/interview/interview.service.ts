import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomError } from "src/common/config/common";
import { Interview } from "src/entity/interview.entity";
import { DataSource, QueryRunner, Repository } from "typeorm";
import { ResponseInterviewInfoDTO, ResponseInterviewsDTO, ResponseQuestionInfo } from "./dto/response.dto";
import { Member } from 'src/entity/member.entity';
import { Like } from 'src/entity/like.entity';
import { InterviewAndQuestion } from 'src/entity/and.question.entity';
import { Question } from 'src/entity/question.entity';
import { ResponseInterviewDetail } from "../member/dto/response.dto";

@Injectable()
export class InterviewService {

     private PAGE_SIZE: number;

     constructor(
          @InjectRepository(Interview)
          private readonly interviewRepository: Repository<Interview>,
          @InjectRepository(InterviewAndQuestion)
          private readonly interviewAndQuestionRepository: Repository<InterviewAndQuestion>,
          private readonly dataSourse: DataSource
     ) {
          this.PAGE_SIZE = 9;
     }

     /**
     * @note 디폴트로 9개의 랜덤 인터뷰를 가져온다.
     */
     async getInterviews(page: number, memberId: string, sort: string): Promise<ResponseInterviewsDTO> {
          let rowPacket;
          try {
               const countQuery = await this.interviewRepository
                    .createQueryBuilder('interview')
                    .select('COUNT(interview.id)', 'count')
                    .getRawOne();
               let interviewsWithQuestionCategoryMemberDTOs;
               if (memberId === undefined) {
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewID',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount',
                                   'interview.createdAt as createdAt'])
                              .innerJoin('member', 'm', 'interview.member_id = m.id')
                              .leftJoin('like', 'l', 'interview.id = l.interview_id')
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewID',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount',
                                   'interview.createdAt as createdAt'])
                                   .innerJoin('member', 'm', 'interview.member_id = m.id')
                                   .leftJoin('like', 'l', 'interview.id = l.interview_id')
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('interview.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }

                    interviewsWithQuestionCategoryMemberDTOs = await Promise.all(rowPacket.map(async packet => {
                         const { interviewID, memberId, thumbnail, categoryName, likeCount, nickname } = packet;
                         const questionsQuery = await this.interviewAndQuestionRepository
                              .createQueryBuilder('iaq')
                              .select(['q.id as questionId','q.question_content as questionContent'])
                              .innerJoin(Question, 'q', 'iaq.question_id = q.id')
                              .where('iaq.interview_id = :interviewID', { interviewID }).getRawMany();
                         const questions = questionsQuery.map(({ questionId, questionContent }) => ({questionId, questionContent,}));
                         const interviewId = Number(interviewID);
                         return {interviewId, memberId, nickname, thumbnail, categoryName, likeCount, questions};
                    }));
               } else {
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository.createQueryBuilder('i')
                              .select([
                                   'i.id as interviewID',
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
                              .groupBy('i.id, i.member_id, m.thumbnail, i.category_name').setParameter('memberId', memberId)
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository.createQueryBuilder('i')
                              .select([
                                   'i.id as interviewID',
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
                              .groupBy('i.id, i.member_id, m.thumbnail, i.category_name').setParameter('memberId', memberId)
                              .orderBy('i.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }

                    interviewsWithQuestionCategoryMemberDTOs = await Promise.all(rowPacket.map(async packet => {
                         const { interviewID, memberId, thumbnail, categoryName, likeCount, nickname, bool } = packet;
                         const liked = Boolean(bool);
                         const questionsQuery = await this.interviewAndQuestionRepository
                              .createQueryBuilder('iaq')
                              .select(['q.id as questionId','q.question_content as questionContent'])
                              .innerJoin(Question, 'q', 'iaq.question_id = q.id')
                              .where('iaq.interview_id = :interviewID', { interviewID }).getRawMany();
                         const questions = questionsQuery.map(({ questionId, questionContent }) => ({questionId, questionContent,}));
                         const interviewId = Number(interviewID);
                         return {interviewId, liked, memberId, nickname, thumbnail, categoryName, likeCount, questions};
                    }));
               }             
      
               const result: ResponseInterviewsDTO = {
                    total: Number(countQuery.count),
                    result: interviewsWithQuestionCategoryMemberDTOs,
               };
               return result;
          } catch (error) {
              console.log('getInterviews ERROR interview.service 66\n' + error);
              throw new CustomError('메인 페이지 상단 디폴트 랜덤 인터뷰 정보 불러오기 실패', 500);
          }
     }

     /**
     * @note 상위카테고리로 분류한 9개의 랜덤 인터뷰를 가져온다.
     */
     async getInterviewsWithLikeMemberQuestion(page: number, memberId: string, categoryName: string, sort: string): Promise<ResponseInterviewsDTO> {
          let rowPacket;
          try {
               const countQuery = await this.interviewRepository
                    .createQueryBuilder('interview')
                    .select('COUNT(interview.id)', 'count')
                    .where('interview.categoryName = :categoryName', { categoryName: categoryName }).getRawOne();
               let interviewsWithQuestionCategoryMemberDTOs;

               if (memberId === undefined) {
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewID',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount',
                                   'interview.createdAt as createdAt'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .where('interview.categoryName = :categoryName', { categoryName: categoryName })
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewID',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount',
                                   'interview.createdAt as createdAt'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .where('interview.categoryName = :categoryName', { categoryName: categoryName })
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('interview.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }

                    interviewsWithQuestionCategoryMemberDTOs = await Promise.all(rowPacket.map(async packet => {
                         const { interviewID, memberId, thumbnail, categoryName, likeCount, nickname } = packet;
                         const questionsQuery = await this.interviewAndQuestionRepository
                              .createQueryBuilder('iaq')
                              .select(['q.id as questionId','q.question_content as questionContent',])
                              .innerJoin(Question, 'q', 'iaq.question_id = q.id')
                              .where('iaq.interview_id = :interviewID', { interviewID }).getRawMany();
                         const interviewId = Number(interviewID);
                         const questions = questionsQuery.map(({ questionId, questionContent }) => ({questionId, questionContent,}));
                         return {interviewId, memberId, nickname, thumbnail, categoryName, likeCount, questions};
                    }));
               } else {
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository.createQueryBuilder('i')
                              .select([
                                   'i.id as interviewID',
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
                              .groupBy('i.id, i.member_id, m.thumbnail, i.category_name').setParameters({ memberId: memberId, categoryName: categoryName})
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository.createQueryBuilder('i')
                              .select([
                                   'i.id as interviewID',
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
                              .groupBy('i.id, i.member_id, m.thumbnail, i.category_name').setParameters({ memberId: memberId, categoryName: categoryName})
                              .orderBy('i.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }
                    interviewsWithQuestionCategoryMemberDTOs = await Promise.all(rowPacket.map(async packet => {
                         const { interviewID, memberId, thumbnail, categoryName, likeCount, nickname, liked } = packet;
                         const questionsQuery = await this.interviewAndQuestionRepository
                              .createQueryBuilder('iaq')
                              .select(['q.id as questionId','q.question_content as questionContent',])
                              .innerJoin(Question, 'q', 'iaq.question_id = q.id')
                              .where('iaq.interview_id = :interviewID', { interviewID }).getRawMany();
                         const interviewId = Number(interviewID);
                         const questions = questionsQuery.map(({ questionId, questionContent }) => ({questionId, questionContent,}));
                         return {interviewId, liked, memberId, nickname, thumbnail, categoryName, likeCount, questions};
                    }));
               }

               const result: ResponseInterviewsDTO = {
                    total: Number(countQuery.count),
                    result: interviewsWithQuestionCategoryMemberDTOs,
               };
               return result;
          } catch(error) {
               console.log('getInterviewsWithLikeMemberQuestion ERROR interview.service 113\n' + error);
               throw new CustomError('메인 페이지 상단 상위 카테고리 랜덤 인터뷰 정보 불러오기 실패', 500);
          }
     }


     /**
      * @note 인터뷰 데이터 조호핮지만 인증없이 조회이기 때문에 gpt 에 대한 정보는 조회하지 않음
      */
     async interviewInfoData(interviewId: number): Promise<ResponseInterviewInfoDTO> {

         const questionInfos: ResponseQuestionInfo[] = [];
         const queryRunner: QueryRunner = this.dataSourse.createQueryRunner();

          await queryRunner.connect();
          await queryRunner.startTransaction();

          try{
               const data = await queryRunner.manager.createQueryBuilder()
                    .select(['m.thumbnail as profile, m.nickName as nickName, i.categoryName as categoryName, q.questionContent as questionContent, q.id as questionId'])
                    .from(Interview, 'i')
                    .innerJoin('i.member', 'm')
                    .innerJoin('i.interviewAndQuestions','iaq')
                    .innerJoin('iaq.question', 'q')
                    .where('i.id = :interviewId',{interviewId})
                    .getRawMany();
               
               await queryRunner.commitTransaction();

               if(!data.length) throw new CustomError('존재하지 않는 면접정보입니다.',400);

               data.forEach((result) => {
                    questionInfos.push({
                         questionId: +result.questionId,
                         questionContent: result.questionContent
                    })
               });

               const resultDTO: ResponseInterviewInfoDTO = {
                    memberThumnbail: data[0].profile,
                    memberNickName: data[0].nickName,
                    questionContents: questionInfos
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
}