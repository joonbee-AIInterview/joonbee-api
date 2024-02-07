import { Body, Controller,Get, ParseArrayPipe, Query, Res, UseGuards, ValidationPipe } from "@nestjs/common";
import { QuestionService } from "src/routes/question/question.service";
import { ApiResponse, CustomError } from "src/common/config/common";
import { ResponseGPTQuestionsDTO, ResponseQuestionsDTO, ResponseQuestionsInfoDTO } from "./dto/response.dto";
import { Response } from 'express';
import { TokenAuthGuard } from "src/common/config/auth";
import { Category } from "src/entity/category.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { ParseOptionalArrayPipe } from "./const/pipe.const";

@Controller('api/question')
export class QuestionController {

     constructor(
          private readonly questionService: QuestionService,
          // 유효성 검사용
          @InjectRepository(Category)
          private readonly categoryRepository: Repository<Category>,
     ){}

     /**
      * @api 메인 페이지 하단부분 API, 디폴트로 16개의 랜덤질문을 가져온다.
      */
     @Get('all')
     async getQuestions(
          @Query('page') page: string = "1",
          @Query('category') category: string,
          @Query('subcategory') subcategory: string,
          @Res() response: Response,
     ) {  
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          if (page === "0") page = "1";
          let data;

          try {
               if (category === "" && subcategory === "") {
                    data = await this.questionService.getQuestions(Number(page));
               } else if (category !== "" && subcategory === "") {
                    const check = await this.categoryRepository.findOne({
                         where: {
                              categoryName: category,
                         },
                    });
                    if (!check || check.categoryLevel !== 0) throw new CustomError('데이터베이스에 존재하지 않는 상위카테고리입니다. ', 404);
                    data = await this.questionService.getQuestionsWithCategory(Number(page), category);
               } else if (category !== "" && subcategory !== "") {
                    const checkCategory = await this.categoryRepository.findOne({
                         where: {
                              categoryName: category,
                         },
                    });
                    if (!checkCategory || checkCategory.categoryLevel !== 0) throw new CustomError('데이터베이스에 존재하지 않는 상위카테고리입니다. ', 404);
                    const checkSubcategory = await this.categoryRepository.findOne({
                         where: {
                              categoryName: subcategory,
                         },
                    }); 
                    if (!checkSubcategory || checkSubcategory.categoryLevel !== 1) throw new CustomError('데이터베이스에 존재하지 않는 하위카테고리입니다. ', 404);
                    data = await this.questionService.getQuestionsWithSubcategory(Number(page), category, subcategory);
               } else {
                    throw new CustomError('category와 subcategory를 올바르게 입력하지 않았습니다. ', 404);
               }

               const apiResponse: ApiResponse<ResponseQuestionsDTO> = {
                    status: 200,
                    data
               }
               response.json(apiResponse);
          } catch(error) {
               console.error('getQuestions 컨트롤러 에러발생: ' + error); 
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }
 
     /**
      * @api 사용자가 GPT질문을 랜덤으로 선택하고 가져온다.
      */
     @UseGuards(TokenAuthGuard)
     @Get('gpt')
     async getQuestionsByGPT(
          @Query('category') category: string,
          @Query('subcategory', ParseOptionalArrayPipe) subcategory: string[],
          @Query('questionCount') questionCount: string,
          @Res() response: Response  
     ) {
          const memberId = response.locals.memberId;
          await this.questionService.validationCheckMember(memberId);
          this.questionService.validationCheckCategory(category);
          this.questionService.validationCheckQuestionCount(questionCount);
          let data;

          if (subcategory.length !== 0) {
               await this.questionService.validationCheckSubcategory(category, subcategory);
               data = await this.questionService.getQuestionsByGPT(memberId, category, subcategory, questionCount);
          } else {
               data = await this.questionService.getQuestionsByGPTNoSubcategory(memberId, category, questionCount);
          }

          const apiResponse: ApiResponse<ResponseGPTQuestionsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
     }

     /**
      * @api 사용자 질문 장바구니중 선택한 질문들을 그대로 반환한다.
      */
     @UseGuards(TokenAuthGuard)
     @Get()
     async findMemberCheckQuestions(
          @Query('questionIds', new ParseArrayPipe({ items: Number, separator: ',' })) questionIds: number[],
          @Res() response: Response
     ) {
          const memberId: string = response.locals.memberId;

          try {
               const data = await this.questionService.findMemberCheckQuestions(memberId, questionIds);
               const apiResponse: ApiResponse<ResponseQuestionsInfoDTO> = {
                    status: 200,
                    data
                }
               response.json(apiResponse);
          } catch (error) {
               console.error('findMemberCheckQuestions 컨트롤러 에러발생: ' + error);
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }

}