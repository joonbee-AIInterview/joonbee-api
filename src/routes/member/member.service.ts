import { RedisService } from './../../common/config/redis.config';
import { RowDataPacket } from 'mysql2';
import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomError, PageResponseDTO } from 'src/common/config/common';
import { Category } from 'src/entity/category.entity';
import { Like } from 'src/entity/like.entity';
import { Member } from 'src/entity/member.entity';
import { Repository } from 'typeorm';
import { RequestInterviewSaveDTO } from './dto/request.dto';
import { Interview } from 'src/entity/interview.entity';
import { InterviewAndQuestion } from 'src/entity/and.question.entity';
import { plainToClass } from 'class-transformer';
import { ResponseCartDTO, ResponseCategoryInfoDTO, ResponseInterviewCategoryDTO, ResponseInterviewCategoryData, ResponseInterviewDetail, ResponseMyInfoDTO, ResponseProfileDTO, ResponseQuestionInfo } from './dto/response.dto';
import { Cart } from 'src/entity/cart.entity';

@Injectable()
export class MemberService {
    private PAGE_SIZE: number;

    constructor(
        @InjectRepository(Member)
        private readonly memberRepository: Repository<Member>,
        @InjectRepository(Like)
        private readonly likeRepository: Repository<Like>,
        @InjectRepository(Interview)
        private readonly interviewRepository: Repository<Interview>,
        @InjectRepository(InterviewAndQuestion)
        private readonly andQuestionRepository: Repository<InterviewAndQuestion>,
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
        @InjectRepository(Cart)
        private readonly cartRepository: Repository<Cart>,
        private readonly redisService: RedisService
    ){
        this.PAGE_SIZE = 6;
    }

    /**
     * @note 면접에 좋아요를 누르면 insert 되는 코드
     */
    async insertLike(memberId: string, interviewId: number): Promise<void>{
        try{
            const existsLike = await this.likeRepository.createQueryBuilder('l')
                                    .where('l.memberId = :memberId',{memberId})
                                    .andWhere('l.interviewId = :interviewId',{interviewId})
                                    .getOne();

            if(existsLike){
                await this.likeRepository.createQueryBuilder('l')
                                    .delete()
                                    .where('memberId = :memberId', {memberId})
                                    .andWhere('interviewId = :interviewId',{interviewId})
                                    .execute();
                return;
            }

            const likeObj = this.likeRepository.create({
                memberId: memberId,
                interviewId: interviewId
            });
            
            const likeEntity = await this.likeRepository.save(likeObj);
            const interviewEntityId: number = likeEntity.interviewId;

            const interviewEntityForMemberId: RowDataPacket = await this.interviewRepository
                                .createQueryBuilder('i')
                                .select('i.memberId','memberId')
                                .where('i.id = :id', { id : interviewId })
                                .getRawOne() as RowDataPacket;

            const publishWithMemberId = interviewEntityForMemberId.memberId;
            await this.redisService.publish(publishWithMemberId);

        }catch(error){
            console.log('insertLIKE ERROR member.service 27 \n'+ error);
            throw new CustomError('좋아요 실패',500);
        }
    }

    /**
     * @note interview 엔티티를 먼저 저장하고, interview_and_question 데이터를 저장한다.
     */
    async insertInterview(memberId: string, questionInfo: RequestInterviewSaveDTO): Promise<void>{
        try{
            const interviewObject = this.interviewRepository.create({
                 memberId,
                 categoryName : questionInfo.categoryName,
                 gptOpinion: questionInfo.gptOpinion
            });
            const interviewEntity: Interview = await this.interviewRepository.save(interviewObject);

            const entityArr: InterviewAndQuestion[] = [];
            questionInfo.questions.forEach(el => {
                const entity = this.andQuestionRepository.create({
                    questionId : el.questionId,
                    answerContent: el.answerContent,
                    interviewId: interviewEntity.id
                });

                entityArr.push(entity);
            });

            await this.andQuestionRepository.save(entityArr);

        }catch(error){
            console.log('insertInterview ERROR member.serivce 40 \n' + error);
            throw new CustomError('면접 저장 실패',500);
        }
    }

