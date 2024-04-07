import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule as CostomConfigModule } from '@app/common/config/config.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CostomConfigModule, ConfigModule ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
