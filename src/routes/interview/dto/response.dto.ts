/**
 * 줘야하는 공통된 Data
 */
export class ResponseInterviewsWithLikeMemberQuestionData {
     interviewId: number;
     memberId: string;
     thumbnail: string;
     categoryName: string;
     likeCount: number;
}
export class ResponseQuestionData {
     questionId: number;
     questionContent: string;
}

// 메인 페이지 상단API 디폴트 DTO
export class ResponseInterviewsDTO {
     total: number;
     result: ResponseInterviewsWithLikeMemberQuestionData[];
}