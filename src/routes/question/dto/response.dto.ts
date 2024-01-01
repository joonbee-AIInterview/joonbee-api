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


/**
 * 랜덤 GPT 질문 가져오기
 */
export class ResponseGPTQuestionsDTO {
     memberId: string;
     category: string;
     result: ResponseGPTQuestionData[];
}

export class ResponseGPTQuestionData {
     questionId: number;
     subcategoryName: string;
     questionContent: string;
}



/**
 * findMemberCheckQuestions
 */
export class ResponseQuestionsInfoDTO {
     result: ResponseQuestionsData[];
}

export class ResponseQuestionsData {
     questionId: number;
     category: string;
     subcategory: string;
     questionContent: string;
}