import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ConfigModule as ORMConfigModule } from '@nestjs/config';
import { MemberModule } from './routes/member/member.module';
import { QuestionModule } from './routes/question/question.module';
import { CategoryModule } from './routes/category/category.module';
import { InterviewModule } from './routes/interview/interview.module';
import { CartModule } from './routes/cart/cart.module';
import { ConfigModule } from '@app/common/config/config.module';

@Module({
  imports: [
    CommonModule,
    ORMConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
    MemberModule,
    QuestionModule,
    CategoryModule,
    InterviewModule,
    CartModule,
    ConfigModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
