import { Controller,Get, ParseArrayPipe, Query, Res, UseGuards } from "@nestjs/common";
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
 
     /**
      * @api 사용자가 GPT질문을 랜덤으로 선택하고 가져온다.
      */
     @UseGuards(TokenAuthGuard)
     @Get('gpt')
     async getQuestionsByGPT(
          @Query('category') category: string,
          @Query('subcategory', new ParseArrayPipe({ items: String, separator: ',' })) subcategory: string[],
          @Query('questionCount') questionCount: string,
          @Res() response: Response  
     ) {
          if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
          if (subcategory.length <= 0) throw new CustomError('서브카테고리가 비었습니다. ', 400);
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