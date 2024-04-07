import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';


@Injectable()
export class CryptUtils {

    encryptSHA256(str: string ){
        return crypto
                .createHash('sha256')
                .update(str)
                .digest('hex');
    }
}