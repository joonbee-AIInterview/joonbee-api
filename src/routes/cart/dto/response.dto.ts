import { Type } from "class-transformer";
import { IsNumber } from "class-validator";

/**
 * 줘야하는 공통된 Data
 */
export class ResponseCartQuestionsOfMemberData {
     questionId: number;
     category: string;
     subcategory: string;
     questionContent: string;
}


// 면접 전, 사용자의 장바구니에 담긴 질문 DTO
export class ResponseCartQuestionsDTO {
     total: number;
     result: ResponseCartQuestionsOfMemberData[];
}
