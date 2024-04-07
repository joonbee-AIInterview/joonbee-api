import { CryptUtils } from '@app/common/config/crypt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly cryptUtils: CryptUtils,
              private readonly configService: ConfigService
    ){}
  
  getHello(): string {
    return 'Hello World!';
  }

  async kakaoAuthentication() {

  }

}
