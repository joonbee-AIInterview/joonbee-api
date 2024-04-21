import { Module } from '@nestjs/common';
import { CustomExceptionFilter } from './error.filter';
import { CryptUtils } from './crypt';
import { TokenService } from './token.service';
import { TypeOrmConfigService } from './db.config';

@Module({
    providers: [CustomExceptionFilter, CryptUtils, TokenService, TypeOrmConfigService],
    exports: [CustomExceptionFilter, CryptUtils, TokenService]
})
export class ConfigModule {}
