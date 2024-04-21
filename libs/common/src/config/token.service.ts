
import { Injectable } from "@nestjs/common";
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CustomError, Payload } from "./common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TokenService {
    private readonly TOKEN_KEY;

    constructor(
        private readonly configService: ConfigService
    ){
        this.TOKEN_KEY = this.configService.get<string>('TOKEN_KEY');
    }

    async generateToken(payload: Payload): Promise<[accessToken: string, refreshToken: string]> {
        if(!payload) throw new CustomError("Error creating OAuth token", 401);
        
        const accessToken: string = jwt.sign({joonbee : payload.id}, this.TOKEN_KEY, { 'expiresIn' : '1h' } );
        const refreshToken: string = jwt.sign({joonbee : payload.id}, this.TOKEN_KEY, { 'expiresIn' : '1d' } );
        
        return [accessToken, refreshToken];
    }
    

}