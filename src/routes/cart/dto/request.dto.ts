import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class RequestMemberQuestionInsertCartDTO {

     @IsNotEmpty({message: 'category가 비어있습니다.'})
     @ApiProperty({ description: 'category 이름' })
     categoryName: string;

     @IsNotEmpty({message: 'subcategory가 비어있습니다.'})
     @ApiProperty({ description: 'subcategory 이름' })
     subcategoryName: string

     @IsNotEmpty({message: '질문 내용이 비어있습니다.'})
     @ApiProperty({ description: '질문 내용' })
     questionContent: string;
}