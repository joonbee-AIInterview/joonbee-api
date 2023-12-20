import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { Response } from 'express';
import { ApiResponse, CustomError } from 'src/common/config/common';
import { ResponseInterviewsDTO } from './dto/response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/entity/category.entity';
import { Repository } from 'typeorm';
import { CheckLogin } from './const/check.login';

@Controller('api/interview')
export class InterviewController {
     /**
     * Nest.js에서 @Res() 데커레이터를 사용하면 Express.js의 원시 Response객체에
     * 접근하기 때문에 return (Next.js 내장 응답처리 메커니즘)을 무시하고,
     * 원시 Express형식으로 응답을 보내야한다.
     */

     constructor(
          private readonly interviewService: InterviewService,
          // 유효성 검사용
          @InjectRepository(Category)
          private readonly categoryRepository: Repository<Category>,
     ) {}

     /**
      * @api 메인 페이지 상단부분 API
      */
     @UseGuards(CheckLogin)
     @Get('all')
     async getInterviews(
          @Query('page') page: string,
          @Query('category') category: string,
          @Query('sort') sort: string,
          @Res() response: Response,
     ) {  
          if (page === "") throw new CustomError('페이지가 비었습니다. ', 400);
          if (!['latest', 'like'].includes(sort)) throw new CustomError('정렬기준이 틀렸습니다. ', 400);
          if (page === "0") page = "1";
          let data;
          const memberId = response.locals.memberId;

          try {
               if (category === "") { 
                    data = await this.interviewService.getInterviews(Number(page), memberId, sort);
               } else {
                    const check = await this.categoryRepository.findOne({
                         where: {
                              categoryName: category,
                         },
                    });
                    if (!check || check.categoryLevel !== 0) throw new CustomError('데이터베이스에 존재하지 않는 상위카테고리입니다. ', 404);
                    data = await this.interviewService.getInterviewsWithLikeMemberQuestion(Number(page), memberId, category, sort);
               }
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