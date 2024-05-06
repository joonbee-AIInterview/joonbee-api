
import { Injectable } from "@nestjs/common";
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { CustomError, Payload } from "./common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TokenService {
    private readonly TOKEN_KEY;
    private readonly ACCESS_TOKEN_EXPIRESIN;
    private readonly REFRESH_TOKEN_EXPIRESIN;

    constructor(
        private readonly configService: ConfigService
    ){
        this.TOKEN_KEY = this.configService.get<string>('TOKEN_KEY');
        this.ACCESS_TOKEN_EXPIRESIN = '1h';
        this.REFRESH_TOKEN_EXPIRESIN = '1d';
    }

    async generateToken(payload: Payload): Promise<[accessToken: string, refreshToken: string]> {
        if(!payload) throw new CustomError("Error creating OAuth token", 401);
        
        const accessToken: string = jwt.sign({joonbee : payload.id}, this.TOKEN_KEY, { 'expiresIn' : this.ACCESS_TOKEN_EXPIRESIN } );
        const refreshToken: string = jwt.sign({joonbee : payload.id}, this.TOKEN_KEY, { 'expiresIn' : this.REFRESH_TOKEN_EXPIRESIN } );
        
        return [accessToken, refreshToken];
    }

    async verifyToken(token: string): Promise<jwt.JwtPayload> {
        try{
            const payload = jwt.verify(token, this.TOKEN_KEY);
            return payload;
        }catch(error){
            throw new CustomError('Error during token interpretation', 500);
        }
    }

    async refreshGenerateToken(id: string): Promise<[accessToken: string, refreshToken: string]> {
        if(!id) throw new CustomError("Attempting to issue refresh token, id value is empty", 401);

        const accessToken: string = jwt.sign({joonbee: id}, this.TOKEN_KEY, { 'expiresIn' : this.ACCESS_TOKEN_EXPIRESIN });
        const refreshToken: string = jwt.sign({joonbee: id}, this.TOKEN_KEY, { 'expiresIn' : this.REFRESH_TOKEN_EXPIRESIN });

        return [accessToken, refreshToken];
    }
}