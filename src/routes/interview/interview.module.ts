import { TypeOrmModule } from "@nestjs/typeorm";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { Module } from "@nestjs/common";
import { Interview } from "src/entity/interview.entity";
import { InterviewAndQuestion } from "src/entity/and.question.entity";
import { Category } from "src/entity/category.entity";
import { Member } from "src/entity/member.entity";

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