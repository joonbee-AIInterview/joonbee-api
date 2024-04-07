import { Controller, Get, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { Response } from 'express';
import { ResponseInterviewInfoDTO, ResponseInterviewsDTO } from './dto/response.dto';
import { CheckLogin } from './const/check.login';
import { ApiResponse } from '@app/common/config/common';

@Controller('api/interview')
export class InterviewController {

     constructor(
          private readonly interviewService: InterviewService,
     ) {}

     /**
      * interview의 목록들을 9개씩 페이징을 해서 가져오는 코드
      * 
      * @param page 
      * @param category 
      * @param sort 
      * @param response 
      * @author 송재근
      */
     @UseGuards(CheckLogin)
     @Get('all')
     async getInterviews(
          @Query('page') page: string,
          @Query('category') category: string,
          @Query('sort') sort: string,
          @Res() response: Response,
     ) {  
          this.interviewService.validationCheckPage(Number(page));
          this.interviewService.validationCheckSort(sort);

          const memberId = response.locals.memberId; 
          let data;
          if (!category) {
               if (memberId === undefined) {
                    data = await this.interviewService.getInterviewsWithoutMemberId(Number(page), sort);
               } else {
                    await this.interviewService.validationCheckMember(memberId);
                    data = await this.interviewService.getInterviewsWithMemberId(Number(page), memberId, sort);
               }
          } else {
               this.interviewService.validationCheckCategory(category);
               if (memberId === undefined) {
                    data = await this.interviewService.getInterviewsByCategoryWithoutMemberId(Number(page), category, sort);
               } else {
                    await this.interviewService.validationCheckMember(memberId);
                    data = await this.interviewService.getInterviewsByCategoryWithMemberId(Number(page), category, memberId, sort);
               }
          }
          
          const apiResponse: ApiResponse<ResponseInterviewsDTO> = {
               status: 200,
               data
          }
          response.json(apiResponse);
     }

     /**
      * @api 면접정보를 볼 수 있는 api 인증을 하지않은 gpt의 의견은 보지못함
      */
     @Get('detail')
     async interviewDatial(
          @Query('interId', ParseIntPipe) interviewId: number
     ){
          const data: ResponseInterviewInfoDTO = await this.interviewService.interviewInfoData(interviewId);

          const apiResponse: ApiResponse<ResponseInterviewInfoDTO> = {
               status: 200,
               data
          }

          return apiResponse;
     }

}