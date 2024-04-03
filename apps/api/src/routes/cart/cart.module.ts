import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { Cart } from "@app/common/db/entity/cart.entity";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { Question } from "@app/common/db/entity/question.entity";
import { Category } from "@app/common/db/entity/category.entity";
import { Member } from "@app/common/db/entity/member.entity";

@Module({
     imports: [TypeOrmModule.forFeature([
          Cart,
          Question,
          Category,
          Member,
     ])], 
     controllers: [CartController],
     providers: [CartService],
})

export class CartModule {}