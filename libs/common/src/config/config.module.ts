import { Module } from '@nestjs/common';
import { CustomExceptionFilter } from './error.filter';

@Module({
    providers: [CustomExceptionFilter],
    exports: [CustomExceptionFilter]
})
export class ConfigModule {}
