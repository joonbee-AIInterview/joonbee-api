import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { Question } from '@app/common/db/entity/question.entity';
import { Category } from '@app/common/db/entity/category.entity';
import { Member } from '@app/common/db/entity/member.entity';

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