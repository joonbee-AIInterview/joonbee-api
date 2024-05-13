import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { verify, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Response, Request } from "express";
import { CustomError } from "@app/common/config/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CheckLogin implements CanActivate {
     constructor(private readonly configService: ConfigService){}
     async canActivate(context: ExecutionContext): Promise<boolean> {

          const request: Request = context.switchToHttp().getRequest();
          const response: Response = context.switchToHttp().getResponse();
          const token = request.cookies?.['joonbee-token'];
          if (!token) return true;

          try{
               const decoded = verify(token, this.configService.get<string>('TOKEN_KEY'));
               response.locals.memberId = decoded.joonbee;
               return true;
          }catch(error){
               if(error instanceof TokenExpiredError){
                    console.error(error);
                    throw new CustomError('토큰 이상 에러', 403);
               }else if(error instanceof JsonWebTokenError){
                    console.error(error);
                    throw new CustomError('토큰 이상 에러', 406);
               }
          }
     }
}