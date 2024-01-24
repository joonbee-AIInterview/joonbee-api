import { Body, Controller, Get, Post, Query, Res, UseGuards, ValidationPipe } from "@nestjs/common";
import { CartService } from "./cart.service";
import { ApiResponse, CustomError } from "src/common/config/common";
import { ResponseCartQuestionsDTO } from "./dto/response.dto";
import { Response } from 'express';
import { TokenAuthGuard } from "src/common/config/auth";
import { RequestMemberQuestionInsertCartDTO } from "./dto/request.dto";
import { ApiBody } from "@nestjs/swagger";

@Controller('api/cart')
export class CartController {

     constructor(
          private readonly cartService: CartService,
     ){}

     /**
      * @api 사용자의 장바구니 질문을 선택에 따라 가져온다.
      */
     @UseGuards(TokenAuthGuard)
     @Get('questions')
     async getMemberCarts(
          @Query('page') page: string,
          @Query('category') category: string,
          @Query('subcategory') subcategory: string,
          @Res() response: Response,
     ) {
        if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
        if (page === "0") page = "1";
        const memberId = response.locals.memberId;
        let data;

        try {
          if (category === "" && subcategory === "") data = await this.cartService.getMemberCarts(Number(page), memberId);
          else if (category !== "" && subcategory === "") data = await this.cartService.getMemberCartsByCategory(Number(page), memberId, category);
          else data = await this.cartService.getMemberCartsBySubcategory(Number(page), memberId, category, subcategory);

          const apiResponse: ApiResponse<ResponseCartQuestionsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
        } catch (error) {
               console.error('getMemberCarts 컨트롤러 에러발생: ' + error);
               throw new CustomError('getMemberCarts 에러 : ' + error, 500);
        }
     }

     /**
      * @api 사용자가 질문을 생성하고 본인의 장바구에 저장한다.
      */
     @UseGuards(TokenAuthGuard)
     @Post('question/save')
     @ApiBody({ type: RequestMemberQuestionInsertCartDTO})
     async insertMemberQuestionIntoCart(
          @Body(new ValidationPipe()) dto: RequestMemberQuestionInsertCartDTO,
          @Res() response: Response  
     ) {
          const { questionId, categoryName, subcategoryName, questionContent } = dto;
          if (subcategoryName === "") throw new CustomError('서브카테고리가 비었습니다. ', 400);
          if (questionContent === "") throw new CustomError('질문 내용이 비어있습니다.', 400);
          const memberId = response.locals.memberId;

          if (questionId !== undefined) await this.cartService.insertMemberQuestionWithQuestionIdIntoCart(memberId, questionId, subcategoryName);
          else await this.cartService.insertMemberQuestionIntoCart(memberId, categoryName, subcategoryName, questionContent);
          
          const apiResponse: ApiResponse<string> = {
               status: 200,
               data: '성공'
           }
          response.json(apiResponse);
     }
}