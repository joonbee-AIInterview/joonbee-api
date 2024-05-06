import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { verify, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Response, Request } from "express";
import { CustomError } from "@app/common/config/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TokenAuthGuard implements CanActivate {

    constructor(private readonly configService: ConfigService){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();
        const response: Response = context.switchToHttp().getResponse();
        const token = request.cookies?.['joonbee-token'];

        if (!token) {
            throw new CustomError('TOKEN이 없습니다.',401);
        }

        try{
            const decoded = verify(token, this.configService.get<string>('TOKEN_KEY'));
            console.log(decoded.joonbee);
            response.locals.memberId = decoded.joonbee;
            return true; 
        }catch(err){
            if(err instanceof TokenExpiredError){
                console.error(err);
                throw new CustomError('토큰 만료', 402);

            }else if(err instanceof JsonWebTokenError){
                console.error(err);
                throw new CustomError('토큰 이상함',406);
            
            }else{
                console.error(err)
                throw new CustomError('토큰 서버에러',500);
                
            }
            
        }
    }
}