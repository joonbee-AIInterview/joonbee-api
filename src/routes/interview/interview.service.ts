import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomError } from "src/common/config/common";
import { Interview } from "src/entity/interview.entity";
import { Repository } from "typeorm";
import { ResponseInterviewsDTO } from "./dto/response.dto";
import { Member } from 'src/entity/member.entity';
import { Like } from 'src/entity/like.entity';
import { InterviewAndQuestion } from 'src/entity/and.question.entity';
import { Question } from 'src/entity/question.entity';

@Injectable()
export class InterviewService {

     private PAGE_SIZE: number;

     constructor(
          @InjectRepository(Interview)
          private readonly interviewRepository: Repository<Interview>,
          @InjectRepository(InterviewAndQuestion)
          private readonly interviewAndQuestionRepository: Repository<InterviewAndQuestion>,
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
               
               if (memberId === undefined) {
               // 로그인 X
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('interview.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }
               } else {
               // 로그인 O
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount', 
                                   'CASE WHEN EXISTS (SELECT 1 FROM `like` ll WHERE ll.interview_id = interview.id and ll.member_id = :memberId) then "Y" ELSE "N" END as bool'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name').setParameter('memberId', memberId)
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount', 
                                   'CASE WHEN EXISTS (SELECT 1 FROM `like` ll WHERE ll.interview_id = interview.id and ll.member_id = :memberId) then "Y" ELSE "N" END as bool'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name').setParameter('memberId', memberId)
                              .orderBy('interview.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }
               }             
      
               const interviewsWithQuestionCategoryMemberDTOs = await Promise.all(rowPacket.map(async packet => {
                    const { interviewId, memberId, thumbnail, categoryName, likeCount, nickname, bool } = packet;
                    const questionsQuery = await this.interviewAndQuestionRepository
                         .createQueryBuilder('iaq')
                         .select(['q.id as questionId','q.question_content as questionContent',])
                         .innerJoin(Question, 'q', 'iaq.question_id = q.id')
                         .where('iaq.interview_id = :interviewId', { interviewId }).getRawMany();
                    const questions = questionsQuery.map(({ questionId, questionContent }) => ({questionId, questionContent,}));
                    return {interviewId, bool, memberId, nickname, thumbnail, categoryName, likeCount, questions};
               }));
      
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
               
               if (memberId === undefined) {
               // 로그인 X
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .where('interview.categoryName = :categoryName', { categoryName: categoryName })
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .where('interview.categoryName = :categoryName', { categoryName: categoryName })
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name')
                              .orderBy('interview.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }
               } else {
               // 로그인 O
                    if (sort === 'like') {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount',
                                   'CASE WHEN EXISTS (SELECT 1 FROM `like` ll WHERE ll.interview_id = interview.id and ll.member_id = :memberId) then "Y" ELSE "N" END as bool'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .where('interview.categoryName = :categoryName', { categoryName: categoryName })
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name').setParameter('memberId', memberId)
                              .orderBy('likeCount', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    } else {
                         rowPacket = await this.interviewRepository
                              .createQueryBuilder('interview')
                              .select(['interview.id as interviewId',
                                   'interview.member_id as memberId',
                                   'm.thumbnail as thumbnail', 
                                   'm.nick_name as nickname', 
                                   'interview.category_name as categoryName',
                                   'COUNT(l.member_id) as likeCount',
                                   'CASE WHEN EXISTS (SELECT 1 FROM `like` ll WHERE ll.interview_id = interview.id and ll.member_id = :memberId) then "Y" ELSE "N" END as bool'])
                              .innerJoin(Member, 'm', 'interview.member_id = m.id')
                              .leftJoin(Like, 'l', 'interview.id = l.interview_id')
                              .where('interview.categoryName = :categoryName', { categoryName: categoryName })
                              .groupBy('interview.id, interview.member_id, m.thumbnail, interview.category_name').setParameter('memberId', memberId)
                              .orderBy('interview.createdAt', 'DESC').offset((page - 1) * this.PAGE_SIZE).limit(this.PAGE_SIZE).getRawMany();
                    }
               }

               const interviewsWithQuestionCategoryMemberDTOs = await Promise.all(rowPacket.map(async packet => {
                    const { interviewId, memberId, thumbnail, categoryName, likeCount, nickname, bool } = packet;
                    const questionsQuery = await this.interviewAndQuestionRepository
                         .createQueryBuilder('iaq')
                         .select(['q.id as questionId','q.question_content as questionContent',])
                         .innerJoin(Question, 'q', 'iaq.question_id = q.id')
                         .where('iaq.interview_id = :interviewId', { interviewId }).getRawMany();
                    const questions = questionsQuery.map(({ questionId, questionContent }) => ({questionId, questionContent,}));
                    return {interviewId, bool, memberId, nickname, thumbnail, categoryName, likeCount, questions};
               }));
               
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
}