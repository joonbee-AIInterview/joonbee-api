import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { Member } from '@app/common/db/entity/member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from '@app/common/db/entity/interview.entity';
import { Like } from '@app/common/db/entity/like.entity';
import { InterviewAndQuestion } from '@app/common/db/entity/and.question.entity';
import { Category } from '@app/common/db/entity/category.entity';
import { Cart } from '@app/common/db/entity/cart.entity';
import { RedisService } from '../../common/config/redis.config';

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
