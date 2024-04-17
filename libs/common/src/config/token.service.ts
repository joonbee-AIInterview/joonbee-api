
import { Injectable } from "@nestjs/common";
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CustomError, Payload } from "./common";

@Injectable()
export class TokenService {
    private readonly TOKEN_KEY;

    constructor(){
        this.TOKEN_KEY = "joonbee-key-!@#$";
    }

    async generateToken(payload: Payload) {
        if(!payload) throw new CustomError("Error creating OAuth token", 401);
        
        const accessToken: string = jwt.sign({joonbee : payload.id}, this.TOKEN_KEY, { 'expiresIn' : '1h' } );
        const refreshToken: string = jwt.sign({joonbee : payload.id}, this.TOKEN_KEY, { 'expiresIn' : '1d' } );
        
        return [accessToken, refreshToken];
    }
    

}