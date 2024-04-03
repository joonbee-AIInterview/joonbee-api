import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TypeOrmConfigService } from './config/confguration';

@Module({
  imports:[
      TypeOrmModule.forRootAsync({
        useClass: TypeOrmConfigService
      })
  ],
  controllers: [CommonController],
  providers: [CommonService],
})
export class CommonModule {}
