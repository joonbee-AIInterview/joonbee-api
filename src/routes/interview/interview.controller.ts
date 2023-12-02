import { Controller, Get, Query, Res } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { Response } from 'express';
import { ApiResponse, CustomError } from 'src/common/config/common';
import { ResponseInterviewsDTO } from './dto/response.dto';

@Controller('api/interview')
export class InterviewController {
     /**
     * Nest.js에서 @Res() 데커레이터를 사용하면 Express.js의 원시 Response객체에
     * 접근하기 때문에 return (Next.js 내장 응답처리 메커니즘)을 무시하고,
     * 원시 Express형식으로 응답을 보내야한다.
     */

     constructor(
          private readonly interviewService: InterviewService
     ) {}

     /**
      * @api 메인 페이지 상단부분 API, 디폴트로 9개의 랜덤인터뷰를 가져온다.
      */
     @Get('all')
     async getInterviews(
          @Query('page') page: string,
          @Res() response: Response,
     ) {  
          // 유효성 검사
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          // 0인 경우 1로 바꾸기
          if (page === "0") page = "1";

          try {
               const data = await this.interviewService.getInterviews(Number(page));
               const apiResponse: ApiResponse<ResponseInterviewsDTO> = {
                    status: 200,
                    data
               }
               response.json(apiResponse);
          } catch(error) {
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }

     /**
      * @api 메인 페이지 상단부분 API, 카테고리로 분류한 9개의 랜덤인터뷰를 가져온다.
      */
     @Get('all/category')
     async getInterviewsWithLikeMemberQuestion(
          @Query('page') page: string,
          @Query('category') category: string,
          @Res() response: Response,
     ) {  
          // 유효성 검사
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          if (category === "") throw new CustomError('카테고리가 비었습니다. ', 400);
          // 0인 경우 1로 바꾸기
          if (page === "0") page = "1";

          try {
               const data = await this.interviewService.getInterviewsWithLikeMemberQuestion(Number(page), category);
               const apiResponse: ApiResponse<ResponseInterviewsDTO> = {
                    status: 200,
                    data
               }
               response.json(apiResponse);
          } catch(error) {
               throw new CustomError('알 수 없는 에러 : ' + error,500);
          }
     }
}