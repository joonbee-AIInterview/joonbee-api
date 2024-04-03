import { TypeOrmModule } from "@nestjs/typeorm";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { Module } from "@nestjs/common";
import { Interview } from "@app/common/db/entity/interview.entity";
import { InterviewAndQuestion } from "@app/common/db/entity/and.question.entity";
import { Category } from "@app/common/db/entity/category.entity";
import { Member } from "@app/common/db/entity/member.entity";

@Module({
     imports: [TypeOrmModule.forFeature([
          Interview,
          InterviewAndQuestion,
          Category,
          Member
     ])],
     controllers: [InterviewController],
     providers: [InterviewService]
   })
   export class InterviewModule {}