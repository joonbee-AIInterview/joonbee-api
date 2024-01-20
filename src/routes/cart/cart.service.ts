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
                         'cart.question_id',
                         'c.category_name AS category_name',
                         'cart.category_name AS subcategory_name',
                         'q.question_content'
                    ])
                    .innerJoin('question', 'q', 'cart.question_id = q.id')
                    .innerJoin('category', 'c', 'c.id = (SELECT category_upper_id FROM category WHERE category_name = cart.category_name)')
                    .where('cart.member_id = :member_id', { member_id: memberId })
                    .orderBy('q.createdAt', 'DESC').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const cartQuestionsDTOs: ResponseCartQuestionsOfMemberData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.question_id),
                    category: packet.category_name,
                    subcategory: packet.subcategory_name,
                    questionContent: packet.question_content,
               }));
               const result: ResponseCartQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: cartQuestionsDTOs
               }
               return result;
          } catch (error) {
               console.log('getMemberCarts ERROR cart.service 53\n' + error);
               throw new CustomError('getMemberCarts 서비스 로직 에러: ', 500);
          }
     }

     /**
      * @note 사용자 장바구니에 있는 모든 질문들을 상위 카테고리별로 10개씩 가져온다.
      */
     async getMemberCartsByCategory(page: number, memberId: string, category: string): Promise<ResponseCartQuestionsDTO> {
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(category)) throw new CustomError('존재하지 않는 상위 카테고리입니다. ', 404);
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const categoryUpperId = await this.categoryRepository.createQueryBuilder('c')
                    .select('c.id')
                    .where('c.category_name = :category', { category })
                    .getOne();

               const countQuery: RowDataPacket = await this.cartRepository.createQueryBuilder('cart')
                    .select('count(*)', 'count')
                    .innerJoin('category', 'c', 'cart.category_name = c.category_name')
                    .where('cart.member_id = :memberId', { memberId: memberId })
                    .andWhere('c.category_upper_id = :categoryUpperId', { categoryUpperId: categoryUpperId.id })
                    .getRawOne();
               
               const rowPacket: RowDataPacket[] = await this.cartRepository.createQueryBuilder('cart')
                    .select([
                         'cart.question_id',
                         'upper_category.category_name AS category_name',
                         'cart.category_name AS subcategory_name',
                         'q.question_content'
                    ])
                    .innerJoin('question', 'q', 'cart.question_id = q.id')
                    .leftJoin('category', 'upper_category', 'upper_category.id = (SELECT category_upper_id FROM category cat WHERE cat.category_name = cart.category_name)')
                    .where('cart.member_id = :member_id', { member_id: memberId }).andWhere('upper_category.category_name = :category_name', { category_name: category })
                    .orderBy('q.createdAt', 'DESC').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const cartQuestionsDTOs: ResponseCartQuestionsOfMemberData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.question_id),
                    category: packet.category_name,
                    subcategory: packet.subcategory_name,
                    questionContent: packet.question_content,
               }));
               const result: ResponseCartQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: cartQuestionsDTOs
               }
               return result;
          } catch (error) {
               console.log('getMemberCartsByCategory ERROR cart.service 100\n' + error);
               throw new CustomError('getMemberCartsByCategory 서비스 로직 에러: ', 500);
          }
     }

     /**
      * @note 사용자 장바구니에 있는 모든 질문들을 하위 카테고리별로 10개씩 가져온다.
      */
     async getMemberCartsBySubcategory(page: number, memberId: string, category: string, subcategory: string): Promise<ResponseCartQuestionsDTO> {
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(category)) throw new CustomError('존재하지 않는 상위 카테고리입니다. ', 400);
          const checkSubcategory = await this.categoryRepository.findOne({
               where: {
                    categoryName: subcategory,
               },
          });
          const checkCategory = await this.categoryRepository.findOne({
               where: {
                    categoryName: category,
               }
          });

          if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) throw new CustomError('존재하지 않는 하위 카테고리입니다. ', 400);
          if (checkCategory.id !== checkSubcategory.categoryUpperId) throw new CustomError('상위카테고리에 속하지 않는 하위카테고리 입니다. ', 400);
          
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const countQuery: RowDataPacket = await this.cartRepository.createQueryBuilder('cart')
                    .select('COUNT(*)', 'count').where('cart.member_id = :member_id', { member_id: memberId }).andWhere('cart.category_name = :category_name', { category_name: subcategory })
                    .getRawOne();

               const rowPacket: RowDataPacket[] = await this.cartRepository.createQueryBuilder('cart')
                    .select([
                        'cart.question_id',
                        'c.category_name AS category_name',
                        'cart.category_name AS subcategory_name',
                        'q.question_content'
                    ])
                    .innerJoin('question', 'q', 'cart.question_id = q.id')
                    .innerJoin('category', 'c', 'c.id = (SELECT category_upper_id FROM category WHERE category_name = cart.category_name)')
                    .where('cart.member_id = :member_id AND cart.category_name = :category_name', { member_id: memberId, category_name: subcategory })
                    .orderBy('q.createdAt', 'DESC').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const cartQuestionsDTOs: ResponseCartQuestionsOfMemberData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.question_id),
                    category: packet.category_name,
                    subcategory: packet.subcategory_name,
                    questionContent: packet.question_content,
               }));
               const result: ResponseCartQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: cartQuestionsDTOs
               }
               return result;
          } catch (error) {
               console.log('getMemberCartsBySubcategory ERROR cart.service 137\n' + error);
               throw new CustomError('면접 전, 사용자의 장바구니 하위카테고리 필터 질문 데이터 전체 조회 실패', 500);
          }
     }

     /**
      * @note 사용자가 입력한 질문을 생성하고 저장 후, 장바구니에 생성과 저장한다.
      */
     async insertMemberQuestionIntoCart(memberId: string, categoryName: string, subcategoryName: string, questionContent: string): Promise<void> {
          try {
               const category = await this.categoryRepository.findOne({
                    where: {
                         categoryName: subcategoryName,
                    },
               });

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
               console.log('insertMemberQuestionIntoCart ERROR cart.service 146');
               throw new CustomError('사용자가 생성한 질문 장바구니 담기 실패', 500);
          }
     }
}