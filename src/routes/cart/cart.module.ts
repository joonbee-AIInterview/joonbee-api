import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { Cart } from "src/entity/cart.entity";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { Question } from "src/entity/question.entity";
import { Category } from "src/entity/category.entity";

@Module({
     imports: [TypeOrmModule.forFeature([
          Cart,
          Question,
          Category,
     ])], 
     controllers: [CartController],
     providers: [CartService],
})

export class CartModule {}