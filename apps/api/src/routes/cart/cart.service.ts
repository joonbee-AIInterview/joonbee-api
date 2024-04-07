import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RowDataPacket } from 'mysql2';
import { Cart } from "@app/common/db/entity/cart.entity";
import { DataSource, QueryRunner, Repository } from "typeorm";
import { ResponseCartQuestionsDTO, ResponseCartQuestionsOfMemberData } from "./dto/response.dto";
import { Question } from "@app/common/db/entity/question.entity";
import { Category } from "@app/common/db/entity/category.entity";
import { Member } from "@app/common/db/entity/member.entity";
import { RequestInsertCartDTO } from "./dto/request.dto";
import { CustomError } from "@app/common/config/common";

@Injectable()
export class CartService {

     private PAGE_SIZE: number;

     constructor(
          private readonly dataSource: DataSource,
          @InjectRepository(Cart) 
          private readonly cartRepository: Repository<Cart>,
          @InjectRepository(Question)
          private readonly questionRepository: Repository<Question>,
          @InjectRepository(Category)
          private readonly categoryRepository: Repository<Category>,
          @InjectRepository(Member)
          private readonly memberRepository: Repository<Member>,
     ){
          this.PAGE_SIZE = 10;
     }

     /**
      * @note 사용자 장바구니에 있는 모든 질문들을 10개씩 가져온다.   
      */
     async getMemberCarts(page: number, memberId: string): Promise<ResponseCartQuestionsDTO> {
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const countQuery: RowDataPacket = await this.cartRepository.createQueryBuilder('cart')
                    .select('COUNT(cart.question_id)', 'count').where('cart.member_id = :member_id', { member_id: memberId })
                    .getRawOne();
                    
               const rowPacket: RowDataPacket[] = await this.cartRepository.createQueryBuilder('cart')
                    .select([
                         'cart.question_id AS questionId',
                         'c_upper.category_name as categoryName',
                         'cart.category_name AS subcategoryName',
                         'q.question_content AS questionContent'
                    ])
                    .innerJoin('question', 'q', 'cart.question_id = q.id')
                    .innerJoin('category', 'c', 'q.category_id=c.id')
                    .innerJoin('category', 'c_upper', 'c.category_upper_id = c_upper.id') // self Join
                    .where('cart.member_id = :memberId', { memberId })
                    .orderBy('cart.createdAt', 'DESC').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const cartQuestionsDTOs: ResponseCartQuestionsOfMemberData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.questionId),
                    category: packet.categoryName,
                    subcategory: packet.subcategoryName,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseCartQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: cartQuestionsDTOs
               }
               return result;
          } catch (error) {
               console.error('getMemberCarts ERROR cart.service 53\n' + error);
               throw new CustomError('getMemberCarts 서비스 로직 에러: ', 500);
          }
     }

     /**
      * @note 사용자 장바구니에 있는 모든 질문들을 상위 카테고리별로 10개씩 가져온다.
      */
     async getMemberCartsByCategory(page: number, memberId: string, categoryName: string): Promise<ResponseCartQuestionsDTO> {
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) throw new CustomError('존재하지 않는 상위 카테고리입니다. ', 400);
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const categoryId = await this.categoryRepository.createQueryBuilder('c')
                    .select('c.id').where('c.category_name = :categoryName', { categoryName })
                    .getOne();

               const subcategoryNameList = await this.categoryRepository.createQueryBuilder('c')
                    .select('c.category_name as subcategoryName')
                    .where('c.category_upper_id IN (:categoryId)', { categoryId: categoryId.id })
                    .getRawMany();

               const countQuery: RowDataPacket = await this.cartRepository.createQueryBuilder('cart')
                    .select('count(*)', 'count')
                    .where('cart.member_id = :memberId', { memberId })
                    .andWhere('cart.category_name IN (:...subcategoryNameList)', {
                         subcategoryNameList: subcategoryNameList.map((row) => row.subcategoryName),
                    })
                    .getRawOne();

               const rowPacket: RowDataPacket[] = await this.cartRepository.createQueryBuilder('cart')
                    .select([
                         'cart.question_id AS questionId',
                         'cart.category_name AS subcategoryName',
                         'q.question_content AS questionContent',
                    ])
                    .innerJoin('question', 'q', 'cart.question_id=q.id')
                    .where('cart.member_id = :memberId', { memberId })
                    .andWhere('cart.category_name IN (:...subcategoryNameList)', {
                         subcategoryNameList: subcategoryNameList.map((row) => row.subcategoryName),
                    })
                    .orderBy('cart.createdAt', 'DESC').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const cartQuestionsDTOs: ResponseCartQuestionsOfMemberData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.questionId),
                    category: categoryName,
                    subcategory: packet.subcategoryName,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseCartQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: cartQuestionsDTOs
               }
               return result;
          } catch (error) {
               console.error('getMemberCartsByCategory ERROR cart.service 100\n' + error);
               throw new CustomError('getMemberCartsByCategory 서비스 로직 에러: ', 500);
          }
     }

     /**
      * @note 사용자 장바구니에 있는 모든 질문들을 하위 카테고리별로 10개씩 가져온다.
      */
     async getMemberCartsBySubcategory(page: number, memberId: string, categoryName: string, subcategoryName: string): Promise<ResponseCartQuestionsDTO> {
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) throw new CustomError('존재하지 않는 상위 카테고리입니다. ', 400);

          const checkSubcategory = await this.categoryRepository.findOne({where: {categoryName: subcategoryName,},});
          if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) throw new CustomError('존재하지 않는 하위 카테고리입니다. ', 400);

          const checkCategory = await this.categoryRepository.findOne({where: {categoryName,}});
          if (checkCategory.id !== checkSubcategory.categoryUpperId) throw new CustomError('하위카테고리가 상위카테고리에 속하지 않습니다. ', 400);
          
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const countQuery: RowDataPacket = await this.cartRepository.createQueryBuilder('cart')
                    .select('COUNT(*)', 'count').where('cart.member_id = :memberId', { memberId }).andWhere('cart.category_name = :subcategoryName', { subcategoryName })
                    .getRawOne();

               const rowPacket: RowDataPacket[] = await this.cartRepository.createQueryBuilder('cart')
                    .select([
                        'cart.question_id AS questionId',
                        'cart.category_name AS subcategoryName',
                        'q.question_content AS questionContent'
                    ])
                    .innerJoin('question', 'q', 'cart.question_id = q.id')
                    .where('cart.member_id = :memberId', { memberId }).andWhere('cart.category_name = :subcategoryName', { subcategoryName })
                    .orderBy('cart.createdAt', 'DESC').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const cartQuestionsDTOs: ResponseCartQuestionsOfMemberData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.questionId),
                    category: categoryName,
                    subcategory: packet.subcategoryName,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseCartQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: cartQuestionsDTOs
               }
               return result;
          } catch (error) {
               console.error('getMemberCartsBySubcategory ERROR cart.service 137\n' + error);
               throw new CustomError('면접 전, 사용자의 장바구니 하위카테고리 필터 질문 데이터 전체 조회 실패', 500);
          }
     }

     /**
      * @note 사용자가 입력한 질문을 생성하고 저장 후, 장바구니에 생성과 저장한다.
      * @deprecated
      */
     async insertMemberQuestionIntoCart(memberId: string, categoryName: string, subcategoryName: string, questionContent: string): Promise<void> {
          const checkMember = await this.memberRepository.findOne({
               where: {
                    id: memberId,
               }
          });
          if (!checkMember) throw new CustomError('해당 사용자는 존재하지 않습니다. ', 400);

          const checkSubcategory = await this.categoryRepository.findOne({where: {categoryName: subcategoryName,},});
          if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) throw new CustomError('존재하지 않는 하위 카테고리입니다. ', 400);
          const checkCategory = await this.categoryRepository.findOne({where: {categoryName,}});
          if (checkCategory.id !== checkSubcategory.categoryUpperId) throw new CustomError('하위카테고리가 상위카테고리에 속하지 않습니다. ', 400);

          const duplicateCheck = await this.questionRepository.exist({
               where: {
                    questionContent,
               },
          });
          if (duplicateCheck) throw new CustomError('동일한 내용의 질문입니다. ', 400);
          try {
               const category = await this.categoryRepository.findOne({where: {categoryName: subcategoryName,},});
               const questionObj = this.questionRepository.create({
                    category: category,
                    gptFlag: 0,
                    questionLevel: category.categoryLevel,
                    writer: memberId,
                    questionContent: questionContent,
               });
               const question = await this.questionRepository.save(questionObj);
               this.createObjectAndSave(memberId, question.id, subcategoryName);
          } catch (error) {
               console.error('insertMemberQuestionIntoCart ERROR cart.service 146');
               throw new CustomError('insertMemberQuestionIntoCart 서비스 코드 에러: 사용자가 생성한 질문 장바구니 담기 실패', 500);
          }
     }

     /**
      * @note 면접 전에 사용자가 질문을 만들어서 자신의 장바구니와 question에 데이터를 저장하는구조이다.
      * 
      * @param
      *   : categoryName (메인카테고리)
      *   : subCategoryName (서브카테고리)
      *   : questionContent (질문내용)
      *   : memberId (질문에 FK )
      */
     async insertMemberQuestionIntoCartForInterview(dto: RequestInsertCartDTO, memberId: string){
          const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

          try{
               await queryRunner.connect();
               await queryRunner.startTransaction();

               const categoryEntity = await queryRunner.manager.createQueryBuilder()
                    .select("c")
                    .from(Category, "c")
                    .innerJoin("category", "c_upper", "c.category_upper_id = c_upper.id")
                    .where("c.category_name = :categoryName", { categoryName: dto.subcategoryName })
                    .getRawOne();
               console.log(categoryEntity);
               if(!categoryEntity) throw new CustomError('존재하는 않는 카테고리 ', 400); 
               
               const questionObj = await queryRunner.manager.create(Question, {
                    gptFlag: 0,
                    questionContent: dto.questionContent,
                    questionLevel: 1,
                    categoryId: categoryEntity.c_id,
                    writer: memberId
               });
               
               const questionEntity = await queryRunner.manager.save(Question, questionObj);

               const cartObj = await queryRunner.manager.create(Cart, {
                    questionId: questionEntity.id,
                    memberId,
                    categoryName: dto.subcategoryName
               });

               await queryRunner.manager.save(Cart, cartObj);
               await queryRunner.commitTransaction();
               
          }catch(error){
               await queryRunner.rollbackTransaction();
               console.error(error);
               if(error instanceof CustomError){
                    throw new CustomError(error.message,error.statusCode);
               }
               throw new CustomError('메인페이지에서 장바구니를 저장하다가 에러발생', 500);

          }finally{
               await queryRunner.release();
          }
     }

     /**
      * @note 데이터를 받아서 장바구니에 저장하고 동시에 question으로 저장하고, 해당 로직은 메인페이지에서 사용항는 장바구니기능을 위함
      *  메인 페이지에 있는 페이지들은 이미 존재하는 Question 이기 때문에 PK만 받으면 됨
      */
     async insertMemberQuestionIntoCartForMain(dto: RequestInsertCartDTO, memberId: string){
          const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

          try{
               await queryRunner.connect();
               await queryRunner.startTransaction();

               const existQuestion = await queryRunner.manager.exists(Question, { where: { id: dto.questionId}});
               if(!existQuestion) throw new CustomError('해당 id에 일치하는 질문이 없습니다.', 400);

               const cartExitData = await queryRunner.manager.exists(Cart, {
                    where : {
                         memberId: memberId,
                         questionId: dto.questionId
                    }
               });
               if(cartExitData) throw new CustomError('이미 장바구니에 존재합니다.', 400);

               const cartObj = await queryRunner.manager.create(Cart, {
                    questionId: dto.questionId,
                    memberId,
                    categoryName: dto.subcategoryName
               });

               await queryRunner.manager.save(Cart, cartObj);
               await queryRunner.commitTransaction();

          }catch(error){
               await queryRunner.rollbackTransaction();
               if(error instanceof CustomError){
                    throw new CustomError(error.message,error.statusCode);
               }else{
                    throw new CustomError('메인페이지에서 장바구니를 저장하다가 에러발생', 500);
               }

          }finally{
               await queryRunner.release();
          }
     }



     /**
      * @note 메인페이지에 있던 질문을 클릭하면 사용자 장바구니에 저장이 된다.
      */
     async insertMemberQuestionWithQuestionIdIntoCart(memberId: string, questionId: number, categoryName: string, subcategoryName: string, questionContent: string): Promise<void> {
          const checkMember = await this.memberRepository.findOne({
               where: {
                    id: memberId,
               }
          });
          if (!checkMember) throw new CustomError('해당 사용자는 존재하지 않습니다. ', 400);

          if (typeof questionId !== 'number' || questionId <= 0 || typeof questionId === 'string') throw new CustomError('형식을 지키지 않은 questionId입니다. ', 400);
          const existQuestion = await this.questionRepository.createQueryBuilder('q')
               .select('q.id').where('q.id = :questionId', { questionId })
               .getRawOne();
          if (!existQuestion) throw new CustomError('해당 질문은 생성되지 않은 질문입니다. ', 400);

          const existQuestionInMemberCart = await this.cartRepository.createQueryBuilder('c')
               .where('c.member_id = :memberId', { memberId }).andWhere('c.question_id = :questionId', { questionId })
               .getRawOne();
          if (existQuestionInMemberCart) throw new CustomError('사용자의 장바구니에 이미 존재하는 질문입니다. ', 400);

          const checkSubcategory = await this.categoryRepository.findOne({where: {categoryName: subcategoryName,},});
          if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) throw new CustomError('존재하지 않는 하위카테고리입니다. ', 400);
          const checkCategory = await this.categoryRepository.findOne({where: {categoryName,}});
          if (checkCategory.id !== checkSubcategory.categoryUpperId) throw new CustomError('하위카테고리가 상위카테고리에 속하지 않습니다. ', 400);

          const checkCategoryAndContentOfQuestion = await this.questionRepository.createQueryBuilder('q')
               .select(['c.category_name AS questionSubcategory', 'q.question_content AS questionContent'])
               .innerJoin('category', 'c', 'q.category_id=c.id')
               .where('q.id = :questionId', { questionId })
               .getRawOne();

          if (checkCategoryAndContentOfQuestion.questionSubcategory !== subcategoryName ||
               checkCategoryAndContentOfQuestion.questionContent !== questionContent) throw new CustomError('입력된 하위카테고리 또는 내용이 질문의 하위카테고리 또는 내용과 일치하지 않습니다. ', 400);
          
          try {
               this.createObjectAndSave(memberId, questionId, subcategoryName);
          } catch (error) {
               console.error('insertMemberQuestionWithQuestionIdIntoCart ERROR cart.service 146');
               throw new CustomError('insertMemberQuestionWithQuestionIdIntoCart 서비스 코드 에러: 기존에 있는 질문 장바구니 담기 실패', 500);
          }
     }


     /**
      * 객체를 생성하고 데이터베이스에 저장하는 코드
      * 
      * @param memberId 
      * @param questionId 
      * @param subcategoryName 
      * @author 송재근
      */
     async createObjectAndSave(memberId: string, questionId: number, subcategoryName: string): Promise<void> {
          const cartObj = this.cartRepository.create({
               memberId: memberId,
               questionId: questionId,
               categoryName: subcategoryName,
          });
          await this.cartRepository.save(cartObj);
     }

     /**
      * 상위카테고리의 유효성을 체크하는 코드
      * 
      * @param categoryName
      * @author 송재근
      */
     validationCheckCategory(categoryName: string) {
          if (categoryName === "") 
               throw new CustomError('상위카테고리가 비었습니다. ', 400);
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) 
               throw new CustomError('상위카테고리가 아닙니다. ', 400);
     }

     // /**
     //  * 하위카테고리의 유효성을 체크하는 코드
     //  * 
     //  * @param categoryName 
     //  * @param subcategoryName 
     //  * @author 송재근
     //  */
     // async validationCheckSubcategory(categoryName: string, subcategoryName: string): Promise<void> {
     //      if (subcategoryName === "") 
     //           throw new CustomError('하위카테고리가 비었습니다. ', 400);
     //      const checkSubcategory = await this.categoryRepository.findOne({where: {categoryName: subcategoryName,},});
     //      if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) 
     //           throw new CustomError('존재하지 않는 하위카테고리입니다. ', 400);
     //      const checkCategory = await this.categoryRepository.findOne({where: {categoryName,}});
     //      if (checkCategory.id !== checkSubcategory.categoryUpperId) 
     //           throw new CustomError('하위카테고리가 상위카테고리에 속하지 않습니다. ', 400);
     // }
}