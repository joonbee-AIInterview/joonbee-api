/**
 * 줘야하는 공통된 Data
 */
export class ResponseInterviewsWithLikeMemberQuestionData {
     liked: boolean;
     interviewId: number;
     memberId: string;
     nickname: string;
     thumbnail: string;
     categoryName: string;
     likeCount: number;
     subCategoryName: string[];
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

export class ResponseInterviewInfoDTO {
     memberThumnbail: string;
     memberNickName: string;
     questionContents: ResponseQuestionInfo[];
     categoryName: string;
     likeCount: number;
}

export interface ResponseQuestionInfo{
     questionId: number;
     questionContent: string;
     commentary: string;
     evaluation: string;
     answerContent: string;
 }
 