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
     /**
     * Nest.js에서 @Res() 데커레이터를 사용하면 Express.js의 원시 Response객체에
     * 접근하기 때문에 return (Next.js 내장 응답처리 메커니즘)을 무시하고,
     * 원시 Express형식으로 응답을 보내야한다.
     */

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
        const memberId = '김재우';
        let data;

        try {
          if (category === "" && subcategory === "") {
               data = await this.cartService.getMemberCarts(Number(page), memberId);
          } else if (category !== "" && subcategory === "") {
               data = await this.cartService.getMemberCartsByCategory(Number(page), memberId, category);
          } else {
               data = await this.cartService.getMemberCartsBySubcategory(Number(page), memberId, category, subcategory);
          }
          const apiResponse: ApiResponse<ResponseCartQuestionsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
        } catch (error) {
               console.log('getMemberCarts 컨트롤러 에러발생: ' + error);
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
          const { categoryName, subcategoryName, questionContent } = dto;
          if (categoryName === "") throw new CustomError('카테고리가 비었습니다. ', 400);
          if (subcategoryName === "") throw new CustomError('서브카테고리가 비었습니다. ', 400);
          if (questionContent === "") throw new CustomError('질문 내용이 비어있습니다.', 400);
          const memberId: string = response.locals.memberId;

          try {
               await this.cartService.insertMemberQuestionIntoCart(memberId, categoryName, subcategoryName, questionContent);
               const apiResponse: ApiResponse<string> = {
                    status: 200,
                    data: '성공'
                }
               response.json(apiResponse);
          } catch (error) {
               console.log('insertMemberQuestionIntoCart 컨트롤러 에러발생: ' + error);
               throw new CustomError('insertMemberQuestionIntoCart 에러 : ' + error, 500);
          }
     }
}