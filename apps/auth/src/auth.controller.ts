import { Controller, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OAuthParam } from './dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('kakao/callback')
  kakaoOAuth(
    @Query() query: OAuthParam
  ): string {
    
    return this.authService.getHello();
  }
}
