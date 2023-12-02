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

     constructor(private readonly cartService: CartService){}

     /**
      * @api 사용자의 장바구니 질문을 가져온다.(디폴트)
      */
     @UseGuards(TokenAuthGuard)
     @Get('questions')
     async getMemberCarts(
          @Query('page') page: string,
          @Res() response: Response,
     ) {
        // 유효성 검사
        if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
        // 0인 경우 1로 바꾸기
        if (page === "0") page = "1";
        const memberId = response.locals.memberId;
        
        try {
          const data = await this.cartService.getMemberCarts(Number(page), memberId);
          const apiResponse: ApiResponse<ResponseCartQuestionsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
        } catch (error) {
             throw new CustomError('알 수 없는 에러 : ' + error,500);
        }
     }

     /**
      * @api 사용자의 장바구니 질문을 상위 카테고리로 필터링해서 가져온다.
      */
     @UseGuards(TokenAuthGuard)
     @Get('questions/category')
     async getMemberCartsByCategory(
          @Query('page') page: string,
          @Query('category') category: string,
          @Res() response: Response,
     ) {
          // 유효성 검사
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
          // 0인 경우 1로 바꾸기
          if (page === "0") page = "1";
          const memberId = response.locals.memberId;

          try {
               const data = await this.cartService.getMemberCartsByCategory(Number(page), memberId, category);
               const apiResponse: ApiResponse<ResponseCartQuestionsDTO> = {
                    status: 200,
                    data
               }
               response.json(apiResponse);
          } catch (error) {
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }

     /**
      * @api 사용자의 장바구니 질문을 하위 카테고리로 필터링해서 가져온다.
      */
     @UseGuards(TokenAuthGuard)
     @Get('questions/subcategory')
     async getMemberCartsBySubcategory(
          @Query('page') page: string,
          @Query('category') category: string,
          @Query('subcategory') subcategory: string,
          @Res() response: Response,
     ) {
          // 유효성 검사
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
          if (subcategory === "") throw new CustomError('서브카테고리가 비었습니다. ', 400);
          // 0인 경우 1로 바꾸기
          if (page === "0") page = "1";
          const memberId = response.locals.memberId;

          try {
               const data = await this.cartService.getMemberCartsBySubcategory(Number(page), memberId, category, subcategory);
               const apiResponse: ApiResponse<ResponseCartQuestionsDTO> = {
                    status: 200,
                    data
               }
               response.json(apiResponse);
          } catch (error) {
               throw new CustomError('알 수 없는 에러 : ' + error,500);
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
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }
}