import { Body, Controller, Get, Post } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { Category } from "@app/common/db/entity/category.entity";
import { ApiResponse } from "@app/common/config/common";


@Controller('/api/category')
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

     @Get()
     async getMainAndSub() {
          const data:CategoryInfoDTO[] = await this.categoryService.findAllForMember();

          const apiResponse: ApiResponse<CategoryInfoDTO[]> = {
               status: 200,
               data
          }

          return data;
     }

     
}