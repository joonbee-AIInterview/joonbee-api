import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { DbModule } from './db/db.module';
import { ConfigModule } from './config/config.module';

@Module({
  providers: [CommonService],
  exports: [CommonService],
  imports: [DbModule, ConfigModule],
})
export class CommonModule {}
