
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomError } from "../../common/config/common";
import { Category } from "@app/common/db/entity/category.entity";
import { DataSource, QueryRunner, Repository } from "typeorm";

@Injectable()
export class CategoryService {

     constructor(
          @InjectRepository(Category) private categoryRepository: Repository<Category>,
          private readonly dataSource: DataSource
          ){}

     findAll(): Promise<Category[]> {
          return this.categoryRepository.find();
     }

     async findAllForMember(): Promise<CategoryInfoDTO[]> {
          const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

          try{
               await queryRunner.connect();
               await queryRunner.startTransaction();

               const data = await queryRunner.manager.createQueryBuilder()
                         .select([
                           'mainCategory.id as mainCategoryId',
                           'mainCategory.category_name as mainCategoryName',
                           'mainCategory.category_name_kr as mainCategoryNameKr',

                           'subCategory.id as subCategoryId',
                           'subCategory.category_name as subCategoryName',
                           'subCategory.category_upper_id as subCategoryUpperId',
                           'subCategory.category_name_kr as categoryNameKr'
                         ])
                         .from(Category, 'mainCategory')
                         .leftJoin(Category, 'subCategory', 'mainCategory.id = subCategory.categoryUpperId')
                         .where('mainCategory.categoryUpperId = 0')
                         .orderBy('subCategory.categoryUpperId')
                         .getRawMany();

               await queryRunner.commitTransaction();

               const transformedData: CategoryInfoDTO[] = data.reduce((acc, item) => {

                    let group = acc.find(g => g.id === item.mainCategoryName);

                    if(!group){
                         group = {
                              id: item.mainCategoryName,
                              value: item.mainCategoryNameKr,
                              children: []
                         };

                         acc.push(group);
                    }

                    group.children.push({
                         id: item.subCategoryName,
                         value: item.categoryNameKr
                    }, )

                    return acc;
               },[]);

               return transformedData;

          }catch(error){
               await queryRunner.rollbackTransaction();
               console.error(error);
               throw new CustomError('카테고리 데이터 에러발생',500);
          }finally{
               await queryRunner.release();
          }
     }

}