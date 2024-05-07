import { RowDataPacket } from 'mysql2';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "@app/common/db/entity/category.entity";
import { Question } from "@app/common/db/entity/question.entity";
import { Repository } from "typeorm";
import { ResponseGPTQuestionData, ResponseGPTQuestionsDTO, ResponseQuestionsDTO, ResponseQuestionsData, ResponseQuestionsInfoDTO, ResponseQuestionsWithCategoryData } from "./dto/response.dto";
import { Member } from '@app/common/db/entity/member.entity';
import { CustomError } from '@app/common/config/common';


@Injectable()
export class QuestionService {

     private PAGE_SIZE: number;

     constructor(
          @InjectRepository(Question) 
          private readonly questionRepository: Repository<Question>,
          @InjectRepository(Category)
          private readonly categoryRepository: Repository<Category>,
          @InjectRepository(Member)
          private readonly memberRepository: Repository<Member>,
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
                    .where('question.writer = :writer', { writer: 'gpt'})
                    .getRawOne();
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('q')
                    .select('q.id AS questionId, c.id AS categoryId, q.questionContent AS questionContent, parent.categoryName AS categoryName, c.categoryName AS subcategoryName')
                    .innerJoin(Category, 'c', 'q.category_id = c.id')
                    .innerJoin(Category, 'parent', 'c.category_upper_id = parent.id')
                    .where('q.writer = :writer', { writer: 'gpt'})
                    .orderBy('q.id')
                    .offset(skipNumber)
                    .limit(this.PAGE_SIZE)
                    .getRawMany();
                    
               const questionsWithCategoryDTOs: ResponseQuestionsWithCategoryData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.questionId),
                    categoryId: packet.categoryId,
                    categoryName: packet.categoryName,
                    subcategoryName: packet.subcategoryName,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: questionsWithCategoryDTOs
               }
               return result;
          } catch(error) {
               console.error('getQuestions ERROR question.service 43\n' + error);
               throw new CustomError('메인 페이지 하단 디폴트 랜덤 질문 정보 불러오기 실패', 500);
          }
     }

     /**
      * @note 상위카테고리로 분류한 16개의 랜덤질문을 가져온다.
      */
     async getQuestionsWithCategory(page: number, categoryName: string): Promise<ResponseQuestionsDTO> {
          const skipNumber = (page - 1) * this.PAGE_SIZE;
          try {
               const category = await this.categoryRepository.createQueryBuilder('category')
                    .select('category.id')
                    .where('category.category_name = :categoryName', { categoryName })
                    .getOne();

               const countQuery: RowDataPacket = await this.questionRepository
                    .createQueryBuilder('q')
                    .select('COUNT(q.id)', 'count')
                    .innerJoin('category', 'c', 'q.category_id = c.id AND c.category_name = :categoryName AND q.writer = :writer', {
                         categoryName: categoryName,
                         writer: 'gpt',
                    })
                    .getRawOne();

               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('question')
                    .select(['question.id AS questionId',
                         'category.id AS categoryId',
                         'question.question_content AS questionContent',
                         'category.category_name AS subcategoryName'])
                    .innerJoin(
                         subQuery => {
                              return subQuery
                              .select('*')
                              .from(Category, 'category')
                              .where('category.category_upper_id = :categoryId', { categoryId: category.id });
                         },
                         'category',
                         'question.category_id = category.id')
                    .where('question.writer = :writer', { writer: 'gpt'})
                    .orderBy('questionId').offset(skipNumber).limit(this.PAGE_SIZE).getRawMany();

               const questionsWithCategoryDTOs: ResponseQuestionsWithCategoryData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.questionId),
                    categoryId: packet.categoryId,
                    categoryName: categoryName,
                    subcategoryName: packet.subcategoryName,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: questionsWithCategoryDTOs
               }
               return result;
          } catch(error) {
               console.error('getQuestionsWithCategory ERROR question.service 86\n' + error);
               throw new CustomError('메인 페이지 하단 상위카테고리 랜덤 질문 정보 불러오기 실패', 500);
          }
     }

     /**
      * @note 서브카테고리로 분류한 16개의 랜덤질문을 가져온다.
      */
     async getQuestionsWithSubcategory(page: number, categoryName: string, subCategoryName: string): Promise<ResponseQuestionsDTO> {
          const skipNumber = (page - 1) * this.PAGE_SIZE;

          
          try {
               const countQuery: RowDataPacket = await this.questionRepository
                    .createQueryBuilder('q')
                    .select('COUNT(q.id)', 'count')
                    .innerJoin('category', 'c', 'q.category_id = c.id AND c.category_name = :categoryName AND q.writer = :writer', {
                         categoryName: subCategoryName,
                         writer: 'gpt',
                    })
                    .getRawOne();

               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('question')
                    .select(['question.id AS questionId','category.id AS categoryId','question.question_content AS questionContent','category.category_name AS subcategoryName'])
                    .innerJoin(
                         subQuery => {
                              return subQuery
                                   .select('*')
                                   .from(Category, 'category')
                                   .where('category.category_name = :subCategoryName', { subCategoryName });
                              },
                              'category',
                              'question.category_id = category.id')
                    .where('question.writer = :writer', { writer: 'gpt'})
                    .orderBy('questionId')
                    .offset(skipNumber)
                    .limit(this.PAGE_SIZE)
                    .getRawMany();

               const questionsWithCategoryDTOs: ResponseQuestionsWithCategoryData[] = rowPacket.map(packet => ({
                    questionId: Number(packet.questionId),
                    categoryId: packet.categoryId,
                    categoryName: categoryName,
                    subcategoryName: packet.subcategoryName,
                    questionContent: packet.questionContent,
               }));
               const result: ResponseQuestionsDTO = {
                    total: Number(countQuery.count),
                    result: questionsWithCategoryDTOs
               }
               return result;
          } catch(error) {
               console.error('getQuestionsWithSubcategory ERROR question.service 123\n' + error);
               throw new CustomError('메인 페이지 하단 서브카테고리 랜덤 질문 정보 불러오기 실패', 500);
          }
     }

     /**
     * @note 사용자가 인터뷰를 위해 상위 카테고리 1개, 하위 카테고리 1-N개, 질문의 개수를 가져온다.
     */
     async getQuestionsByGPT (memberId: string, categoryName: string, subcategoryName: string[], questionCount: string): Promise<ResponseGPTQuestionsDTO> {
          try {
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('q')
                    .select(['q.id as questionId', 'q.question_content as questionContent']) // 'c.category_name as subcategory'
                    .innerJoin('Category', 'c', 'q.category_id = c.id AND c.category_name IN (:...categoryNames)', { categoryNames: subcategoryName })
                    .where('q.writer = :writer', { writer: 'gpt' })
                    .orderBy('RAND()').limit(parseInt(questionCount)).getRawMany(); // RAND(): 추후 최적화 필요!
               return this.makeGPTResult(memberId, categoryName, rowPacket);
          } catch (error) {
               console.error('getQuestionsByGPT ERROR question.service 123\n' + error);
               throw new CustomError('getQuestionsByGPT() 실패', 500);
          }
     }

     /**
      * 하위카테고리가 없는 경우, GPT가 만든 질문들을 가져오는 코드
      * 
      * @param memberId 
      * @param category 
      * @param questionCount
      * @author 송재근 
      */
     async getQuestionsByGPTNoSubcategory(memberId: string, categoryName: string, questionCount: string): Promise<ResponseGPTQuestionsDTO> {
          const categoryId = await this.categoryRepository.findOne({where: {categoryName}});

          try {
               const rowPacket: RowDataPacket[] = await this.questionRepository.createQueryBuilder('q')
                    .select(['q.id as questionId', 'q.question_content as questionContent']) // 'c.category_name as subcategory'
                    .innerJoin('Category', 'c', 'q.category_id = c.id')
                    .where('q.writer = :writer', { writer: 'gpt' })
                    .andWhere('c.category_upper_id = :categoryId', { categoryId: categoryId.id })
                    .orderBy('RAND()').limit(parseInt(questionCount)).getRawMany(); // RAND(): 추후 최적화 필요!
               return this.makeGPTResult(memberId, categoryName, rowPacket);
          } catch (error) {
               console.error('getQuestionsByGPTNoSubcategory ERROR question.service \n' + error);
               throw new CustomError('getQuestionsByGPTNoSubcategory() 실패', 500);
          }
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
                    .innerJoin('q.category', 'c').where('q.id IN (:...questionIds)', { questionIds }).getRawMany();

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
               console.error('findMemberCheckQuestions ERROR cart.service 100\n' + error);
               throw new CustomError('선택한 사용자 질문 인터뷰에 저장하기 실패', 500);
          }
     }

     /**
      * questionByGptDTOs -> 메소드화
      */
     makeGPTResult(memberId: string, categoryName: string, rowPacket: RowDataPacket[]): ResponseGPTQuestionsDTO {
          const questionByGptDTOs: ResponseGPTQuestionData[] = rowPacket.map(packet => ({
               questionId: packet.questionId,
               // subcategoryName: packet.subcategory,
               questionContent: packet.questionContent,
          }));
          const result: ResponseGPTQuestionsDTO = {
               memberId: memberId,
               category: categoryName,
               result: questionByGptDTOs,
          }
          return result;
     }

     /**
      * categoryName에 정해진 형태만 오는지 확인하는 코드
      * 
      * @param categoryName
      * @author 송재근
      */
     validationCheckCategory(categoryName: string) {
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) 
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
      * questionCount의 개수가 2, 4, 6, 8, 10인지 확인하는 코드
      * 
      * @param questionCount 
      * @author 송재근
      */
     validationCheckQuestionCount(questionCount: string) {
          if (![2, 4, 6, 8, 10].includes(parseInt(questionCount))) 
               throw new CustomError('질문의 개수를 2, 4, 6, 8, 10 중에서 선택해주세요. ', 400);
     }

     /**
      * 입력이 들어온 하위카테고리가 상위카테고리에 포함되는지 확인하는 코드
      * 
      * @param categoryName 
      * @param subcategoryName 
      * @author 송재근
      */
     async validationCheckSubcategory(categoryName: string, subcategoryName: string[]): Promise<void> {

          const checkCategoryId = await this.categoryRepository.findOne({where: {categoryName}});
          const subcategoryList = await this.categoryRepository.find({
               select: ['categoryName'],
               where: {categoryUpperId: checkCategoryId.id}
          });

          const subcategoryNameList = subcategoryList.map(category => category.categoryName);
          const notFoundSubcategories = subcategoryName.filter(name => !subcategoryNameList.includes(name));
          if (notFoundSubcategories.length > 0) throw new CustomError('존재하지 않거나 하위카테고리가 상위카테고리에 속하지 않습니다.', 400);
     }

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
      * 1번째 존재하는 하위카테고리를 확인하는 코드
      * 2번째 하위카테고리가 상위카테고리에 속하는지 확인하는 코드
      * 
      * @param categoryName 
      * @param subcategoryName
      * @author 송재근 
      */
     async validationCheckCategoryIncludeSubcategory(categoryName: string, subcategoryName: string): Promise<void> {
          const checkSubcategory = await this.categoryRepository.findOne({where: {categoryName: subcategoryName}}); 
          if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) throw new CustomError('데이터베이스에 존재하지 않는 하위카테고리입니다. ', 404);

          const category = await this.categoryRepository.findOne({where: {categoryName,}}); 
          if (category.id != checkSubcategory.categoryUpperId) throw new CustomError('하위카테고리가 상위카테고리에 속하지 않습니다. ', 400);
     }
}