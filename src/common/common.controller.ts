import { CommonService } from './common.service';
import { Controller } from '@nestjs/common';

@Controller('common')
export class CommonController {
    constructor(private readonly commonService: CommonService){}
}
