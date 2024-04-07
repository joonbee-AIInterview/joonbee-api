import { CustomError } from '@app/common/config/common';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('kakao')
export class KakaoController {
    
    @Get('callback')
    async kakaoOAuth(
        @Query() code: string
    ){
        throw new CustomError('테0스트', 400);

        return code;
    }
}