     /**
     * @note member - interview - interview_and_question
     */
    async myInfoData(memberId: string): Promise<ResponseMyInfoDTO>{
       try{
            let questionCount = 0;

            const result: RowDataPacket = await this.memberRepository
                .createQueryBuilder('m')
                .select(['m.id','m.thumbnail', 'm.nickName'])
                .addSelect('COUNT(i.id)', 'interviewCount')
                .leftJoin('m.interviews', 'i')
                .where('m.id = :id', { id : memberId })
                .groupBy('m.id')
                .getRawOne();

            const rowPacket: RowDataPacket[] = await this.interviewRepository.createQueryBuilder('i')
                .select('c.category_name', 'categoryName')
                .addSelect('COUNT(*)','questionCount')
                .innerJoin('i.interviewAndQuestions','iaq')
                .innerJoin('iaq.question','q')
                .innerJoin('q.category','c','c.category_level = 1')
                .where('i.member_id = :memberId',{memberId})
                .groupBy('c.category_name')
                .orderBy('questionCount','DESC')
                .getRawMany();
            
            const categoryInfoDTOs: ResponseCategoryInfoDTO[] = rowPacket.map(packet => {
                questionCount += Number(packet.questionCount);                
                return ({
                    categoryName: packet.categoryName,
                    categoryCount: +packet.questionCount,
                })
            });

            const dto: ResponseMyInfoDTO = {
                id: result.m_id,
                thumbnail: result.m_thumbnail,
                nickName: result.m_nick_name,
                interviewCount: result.interviewCount,
                questionCount: questionCount,
                categoryInfo: categoryInfoDTOs
            };
            
            return dto;

       }catch(error){
            console.log('insertInterview ERROR member.serivce 121\n' + error);
            throw new CustomError('사용자 정보 불러오기 실패',500);
       }
    }
    /**
     * @note 마이 페이지에서 내 면접 보기를 통해 내가 진행한 카테고리들에 대한 정보목록조회
     */
    async myCategoryInfoService(memberId: string, page: number): Promise<ResponseInterviewCategoryDTO>{
        try{
            const skipNumber = (page - 1) * this.PAGE_SIZE;

            const countQuery = await this.interviewRepository.count();
    
            const rowPacket: RowDataPacket[] = await this.interviewRepository
                .createQueryBuilder('interview')
                .select(['COUNT(*) AS questionCount', 'interview.categoryName AS categoryName', 'interview.id AS interviewId'])
                .innerJoin('interview.interviewAndQuestions','iaq')
                .where('interview.member_id = :memberId',{ memberId })
                .groupBy('interview.id')
                .offset(skipNumber)
                .limit(this.PAGE_SIZE)
                .getRawMany();
    
            const categoryInfoDTOs: ResponseInterviewCategoryData[] = rowPacket.map(packet => ({
                categoryName: packet.categoryName,
                questionCount: +packet.questionCount,
                interviewId: +packet.interviewId,
    
            }));
    
            const result: ResponseInterviewCategoryDTO = {
                total: +countQuery,
                result: categoryInfoDTOs
            }
    
            return result;
        }catch(error){
            console.log('insertInterview ERROR member.serivce 158\n' + error);
            throw new CustomError('사용자 면접 정보 불러오기 실패',500);
        }
    }
    /**
     * @note 마이 페이지에서 내 추천 면접보기를 통해 추천누른 면접 목록 조회
    */
    async myCategoryLikeInfoService(memberId: string, page: number): Promise<ResponseInterviewCategoryDTO>{
        try{
            const skipNumber = (page - 1) * this.PAGE_SIZE;

            const countQuery:RowDataPacket = await this.likeRepository
                .createQueryBuilder('like')
                .select('COUNT(like.interview_id)','count')
                .getRawOne();
            
            const subQuery = this.likeRepository.createQueryBuilder('like')
            .select('like.interviewId')
            .where('like.memberId = :memberId', { memberId });
            
            const rowPacket: RowDataPacket[] = await this.interviewRepository
                .createQueryBuilder('interview')
                .select(['COUNT(*) AS questionCount', 'interview.categoryName AS categoryName', 'interview.id AS interviewId'])
                .innerJoin('interview.interviewAndQuestions', 'iaq')
                .where(`interview.id IN (${subQuery.getQuery()})`)
                .setParameters(subQuery.getParameters())
                .groupBy('interview.id')
                .offset(skipNumber)
                .limit(this.PAGE_SIZE)
                .getRawMany();
    
            const categoryInfoDTOs: ResponseInterviewCategoryData[] = rowPacket.map(packet => ({
                categoryName: packet.categoryName,
                questionCount: +packet.questionCount,
                interviewId: +packet.interviewId
            }));
    
            const result: ResponseInterviewCategoryDTO = {
                total: Number(countQuery.count),
                result: categoryInfoDTOs
            }
    
            return result;
        }catch(error){
            console.log('insertInterview ERROR member.serivce 158\n' + error);
            throw new CustomError('사용자 면접 정보 불러오기 실패',500);
        }
    }

