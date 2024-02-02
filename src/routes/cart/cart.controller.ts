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
          if (isNaN(Number(page))) throw new CustomError('page에는 문자가 들어갈 수 없습니다. 숫자를 입력해주세요. ', 400);
          if (Number(page) <= 0) throw new CustomError('page에는 1보다 큰 값을 입력해주세요. ', 400);
          const memberId = response.locals.memberId;
          let data;

          if (category === "") {
               if (subcategory !== "") throw new CustomError('상위카테고리를 선택하지 않고 하위카테고리만 선택했습니다. ', 400);
               else data = await this.cartService.getMemberCarts(Number(page), memberId);
          } else {
               if (subcategory !== "")  data = await this.cartService.getMemberCartsBySubcategory(Number(page), memberId, category, subcategory);
               else data = await this.cartService.getMemberCartsByCategory(Number(page), memberId, category);
          }

          const apiResponse: ApiResponse<ResponseCartQuestionsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
     }

     /**
      * @api 사용자가 질문을 생성하고 본인의 장바구에 저장한다.
      */
     @UseGuards(TokenAuthGuard)
     @Post('question/save')
     @ApiBody({ type: RequestMemberQuestionInsertCartDTO})
     async insertMemberQuestionIntoCart(
          @Body() dto: RequestMemberQuestionInsertCartDTO,
          @Res() response: Response  
     ) {
          const { questionId, categoryName, subcategoryName, questionContent } = dto;
          
          this.cartService.validationCheckCategory(categoryName);
          if (categoryName === "") throw new CustomError('상위카테고리가 비었습니다. ', 400);
          if (!['fe', 'be', 'language', 'cs', 'mobile', 'etc'].includes(categoryName)) throw new CustomError('상위카테고리가 아닙니다. ', 400);

          if (subcategoryName === "") throw new CustomError('하위카테고리가 비었습니다. ', 400);
          if (questionContent === "" || /^\s*$/.test(questionContent)) throw new CustomError('질문 내용이 비어있습니다.', 400);
          const memberId = response.locals.memberId;

          if (questionId !== undefined) 
               await this.cartService.insertMemberQuestionWithQuestionIdIntoCart(memberId, questionId, categoryName, subcategoryName, questionContent);
          else 
               await this.cartService.insertMemberQuestionIntoCart(memberId, categoryName, subcategoryName, questionContent);
          const apiResponse: ApiResponse<string> = {
               status: 200,
               data: '성공'
           }
          response.json(apiResponse);
     }
}