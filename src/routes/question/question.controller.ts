import { Controller,Get, Query, Res, UseGuards } from "@nestjs/common";
import { QuestionService } from "src/routes/question/question.service";
import { ApiResponse, CustomError } from "src/common/config/common";
import { ResponseGPTQuestionsDTO, ResponseQuestionsDTO } from "./dto/response.dto";
import { Response } from 'express';
import { TokenAuthGuard } from "src/common/config/auth";
import { Category } from "src/entity/category.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

@Controller('api/question')
export class QuestionController {
     /**
     * Nest.js에서 @Res() 데커레이터를 사용하면 Express.js의 원시 Response객체에
     * 접근하기 때문에 return (Next.js 내장 응답처리 메커니즘)을 무시하고,
     * 원시 Express형식으로 응답을 보내야한다.
     */

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
          // 유효성 검사
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          // 0인 경우 1로 바꾸기
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
               } else {
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
               }

               const apiResponse: ApiResponse<ResponseQuestionsDTO> = {
                    status: 200,
                    data
               }
               response.json(apiResponse);
          } catch(error) {
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }

     // /**
     //  * @api 메인 페이지 하단부분 API, 카테고리로 분류한 16개의 랜덤질문을 가져온다.
     //  */
     // @Get('all/category')
     // async getQuestionsByCategory(
     //      @Query('page') page: string,
     //      @Query('category') category: string,
     //      @Res() response: Response,
     // ) {  
     //      // 유효성 검사
     //      if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
     //      if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
     //      // 0인 경우 1로 바꾸기
     //      if (page === "0") page = "1";

     //      try {
     //           const data = await this.questionService.getQuestionsWithCategory(Number(page), category);
     //           const apiResponse: ApiResponse<ResponseQuestionsDTO> = {
     //                status: 200,
     //                data
     //           }
     //           response.json(apiResponse);
     //      } catch(error) {
     //           throw new CustomError('알 수 없는 에러 : ' + error,500);
     //      }
     // }

     // /**
     //  * @api 메인 페이지 하단부분 API, 서비카테코리로 분류한 16개의 랜덤질문을 가져온다.
     //  */
     // @Get('all/subcategory')
     // async getQuestionsBySubcategory(
     //      @Query('page') page: string,
     //      @Query('category') category: string,
     //      @Query('subcategory') subCategory: string,
     //      @Res() response: Response,
     // ) {
     //      // 유효성 검사
     //      if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
     //      if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
     //      if (subCategory === "") throw new CustomError('서브카테고리가 비었습니다. ', 400);
     //      // 0인 경우 1로 바꾸기
     //      if (page === "0") page = "1";

     //      try {
     //           const data = await this.questionService.getQuestionsWithSubcategory(Number(page), category, subCategory);
     //           const apiResponse: ApiResponse<ResponseQuestionsDTO> = {
     //                status: 200,
     //                data
     //           }
     //           response.json(apiResponse);
     //      } catch(error) { 
     //           throw new CustomError('알 수 없는 에러 : ' + error,500);
     //      }
     // }
 
     /**
      * @api 사용자가 GPT질문을 랜덤으로 선택하고 가져온다.
      */
     @UseGuards(TokenAuthGuard)
     @Get('gpt')
     async getQuestionsByGPT(
          @Query('category') category: string,
          @Query('subcategory') subcategory: string,
          @Query('questionCount') questionCount: string,
          @Res() response: Response  
     ) {
          if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
          if (subcategory === "") throw new CustomError('서브카테고리가 비었습니다. ', 400);
          if (![2, 4, 6, 8, 10].includes(parseInt(questionCount))) throw new CustomError('질문의 개수를 2, 4, 6, 8, 10 중에서 선택해주세요. ', 400);
          const memberId: string = response.locals.memberId;

          try {
               const data = await this.questionService.getQuestionsByGPT(memberId, category, subcategory, questionCount);
               const apiResponse: ApiResponse<ResponseGPTQuestionsDTO> = {
                    status: 200,
                    data
                }
               response.json(apiResponse);
          } catch (error) {
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }
}