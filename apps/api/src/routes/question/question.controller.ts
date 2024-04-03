import { Body, Controller,Get, ParseArrayPipe, Query, Res, UseGuards, ValidationPipe } from "@nestjs/common";
import { ApiResponse, CustomError } from "../../common/config/common";
import { ResponseGPTQuestionsDTO, ResponseQuestionsDTO, ResponseQuestionsInfoDTO } from "./dto/response.dto";
import { Response } from 'express';
import { ParseOptionalArrayPipe } from "./const/pipe.const";
import { QuestionService } from "./question.service";
import { TokenAuthGuard } from "../../common/config/auth";

@Controller('api/question')
export class QuestionController {

     constructor(
          private readonly questionService: QuestionService,
     ){}

     /**
      * @api 메인 페이지 하단부분 API, 디폴트로 16개의 랜덤질문을 가져온다.
      */
     @Get('all')
     async getQuestions(
          @Query('page') page: string = "1",
          @Query('category') category: string,
          @Query('subCategory') subcategory: string,
          @Res() response: Response,
     ) {  
          this.questionService.validationCheckPage(Number(page));
          let data;

          if (category === "" && subcategory === "") {
               data = await this.questionService.getQuestions(Number(page));
          } else if (category !== "" && subcategory === "") {
               this.questionService.validationCheckCategory(category);
               data = await this.questionService.getQuestionsWithCategory(Number(page), category);
          } else if (category !== "" && subcategory !== "") {
               this.questionService.validationCheckCategory(category);
               await this.questionService.validationCheckCategoryIncludeSubcategory(category, subcategory);
               data = await this.questionService.getQuestionsWithSubcategory(Number(page), category, subcategory);
          } else {
               throw new CustomError('category와 subcategory를 올바르게 입력하지 않았습니다. ', 404);
          }

          const apiResponse: ApiResponse<ResponseQuestionsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
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