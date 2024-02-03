import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber } from "class-validator";

export class RequestMemberQuestionInsertCartDTO {

     @ApiProperty({ description: 'question 아이디' })
     questionId: number;

     @ApiProperty({ description: 'category 이름' })
     categoryName: string;

     @ApiProperty({ description: 'subcategory 이름' })
     subcategoryName: string

     @ApiProperty({ description: '질문 내용' })
     questionContent: string;
}


export class RequestInsertCartDTO {
     @Type(() => Number)
     questionId?: number;
     questionContent?: string;
     subcategoryName?: string;
}