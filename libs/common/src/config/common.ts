export interface ApiResponse<T>{
    status: number;
    data: T;
  }
  
export class CustomError extends Error{
  statusCode: number;
  
  constructor(message: string, statusCode: number){
      super(message);
      this.statusCode = statusCode;
  }
}

export class PageResponseDTO<T>{
   total: number;
   data: T;
}
  