import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { CustomError } from "src/common/config/common";

@Injectable()
export class ParseOptionalArrayPipe implements PipeTransform<string, string[]> {

     transform(value: string, metadata: ArgumentMetadata): string[] {
          if (!value) return [];
          const subcategories = value.split(',').map(subcategory => subcategory.trim());
          if (subcategories.some(subcategory => !subcategory)) throw new CustomError('쉼표 앞뒤로 subcategory를 입력해주세요. ', 400);
          return subcategories;
     }
}