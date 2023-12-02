
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "src/entity/category.entity";
import { Repository } from "typeorm";

@Injectable()
export class CategoryService {

     constructor(@InjectRepository(Category) private categoryRepository: Repository<Category>){}
     
     // async saveCategory(category: Category): Promise<void> {
     //      await this.categoryRepository.save(category);
     // }

     findAll(): Promise<Category[]> {
          return this.categoryRepository.find();
     }

     // findOne() {
     //      return this.categoryRepository.findOne();
     // }
}