import { Controller, Get, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OAuthParam } from './dto';
import { Response } from 'express';
import { ApiResponse } from '@app/common/config/common';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
