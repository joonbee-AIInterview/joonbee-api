import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseOptionalArrayPipe implements PipeTransform<string, string[]> {

     transform(value: string, metadata: ArgumentMetadata): string[] {
          if (!value) return [];
          const subcategories = value.split(',').map(subcategory => subcategory.trim());
          return subcategories;
     }
}