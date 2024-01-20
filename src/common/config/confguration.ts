import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { Member } from 'src/entity/member.entity';
import { Category } from 'src/entity/category.entity';
import { Question } from 'src/entity/question.entity';
import { Like } from 'src/entity/like.entity';
import { Interview } from 'src/entity/interview.entity';
import { InterviewAndQuestion } from 'src/entity/and.question.entity';
import { Cart } from 'src/entity/cart.entity';

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