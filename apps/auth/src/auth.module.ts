import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule as CostomConfigModule } from '@app/common/config/config.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@app/common/config/db.config';

@Module({
  imports: [
    CostomConfigModule, 
    ConfigModule,  
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService
    }),
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),  
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
