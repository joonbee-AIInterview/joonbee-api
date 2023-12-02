import { RowDataPacket } from 'mysql2';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "src/entity/category.entity";
import { Question } from "src/entity/question.entity";
import { Repository } from "typeorm";
import { CustomError } from "src/common/config/common";
import { ResponseQuestionsDTO, ResponseQuestionsWithCategoryData } from "./dto/response.dto";


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
               console.log('getQuestions ERROR question.service 148\n' + error);
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
               console.log('getQuestionsWithCategory ERROR question.service 148\n' + error);
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
               console.log('getQuestionsWithSubcategory ERROR question.service 148\n' + error);
               throw new CustomError('메인 페이지 하단 서브카테고리 랜덤 질문 정보 불러오기 실패', 500);
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
}