import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { Question } from 'src/entity/question.entity';
import { Category } from 'src/entity/category.entity';
import { Member } from 'src/entity/member.entity';

@Module({
     imports: [TypeOrmModule.forFeature([
          Question,
          Category,
          Member,
     ])], 
     controllers: [QuestionController],
     providers: [QuestionService],
})

export class QuestionModule {}