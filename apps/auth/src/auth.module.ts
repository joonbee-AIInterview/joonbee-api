import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KakaoModule } from './routes/kakao/kakao.module';
import { ConfigModule } from '@app/common/config/config.module';

@Module({
  imports: [KakaoModule, ConfigModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
