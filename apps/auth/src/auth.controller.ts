import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OAuthParam, RequestNickNameUpdateDTO } from './dto';
import { Response, Request } from 'express';
import { ApiResponse } from '@app/common/config/common';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  /**
   * @api 카카오 소셜로그인
   * @param query 인가코드
   * @param response 응답객체
   */
  @Get('kakao/callback')
  async kakaoOAuth(
    @Query() query: OAuthParam,
    @Res() response: Response
  ) {
    
    const [accessToken, refreshToken] = await this.authService.kakaoAuthentication(query.code);

    const apiResponse: ApiResponse<boolean> = {
      status: 200,
      data: true
    }

    this.issuingCookies(response, accessToken, refreshToken);
    response.json(apiResponse);
  }
/**
 * @api 네이버 소셜로그인
 * @param query 인가코드
 * @param response 응답객체
 */
  @Get('naver/callback')
  async naverOAuth(
    @Query() query: OAuthParam,
    @Res() response: Response
  ) {

    const [accessToken, refreshToken] = await this.authService.naverAuthentication(query.code);

    const apiResponse: ApiResponse<boolean> = {
      status: 200,
      data: true
    }

    this.issuingCookies(response, accessToken, refreshToken);
    response.json(apiResponse);
  }

  /**
   * @api 구글 소셜로그인
   * @param query 인가코드
   * @param response 응답객체
   */
  @Get('google/callback')
  async googleOAuth(
    @Query() query: OAuthParam,
    @Res() response: Response
  ) {
    const [accessToken, refreshToken] = await this.authService.googleAuthentication(query.code);

    const apiResponse: ApiResponse<boolean> = {
      status: 200,
      data: true
    }

    await this.issuingCookies(response, accessToken, refreshToken);
    response.json(apiResponse);
  }
  /**
   * @api 로그아웃
   * @param response 응답객체
   */
  @Get("login/logout")
  async logout(
    @Res() response: Response
  ){
        response.cookie('joonbee-token', '', {expires: new Date(0), httpOnly: false, sameSite: 'none', secure: false });
        response.cookie('joonbee-token-refresh', '', {expires: new Date(0), httpOnly: true, sameSite: 'none', secure: false});
        const apiResponse: ApiResponse<string> = {
            status: 200,
            data: '성공'
        }

        response.json(apiResponse);
  }

  /**
   * @api 리프레시토큰 재발급
   * @param request 리프레스 토큰을 확인하기 위한 요청 객체
   * @param response 쿠키를 발행하기 위한 응답 객체
   */
  @Get('login/refresh')
  async refreshToken(
    @Req() request: Request,
    @Res() response: Response
  ){
    const refreshToken = request.cookies['joonbee-token-refresh'];
    const [newAccessToken, newRefreshToken] = await this.authService.refreshTokenIssuingTokens(refreshToken);

    response.cookie('joonbee-token', newAccessToken, { httpOnly: false, sameSite: 'none', secure: false });
    response.cookie('joonbee-token-refresh', newRefreshToken, { httpOnly: true, sameSite: 'none', secure: false });

    const apiResponse: ApiResponse<string> = {
      status: 200,
      data: '성공'
    }

    response.json(apiResponse);
  }

  /**
   * 
   * @param dto 닉네임을 변경하기 위한 dto Member의 pk, 그리고 닉네임을 받음
   * @param response 
   */
  @Post('login/nick')
  async nickNameChange(
    @Body() dto: RequestNickNameUpdateDTO,
    @Res() response: Response
  ){

    const [accessToken, refreshToken] = await this.authService.nickNameChangeAuthentication(dto.id, dto.nickName);
    
    const apiResponse: ApiResponse<string> = {
      status: 200,
      data: '성공'
    }

    this.issuingCookies(response, accessToken, refreshToken);
    response.json(apiResponse);

  }

  /**
   * @param response  Response 객체
   * @param accessToken 액세스토큰
   * @param refreshToken  리프레시토큰
   */
  protected async issuingCookies(response: Response, accessToken: string, refreshToken: string): Promise<void>{
    response.cookie('joonbee-token', accessToken, { httpOnly: false, sameSite: 'none', secure: false });
    response.cookie('joonbee-token-refresh', refreshToken, { httpOnly: true, sameSite: 'none', secure: false });
  }
}
