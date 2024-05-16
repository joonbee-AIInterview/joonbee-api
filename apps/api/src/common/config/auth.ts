import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { verify, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Response, Request } from "express";
import { CustomError } from "@app/common/config/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TokenAuthGuard implements CanActivate {
    private readonly logger = new Logger(TokenAuthGuard.name);

    constructor(private readonly configService: ConfigService){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();
        const response: Response = context.switchToHttp().getResponse();
        const token = request.cookies?.['joonbee-token'];

        if (!token) {
            throw new CustomError('',401);
        }

        try{
            const decoded = verify(token, this.configService.get<string>('TOKEN_KEY'));
            this.logger.debug(decoded.joonbee);
            response.locals.memberId = decoded.joonbee;
            return true; 
        }catch(err){
            if(err instanceof TokenExpiredError){
                console.error(err);
                throw new CustomError('토큰 만료', 403);

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