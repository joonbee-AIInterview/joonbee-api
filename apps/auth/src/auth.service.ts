import { CustomError, Payload } from '@app/common/config/common';
import { CryptUtils } from '@app/common/config/crypt';
import { TokenService } from '@app/common/config/token.service';
import { Member } from '@app/common/db/entity/member.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DataSource, QueryRunner } from 'typeorm';
import { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private readonly cryptUtils: CryptUtils,
              private readonly configService: ConfigService,
              private readonly dataSource: DataSource,
              private readonly tokenService: TokenService
    ){}
  
  getHello(): string {
    return 'Hello World!';
  }

  async naverAuthentication(code: string): Promise<[accessToken: string, refreshToken: string]> {
    const tempPwd = "1234";
    
    const NAVER_CLIENTID = this.configService.get<string>('NAVER_CLIENTID');
    const NAVER_CLIENTSECRET = this.configService.get<string>('NAVER_CLIENTSECRET');
    const NAVER_TOKEN_URL = this.configService.get<string>('NAVER_TOKEN_URL'); 
    const NAVER_USERINFO_URL = this.configService.get<string>('NAVER_USERINFO_URL');

    const { data } = await axios.post(NAVER_TOKEN_URL, null,{
      params: {
          grant_type: 'authorization_code',
          client_id: NAVER_CLIENTID,
          client_secret: NAVER_CLIENTSECRET,
          code: code
      },
      headers: {
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      }
    });
    
    const accessToken = data.access_token;

    const userInfoRequest = await axios.get(NAVER_USERINFO_URL,{
      headers: {
          Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userInfoRequest.data.response;
   
    let payload: Payload = {
        id: userData.id,
        email: userData.email,
        password: this.cryptUtils.encryptSHA256(tempPwd),
        thumbnail: userData.profile_image,
        loginType: 'NAVER'
    }

    payload = await this.handleNullCheck(payload);

    return this.generateToken(payload);
  }

  async kakaoAuthentication(code: string): Promise<[accessToken: string, refreshToken: string]> {
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

    const kakaoAccessToken = data.access_token;
    const userInfoRequest = await axios.get(KAKAO_USERINFO_URL,{
      headers: {
          Authorization: `Bearer ${kakaoAccessToken}`,
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

    return this.generateToken(payLoad);
  }

  async googleAuthentication(code: string): Promise<[accessToken: string, refreshToken: string]> {
    const tempPwd = "1234";
    
    const GOOGLE_CLIENTID = this.configService.get<string>('GOOGLE_CLIENTID');
    const GOOGLE_CLIENTSECRET = this.configService.get<string>('GOOGLE_CLIENTSECRET');
    const GOOGLE_TOKEN_URL = this.configService.get<string>('GOOGLE_TOKEN_URL'); 
    const GOOGLE_USERINFO_URL = this.configService.get<string>('GOOGLE_USERINFO_URL');

    const { data } = await axios.post(GOOGLE_TOKEN_URL, null,{
      params: {
          grant_type: 'authorization_code',
          client_id: GOOGLE_CLIENTID,
          client_secret: GOOGLE_CLIENTSECRET,
          code: code
      },
      headers: {
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      }
    });
    
    const accessToken = data.access_token;

    const userInfoRequest = await axios.get(GOOGLE_USERINFO_URL,{
      headers: {
          Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userInfoRequest.data.response;
   
    let payload: Payload = {
        id: userData.id,
        email: userData.email,
        password: this.cryptUtils.encryptSHA256(tempPwd),
        thumbnail: userData.profile_image,
        loginType: 'GOOGLE'
    }

    payload = await this.handleNullCheck(payload);

    return this.generateToken(payload);
  }

  async refreshTokenIssuingTokens(refreshToken: string) {
    const payloadData: JwtPayload = await this.tokenService.verifyToken(refreshToken);
    return await this.tokenService.refreshGenerateToken(payloadData.id);
  }

  async generateToken(param: Payload){
    let payload = await this.handleNullCheck(param);

    const { exists, nickName } = await this.existMember(payload.id);
    // 첫 로그인일 시
    if(!exists) await this.insertMember(payload);
    if(!nickName) throw new CustomError(payload.id, 410);
    
    return await this.tokenService.generateToken(payload);
  }

  async insertMember(payLoad: Payload){
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    try{
      await queryRunner.connect();
      
      const memberObj = queryRunner.manager.create(Member, {
          id: payLoad.id,
          email: payLoad.email,
          password: payLoad.password,
          thumbnail: payLoad.thumbnail,
          loginType: payLoad.loginType
      });

      await queryRunner.manager.save(Member, memberObj);
      
      throw new CustomError(payLoad.id, 410);

    }catch(err) {
      throw new CustomError(payLoad.id, 410);
    }finally{
      await queryRunner.release();
    }
  }

  async existMember(id: string){
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
      console.log(rowDatePacket);
      return {
        exists: !!exists,
        nickName: !!rowDatePacket.nickName
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
