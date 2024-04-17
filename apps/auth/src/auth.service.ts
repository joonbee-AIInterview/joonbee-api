import { CustomError, Payload } from '@app/common/config/common';
import { CryptUtils } from '@app/common/config/crypt';
import { Member } from '@app/common/db/entity/member.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(private readonly cryptUtils: CryptUtils,
              private readonly configService: ConfigService,
              private readonly dataSource: DataSource
    ){}
  
  getHello(): string {
    return 'Hello World!';
  }

  async kakaoAuthentication(code: string) {
    const tempPwd = "1234";

    const CLIENT_ID = this.configService.get<string>('KAKAO_CLIENTID');
    const CLIENT_SECRET = this.configService.get<string>('KAKAO_CLIENTSECRET');
    const KAKAO_TOKEN_URL = this.configService.get<string>('KAKAO_TOKEN_URL'); 
    const KAKAO_USERINFO_URL = this.configService.get<string>('KAKAO_USERINFO_URL');

    const { data } = await axios.post(KAKAO_TOKEN_URL, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      },
      headers: {
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      }
    });

    const accessToken = data.access_token;
    const userInfoRequest = await axios.get(KAKAO_USERINFO_URL,{
      headers: {
          Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userInfoRequest.data.kakao_account;
    let payLoad: Payload = {
      id: userInfoRequest.data.id,
      email: userData.email,
      password: this.cryptUtils.encryptSHA256(tempPwd),
      thumbnail: userData.profile.thumbnail_image_url,
      loginType: 'KAKAO'
    }

    payLoad = await this.handleNullCheck(payLoad);
  }

  async existMembe(id: string){
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    try{
      await queryRunner.connect();
      
      const rowDatePacket = await queryRunner.manager.createQueryBuilder()
                .select([
                   'count(*) as cnt',
                   'nick_name as nickName'
                ])
                .from(Member, 'm')
                .where('id = :id', { id })
                .getRawOne();
              
      const exists = Number(rowDatePacket.cnt);

      return {
        exists: !!exists,
        nickName: rowDatePacket.nickName
      }

    }catch(err) {
      throw new CustomError('Error Checking Member presence', 500);
    }finally {
      await queryRunner.release();
    }
  }

  async handleNullCheck(payLoad: Payload): Promise<Payload> {
    if(payLoad.id == null ) throw new CustomError('id 존재하지 않음', 401);
    return {
        id : payLoad.id ? payLoad.id : 'NONE',
        email : payLoad.email ? payLoad.email : 'NONE',
        password : payLoad.password ? payLoad.password : 'NONE',
        thumbnail : payLoad.thumbnail ? payLoad.thumbnail : 'NONE', 
        loginType: payLoad.loginType
    };
  }
}
