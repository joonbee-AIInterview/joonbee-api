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

    response.cookie('joonbee-token', accessToken, { httpOnly: false, sameSite: 'none', secure: true });
    response.cookie('joonbee-token-refresh', refreshToken, { httpOnly: true, sameSite: 'none', secure: true });

    console.log(accessToken);
    response.json(apiResponse);
  }

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

    response.cookie('joonbee-token', accessToken, { httpOnly: false, sameSite: 'none', secure: true });
    response.cookie('joonbee-token-refresh', refreshToken, { httpOnly: true, sameSite: 'none', secure: true });

    response.json(apiResponse);
  }

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

    response.cookie('joonbee-token', accessToken, { httpOnly: false, sameSite: 'none', secure: true });
    response.cookie('joonbee-token-refresh', refreshToken, { httpOnly: true, sameSite: 'none', secure: true });

    console.log(accessToken);
    response.json(apiResponse);
  }

  @Get("login/logout")
  async logout(
    @Res() response: Response
  ){
        response.cookie('joonbee-token', '', {expires: new Date(0), httpOnly: false, sameSite: 'none', secure: true });
        response.cookie('joonbee-token-refresh', '', {expires: new Date(0), httpOnly: true, sameSite: 'none', secure: true});

        const apiResponse: ApiResponse<string> = {
            status: 200,
            data: '성공'
        }

        response.json(apiResponse);
  }

  @Get('login/refresh')
  async refreshToken(
    @Req() request: Request,
    @Res() response: Response
  ){
    const refreshToken = request.cookies['joonbee-token-refresh'];
    const [newAccessToken, newRefreshToken] = await this.authService.refreshTokenIssuingTokens(refreshToken);

    response.cookie('joonbee-token', newAccessToken, { httpOnly: false, sameSite: 'none', secure: true });
    response.cookie('joonbee-token-refresh', newRefreshToken, { httpOnly: true, sameSite: 'none', secure: true });

    const apiResponse: ApiResponse<string> = {
      status: 200,
      data: '성공'
    }

    response.json(apiResponse);
  }

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

    response.cookie('joonbee-token', accessToken, { httpOnly: false, sameSite: 'none', secure: true });
    response.cookie('joonbee-token-refresh', refreshToken, { httpOnly: true, sameSite: 'none', secure: true });
    response.json(apiResponse);

  }
}
