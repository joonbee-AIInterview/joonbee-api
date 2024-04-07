import { Module } from '@nestjs/common';
import { CustomExceptionFilter } from './error.filter';
import { CryptUtils } from './crypt';

@Module({
    providers: [CustomExceptionFilter, CryptUtils],
    exports: [CustomExceptionFilter, CryptUtils]
})
export class ConfigModule {}
