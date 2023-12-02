import { TypeOrmModule } from "@nestjs/typeorm";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { Module } from "@nestjs/common";
import { Interview } from "src/entity/interview.entity";
import { InterviewAndQuestion } from "src/entity/and.question.entity";
import { Category } from "src/entity/category.entity";

@Module({
     imports: [TypeOrmModule.forFeature([
          Interview,
          InterviewAndQuestion,
          Category
     ])],
     controllers: [InterviewController],
     providers: [InterviewService]
   })
   export class InterviewModule {}