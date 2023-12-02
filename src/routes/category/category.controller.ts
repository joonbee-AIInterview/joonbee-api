import { Body, Controller, Get, Post } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { Category } from "src/entity/category.entity";


@Controller('category')
export class CategoryController {

     constructor(private readonly categoryService: CategoryService){}

     @Get('list')
     async findAll(): Promise<Category[]> {
          const categoryList = await this.categoryService.findAll();
          return Object.assign({
               data: categoryList,
               statusCode: 200,
               statusMsg: `findAll을 이용한 데이터 조회가 성공적으로 완료되었습니다.`,
          });
     }
}