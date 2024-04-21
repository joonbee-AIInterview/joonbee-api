import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { Member } from '@app/common/db/entity/member.entity';
import { Category } from '@app/common/db/entity/category.entity';
import { Question } from '@app/common/db/entity/question.entity';
import { Like } from '@app/common/db/entity/like.entity';
import { Interview } from '@app/common/db/entity/interview.entity';
import { InterviewAndQuestion } from '@app/common/db/entity/and.question.entity';
import { Cart } from '@app/common/db/entity/cart.entity';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {

    constructor(private readonly configService: ConfigService){}

    createTypeOrmOptions(): TypeOrmModuleOptions {
        return {
            "type": 'mariadb',
            "host": this.configService.get<string>('DATABASE_HOST'),
            "port": this.configService.get<number>('DATABASE_PORT'),
            "username": this.configService.get<string>('DATABASE_USERNAME'),
            "password": this.configService.get<string>('DATABASE_PASSWORD'),
            "database": this.configService.get<string>('DATABASE_DB'),
            "entities": [Member, Category, Question, Like, Interview, InterviewAndQuestion, Cart],
            "synchronize": false,
            "logging": true
        };
    }
}