import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RowDataPacket } from 'mysql2';
import { CustomError } from "src/common/config/common";
import { Cart } from "src/entity/cart.entity";
import { Repository } from "typeorm";
import { ResponseCartQuestionsDTO, ResponseCartQuestionsOfMemberData } from "./dto/response.dto";
import { Question } from "src/entity/question.entity";
import { Category } from "src/entity/category.entity";

@Injectable()
export class CartService {

     private PAGE_SIZE: number;

     constructor(
          @InjectRepository(Cart) 
          private readonly cartRepository: Repository<Cart>,
          @InjectRepository(Question)
          private readonly questionRepository: Repository<Question>,
          @InjectRepository(Category)
          private readonly categoryRepository: Repository<Category>,
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
      */
     async insertMemberQuestionIntoCart(memberId: string, categoryName: string, subcategoryName: string, questionContent: string): Promise<void> {
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) throw new CustomError('상위카테고리가 아닙니다. ', 400);

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
               const cartObj = this.cartRepository.create({
                    memberId,
                    questionId: question.id,
                    categoryName: subcategoryName,
               });
               await this.cartRepository.save(cartObj);
          } catch (error) {
               console.error('insertMemberQuestionIntoCart ERROR cart.service 146');
               throw new CustomError('insertMemberQuestionIntoCart 서비스 코드 에러: 사용자가 생성한 질문 장바구니 담기 실패', 500);
          }
     }

     /**
      * @note 메인페이지에 있던 질문을 클릭하면 사용자 장바구니에 저장이 된다.
      */
     async insertMemberQuestionWithQuestionIdIntoCart(memberId: string, questionId: number, subcategoryName: string): Promise<void> {
          const existQuestionInCart = await this.cartRepository.createQueryBuilder('c')
               .where('c.member_id = :memberId', { memberId }).andWhere('c.question_id = :questionId', { questionId })
               .getRawOne();
          if (existQuestionInCart) throw new CustomError('장바구니에 이미 존재하는 질문입니다. ', 400);
          const checkCategoryOfQuestion = await this.questionRepository.createQueryBuilder('q')
               .select('c.category_name as questionSubcategory')
               .innerJoin('category', 'c', 'q.category_id=c.id')
               .where('q.id = :questionId', { questionId }).getRawOne();
          if (checkCategoryOfQuestion.questionSubcategory !== subcategoryName) throw new CustomError('질문아이디와 카테고리가 일치하지 않습니다. ', 400);

          try {
               const cartObj = this.cartRepository.create({
                    memberId,
                    questionId,
                    categoryName: subcategoryName,
               });
               await this.cartRepository.save(cartObj);
          } catch (error) {
               console.error('insertMemberQuestionWithQuestionIdIntoCart ERROR cart.service 146');
               throw new CustomError('insertMemberQuestionWithQuestionIdIntoCart 서비스 코드 에러: 기존에 있는 질문 장바구니 담기 실패', 500);
          }
     }
}