import { RedisService } from '../../common/config/redis.config';
import { RowDataPacket } from 'mysql2';
import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '@app/common/db/entity/category.entity';
import { Like } from '@app/common/db/entity/like.entity';
import { Member } from '@app/common/db/entity/member.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { RequestInterviewSaveDTO } from './dto/request.dto';
import { Interview } from '@app/common/db/entity/interview.entity';
import { InterviewAndQuestion } from '@app/common/db/entity/and.question.entity';
import { plainToClass } from 'class-transformer';
import { ResponseCartDTO, ResponseCategoryInfoDTO, ResponseInterAndQuestionInfo, ResponseInterviewCategoryDTO, ResponseInterviewCategoryData, ResponseInterviewDetail, ResponseMyInfoDTO, ResponseProfileDTO, ResponseQuestionInfo } from './dto/response.dto';
import { Cart } from '@app/common/db/entity/cart.entity';
import { CustomError, PageResponseDTO } from '@app/common/config/common';

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
        private readonly redisService: RedisService,
        private readonly dataSource: DataSource
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
                                .addSelect('i.categoryName','categoryName')
                                .where('i.id = :id', { id : interviewId })
                                .getRawOne() as RowDataPacket;

            const memberIdforPublish = interviewEntityForMemberId.memberId;
            const dataForPublish: LikeDataForPublish = {
                interviewId: interviewId,
                memberId: memberIdforPublish,
                categoryName: interviewEntityForMemberId.categoryName
            }
           // await this.redisService.publish(dataForPublish);

        }catch(error){
            console.log('insertLIKE ERROR member.service 27 \n'+ error);
            throw new CustomError('좋아요 실패',500);
        }
    }

    /**
     * @note interview 엔티티를 먼저 저장하고, interview_and_question 데이터를 저장한다.
     * @deprecated
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
    /*
    *  @note - interview 저장하는거 트랜잭션 묶은 버전
    */
    async insertInsertVer2(memberId: string, questionInfo: RequestInterviewSaveDTO): Promise<void>{
        const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
        
        try{

            await queryRunner.connect();
            await queryRunner.startTransaction();

            const interview = queryRunner.manager.create(Interview, {
                memberId: memberId,
                categoryName: questionInfo.categoryName,
                gptOpinion: questionInfo.gptOpinion,
            });

            const interviewEntity = await queryRunner.manager.save(interview);

            const interviewAndQuestions = questionInfo.questions.map((data) => (
                queryRunner.manager.create(InterviewAndQuestion, {
                    interviewId: interviewEntity.id,
                    questionId: data.questionId,
                    answerContent: data.answerContent,
                    commentary: data.commentary,
                    evaluation: data.evaluation
                })
            ));

            await queryRunner.manager.save(interviewAndQuestions);
            await queryRunner.commitTransaction();

        }catch(error){
            await queryRunner.rollbackTransaction();
            console.error(error);
            throw new CustomError('면접 데이터 생성 중 에러 발생',500);
        } finally {
            await queryRunner.release();
        }
    }

     /**
     * @note member - interview - interview_and_question
     */
    async myInfoData(memberId: string): Promise<ResponseMyInfoDTO>{
       try{
            let questionCount:number = 0;

            const result: RowDataPacket = await this.memberRepository
                .createQueryBuilder('m')
                .select(['m.id','m.thumbnail', 'm.nickName, m.email'])
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
            let email = result.email ? result.email : null;
            console.log(result);
            const dto: ResponseMyInfoDTO = {
                id: result.m_id,
                thumbnail: result.m_thumbnail,
                nickName: result.nick_name,
                email: email,
                interviewCount: Number(result.interviewCount),
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

            const countQuery = await this.interviewRepository.count({
                where: {
                    memberId 
                }
            });
    
            const rowPacket: RowDataPacket[] = await this.interviewRepository
                .createQueryBuilder('interview')
                .select(['COUNT(*) AS questionCount', 'interview.categoryName AS categoryName', 'interview.id AS interviewId','interview.createdAt'])
                .innerJoin('interview.interviewAndQuestions','iaq')
                .where('interview.member_id = :memberId',{ memberId })
                .groupBy('interview.id')
                .orderBy('interview.createdAt',"DESC")
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
            const cartExist = await this.cartRepository.findOne({ // 복합 인덱스라 상관업승ㅁ
                where: {
                    memberId,
                    questionId
                }
            });

            if(cartExist){
                throw new CustomError("장바구니 데이터가 존재합니다.",400);
            }

            const cartObj = this.cartRepository.create({
                memberId,
                questionId,
                categoryName
            });
            
            this.cartRepository.save(cartObj);

        }catch(error){
            console.log('insertInterview ERROR member.serivce 222\n' + error);
            if(error instanceof CustomError){
                throw new CustomError(error.message, error.statusCode);
            }
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
   async findByForMyInterviewData(interviewId: number, memberId: string): Promise<ResponseInterviewDetail>{
        try{
            const questionInfos: ResponseQuestionInfo[] = [];
           
            const data: RowDataPacket[] = await this.interviewRepository
                .createQueryBuilder('i')
                .select([
                    'i.gpt_opinion AS gptOpinion', 
                    'i.member_id AS memberId',
                    'i.created_at AS createdAt'
                ])
                .addSelect("q.question_content", "questionContent")
                .addSelect("q.id","id")
                .addSelect("iaq.commentary", "commentary")
                .addSelect("iaq.evaluation" , "evaluation")
                .addSelect("iaq.answer_content", "answerContent")
                .innerJoin('i.interviewAndQuestions','iaq')
                .innerJoin('iaq.question','q')
                .where('i.id = :interviewId', {interviewId})
                .andWhere('i.memberId = :memberId', {memberId})
                .getRawMany();
            
            if(!data.length) throw new CustomError('존재하지 않는 면접정보입니다.',400);
            
            data.forEach((result) => {
                questionInfos.push({
                    questionId : +result.id,
                    questionContent : result.questionContent,
                    commentary: result.commentary,
                    evaluation: result.evaluation,
                    answerContent: result.answerContent
                });
            })

            const resultDTO: ResponseInterviewDetail = {
                gptOpinion : data[0].gptOpinion,
                createdAt: this.formatTimestamp(data[0].createdAt),
                questionContents : questionInfos
            };

            return resultDTO;
            
        }catch(error){
            console.error(error);
            if(error instanceof CustomError){
                throw new CustomError(error.message, error.statusCode);
            }
            throw new CustomError('사용자 면접정보 자세히 보기 실패',500);
        }
   }

   /**
    * @note 면접 정보 삭제 기능
    */
   async deleteByInterview(interviewId: number, memberId: string): Promise<boolean>{
        const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

        try{
            await queryRunner.connect();
            await queryRunner.startTransaction();
    
            const questionList: InterviewAndQuestion[] = await queryRunner.manager.find(InterviewAndQuestion, {
                where: { interviewId }
            });
    
    
            for (const interviewAndQuestion of questionList) {
                await queryRunner.manager.remove(InterviewAndQuestion, interviewAndQuestion);
            }
    
            const interviewEntity: Interview = await queryRunner.manager.findOne(Interview, {
                where: { memberId, id: interviewId }
            });
          
            if (interviewEntity) {
                await queryRunner.manager.remove(Interview, interviewEntity);
                await queryRunner.commitTransaction();
                return true;
            } else {
                await queryRunner.rollbackTransaction();
                return false;
            }
        }catch(error){
            await queryRunner.rollbackTransaction();
            console.error(error);
            throw new CustomError('인터뷰 삭제 중 에러', 500);
        }finally{
            await queryRunner.release();
        }
   }

   /**
    * @note 사용자 장바구니 데이터 삭제 기능
    * @deprecated
    */
   async deleteByCartOne(questionId: number, memberId: string): Promise<boolean> {
        const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        const cartData = await queryRunner.manager.findOne(Cart,{
            where: {
                questionId,
                memberId
            }
        });

        if(cartData){
            await queryRunner.manager.remove(Cart, cartData);
            await queryRunner.commitTransaction();
            return true;
        }else {
            await queryRunner.rollbackTransaction();
            return false;
        }
   }

   /**
    * @note - 면접 데이터에 존재하는 문제들에 대한 정보 자세히보기
    */
   async interviewQuestionDetail(interviewId: number, questionId: number,memberId: string): Promise<ResponseInterAndQuestionInfo>{

        try{
            const entitiyData: RowDataPacket = await this.andQuestionRepository.createQueryBuilder('iaq')
                        .select(['iaq.*','question.questionContent as questionContent'])
                        .innerJoin('iaq.interview', 'interview')
                        .innerJoin('iaq.question','question')
                        .where('iaq.interviewId = :interviewId',{interviewId})
                        .andWhere('iaq.questionId = :questionId',{questionId})
                        .andWhere('interview.member_id = :memberId',{memberId})
                        .getRawOne();

            console.log(entitiyData);

            if(!entitiyData) throw new CustomError('존재하지 않는 데이터입니다.',400);

            const response: ResponseInterAndQuestionInfo = {
                interviewId: entitiyData.interview_id,
                questionId: entitiyData.question_id,
                answerContent: entitiyData.answer_content,
                commentary: entitiyData.commentary,
                evaluation: entitiyData.evaluation,
                questionContent: entitiyData.questionContent
            }

            return response;

        }catch(error){
            console.error(error);
            if(error instanceof CustomError){
                throw new CustomError(error.message, error.statusCode);
            }
            throw new CustomError('면접 문제에 대한 정보 읽기 에러',500);
        }
   }

    formatTimestamp(timestamp: string) {
        const date = new Date(timestamp);

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${year}.${month}.${day} ${hours}:${minutes}`;

   }
}