    /**
     * @note 장바구니에 추가하는 서비스 로직
    */
   async insertCartService(memberId: string, questionId: number, categoryName: string): Promise<void>{
        try{
            const cartObj = this.cartRepository.create({
                memberId,
                questionId,
                categoryName
            });
            
            this.cartRepository.save(cartObj);
        }catch(error){
            console.log('insertInterview ERROR member.serivce 222\n' + error);
            throw new CustomError('사용자 장바구니 저장실패',500);
        }
   }

   /**
    * @note 장바구니 데이터 조회
    */
   async myCartReadService(memberId: string, page: number): Promise<PageResponseDTO<ResponseCartDTO[]>>{
        try{
            const skipNumber = (page - 1) * this.PAGE_SIZE;
            const countQuery = await this.cartRepository.count();

            const cart: RowDataPacket[] = await this.cartRepository
                .createQueryBuilder('cart')
                .select(['q.questionContent AS questionContent','q.id AS questionId'])
                .innerJoin('cart.question','q')
                .where('cart.memberId = :memberId',{ memberId })
                .offset(skipNumber)
                .limit(this.PAGE_SIZE)
                .getRawMany();

            
            const data: ResponseCartDTO[] = cart.map((packet) => ({
                questionId: +packet.questionId,
                questionContent: packet.questionContent
            }));

            const result: PageResponseDTO<ResponseCartDTO[]> = {
                total : countQuery,
                data
            }
            
            return result;

        }catch(error){
            console.log('insertInterview ERROR member.serivce 241\n' + error);
            throw new CustomError('사용자 장바구니 조회실패',500);
        }
   }

   /**
    * @note 장바구니 데이터 삭제
    */
   async deleteCartService(memberId: string, questionId: number): Promise<boolean>{
        const data = await this.cartRepository.findOne({
            where: {
                memberId,
                questionId
            }
        });

        if (data) {
            await this.cartRepository.remove(data);
            return true;
        }
        return false;
   }

   /**
    * @note id 값을 가지고 썸네일이랑 닉네임을 조회
    */
   async findByIdForImageAndNick(id: string): Promise<ResponseProfileDTO>{
        
       try{
            const memberData: RowDataPacket = await this.memberRepository
                .createQueryBuilder('m')
                .select(['m.thumbnail AS image','m.nick_name AS nickName'])
                .where('m.id = :id',{ id })
                .getRawOne();

            return {
                image: memberData.image,
                nickName: memberData.nickName
            };

       }catch(error){
            console.error(error);
            throw new CustomError('사용자 프로필 조회 실패', 500);
       }
   }

   /**
    * @note 마이페이지에서 자신의 면접 정보 조회
    */
   async findByForMyInterviewData(interviewId: number): Promise<ResponseInterviewDetail>{
        try{
            const questionInfos: ResponseQuestionInfo[] = [];
           
            const data: RowDataPacket[] = await this.interviewRepository
                .createQueryBuilder('i')
                .select(['i.gpt_opinion AS gptOpinion'])
                .addSelect("q.question_content", "questionContent")
                .addSelect("q.id","id")
                .innerJoin('i.interviewAndQuestions','iaq')
                .innerJoin('iaq.question','q')
                .where('i.id = :interviewId', {interviewId})
                .getRawMany();

            data.forEach((result) => {
                questionInfos.push({
                    questionId : +result.id,
                    questionContent : result.questionContent
                });
            })

            const resultDTO: ResponseInterviewDetail = {
                gptOpinion : data[0].gptOpinion,
                questionContents : questionInfos
            };
            return resultDTO;
            
        }catch(error){
            console.error(error);
            throw new CustomError('사용자 면접정보 자세히 보기 실패',500);
        }
   }
}
