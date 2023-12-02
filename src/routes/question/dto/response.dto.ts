/**
 * 줘야하는 공통된 Data
 */
export class ResponseQuestionsWithCategoryData {
     questionId: number;
     categoryId: number;
     questionContent: string;
     subcategoryName: string;
}


// 메인 페이지 하단API DTO
export class ResponseQuestionsDTO {
     total: number;
     result: ResponseQuestionsWithCategoryData[];
}

