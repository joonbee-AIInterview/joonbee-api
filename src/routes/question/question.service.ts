import { RowDataPacket } from 'mysql2';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "src/entity/category.entity";
import { Question } from "src/entity/question.entity";
import { Repository } from "typeorm";
import { CustomError } from "src/common/config/common";
import { ResponseGPTQuestionData, ResponseGPTQuestionsDTO, ResponseQuestionsDTO, ResponseQuestionsData, ResponseQuestionsInfoDTO, ResponseQuestionsWithCategoryData } from "./dto/response.dto";


@Injectable()
export class QuestionService {

     private PAGE_SIZE: number;

     constructor(
          @InjectRepository(Question) 
          private readonly questionRepository: Repository<Question>,
          @InjectRepository(Category)
          private readonly categoryRepository: Repository<Category>
     ){
          this.PAGE_SIZE = 16;
     }

     /**
      * @note 디폴트로 16개의 랜덤질문을 가져온다.
      */
     async getQuestions(page: number): Promise<ResponseQuestionsDTO> {
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const countQuery: RowDataPacket = await this.questionRepository.createQueryBuilder('question')
                    .select('COUNT(question.id)', 'count')
                    .getRawOne();
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('question')
                    .select(['question.id AS questionId','category.id AS categoryId','question.question_content AS questionContent','category.category_name AS categoryName'])
                    .leftJoinAndSelect('question.category', 'category')
                    .orderBy('questionId')
                    .offset(skipNumber)
                    .limit(this.PAGE_SIZE)
                    .getRawMany();
               return this.makeResult(rowPacket, countQuery);
          } catch(error) {
               console.log('getQuestions ERROR question.service 43\n' + error);
               throw new CustomError('메인 페이지 하단 디폴트 랜덤 질문 정보 불러오기 실패', 500);
          }
     }

     /**
      * @note 상위카테고리로 분류한 16개의 랜덤질문을 가져온다.
      */
     async getQuestionsWithCategory(page: number, categoryName: string): Promise<ResponseQuestionsDTO> {
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               // 레디스로 캐싱 고민해보기
               const category = await this.categoryRepository
                    .createQueryBuilder('category')
                    .select('category.id')
                    .where('category.category_name = :categoryName', { categoryName })
                    .getOne();
               const countQuery: RowDataPacket = await this.questionRepository.createQueryBuilder('question')
                    .innerJoin(
                         subQuery => subQuery.from(Category, 'category')
                         .select('*')
                         .where('category.category_upper_id = :categoryId', { categoryId: category.id }),
                         'category',
                         'question.category_id = category.id')
                    .select('COUNT(question.id)', 'count')
                    .getRawOne();
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('question')
                    .select(['question.id AS questionId','category.id AS categoryId','question.question_content AS questionContent','category.category_name AS categoryName'])
                    .innerJoin(
                         subQuery => {
                              return subQuery
                              .select('*')
                              .from(Category, 'category')
                              .where('category.category_upper_id = :categoryId', { categoryId: category.id });
                         },
                         'category',
                         'question.category_id = category.id')
                    .orderBy('questionId')
                    .offset(skipNumber)
                    .limit(this.PAGE_SIZE)
                    .getRawMany();
               return this.makeResult(rowPacket, countQuery);
          } catch(error) {
               console.log('getQuestionsWithCategory ERROR question.service 86\n' + error);
               throw new CustomError('메인 페이지 하단 상위카테고리 랜덤 질문 정보 불러오기 실패', 500);
          }
     }

     /**
      * @note 서브카테고리로 분류한 16개의 랜덤질문을 가져온다.
      */
     async getQuestionsWithSubcategory(page: number, categoryName: string, subCategoryName: string): Promise<ResponseQuestionsDTO> {
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const countQuery: RowDataPacket = await this.questionRepository.createQueryBuilder('question')
                    .innerJoin(
                         subQuery => subQuery.from(Category, 'category')
                              .select('*')
                              .where('category.category_name = :subCategoryName', { subCategoryName }),
                         'category',
                         'question.category_id = category.id')
                    .select('COUNT(question.id)', 'count')
                    .getRawOne();
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('question')
                    .select(['question.id AS questionId','category.id AS categoryId','question.question_content AS questionContent','category.category_name AS categoryName'])
                    .innerJoin(
                         subQuery => {
                              return subQuery
                                   .select('*')
                                   .from(Category, 'category')
                                   .where('category.category_name = :subCategoryName', { subCategoryName });
                              },
                              'category',
                              'question.category_id = category.id')
                    .orderBy('questionId')
                    .offset(skipNumber)
                    .limit(this.PAGE_SIZE)
                    .getRawMany();
               return this.makeResult(rowPacket, countQuery);
          } catch(error) {
               console.log('getQuestionsWithSubcategory ERROR question.service 123\n' + error);
               throw new CustomError('메인 페이지 하단 서브카테고리 랜덤 질문 정보 불러오기 실패', 500);
          }
     }

     /**
     * @note 사용자가 인터뷰를 위해 상위 카테고리 1개, 하위 카테고리 1-N개, 질문의 개수를 가져온다.
     */
     async getQuestionsByGPT (memberId: string, categoryName: string, subcategoryName: string[], questionCount: string): Promise<ResponseGPTQuestionsDTO> {
          try {
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('q')
                    .select(['q.id as questionId', 'q.question_content as questionContent', 'c.category_name as subcategory'])
                    .innerJoin('Category', 'c', 'q.category_id = c.id AND c.category_name IN (:...categoryNames)', { categoryNames: subcategoryName })
                    .where('q.writer = :writer', { writer: 'gpt' })
                    .orderBy('RAND()').limit(parseInt(questionCount)).getRawMany(); // RAND(): 추후 최적화 필요!

               return this.makeGPTResult(memberId, categoryName, rowPacket);
          } catch (error) {
               console.log('getQuestionsByGPT ERROR question.service 123\n' + error);
               throw new CustomError('GPT질문들 가져오기 실패', 500);
          }
     }

     /**
      * questionsWithCategoryDTOs => result 공통메소드
      */
     makeResult(rowPacket: RowDataPacket[], countQuery: RowDataPacket): ResponseQuestionsDTO {
          const questionsWithCategoryDTOs: ResponseQuestionsWithCategoryData[] = rowPacket.map(packet => ({
               questionId: packet.questionId,
               categoryId: packet.categoryId,
               questionContent: packet.questionContent,
               subcategoryName: packet.categoryName,
          }));

          const result: ResponseQuestionsDTO = {
               total: Number(countQuery.count),
               result: questionsWithCategoryDTOs
          }
          return result;
     }

     
     
     /**
      * @api 사용자 질문 장바구니중 선택한 질문들을 그대로 반환한다.
      */
     async findMemberCheckQuestions(memberId: string, questionIds: number[]): Promise<ResponseQuestionsInfoDTO> {
          try {     
               for (let i = 0; i < questionIds.length; i++) {
                    const questionExists = await this.questionRepository.exist({ where: { id: questionIds[i] } });
                    if (!questionExists) throw new CustomError(`${questionIds[i]}이 존재하지 않습니다. `, 400);
               }

               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('q')
                    .select([
                         'q.id AS questionId',
                         'c.category_name AS category',
                         '(SELECT c2.category_name FROM category c2 WHERE c2.id = c.category_upper_id) AS subcategory',
                         'q.question_content AS questionContent',
                    ])
                    .innerJoin('q.category', 'c')
                    .where('q.id IN (:...questionIds)', { questionIds }) // 수정된 WHERE 절
                    .getRawMany();

               const questionsDTOs: ResponseQuestionsData[] = rowPacket.map(packet => ({
                    questionId: packet.questionId,
                    category: packet.category,
                    subcategory: packet.subcategory,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseQuestionsInfoDTO = {
                    result: questionsDTOs,
               }
               return result;
          } catch (error) {
               console.log('findMemberCheckQuestions ERROR cart.service 100\n' + error);
               throw new CustomError('선택한 사용자 질문 인터뷰에 저장하기 실패', 500);
          }
     }

     /**
      * questionByGptDTOs -> 메소드화
      */
     makeGPTResult(memberId: string, categoryName: string, rowPacket: RowDataPacket[]): ResponseGPTQuestionsDTO {
          const questionByGptDTOs: ResponseGPTQuestionData[] = rowPacket.map(packet => ({
               questionId: packet.questionId,
               subcategoryName: packet.subcategory,
               questionContent: packet.questionContent,
          }));
          const result: ResponseGPTQuestionsDTO = {
               memberId: memberId,
               category: categoryName,
               result: questionByGptDTOs,
          }
          return result;
     }
}