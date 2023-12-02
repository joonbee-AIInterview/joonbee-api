import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { Member } from 'src/entity/member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from 'src/entity/interview.entity';
import { Like } from 'src/entity/like.entity';
import { InterviewAndQuestion } from 'src/entity/and.question.entity';
import { Category } from 'src/entity/category.entity';
import { Cart } from 'src/entity/cart.entity';
import { RedisService } from 'src/common/config/redis.config';

@Module({
  imports: [TypeOrmModule.forFeature([
      Member,
      Like,
      Interview,
      InterviewAndQuestion,
      Category,
      Cart
    ])],
  controllers: [MemberController],
  providers: [
    MemberService,
    RedisService
  ]
})
export class MemberModule {}
