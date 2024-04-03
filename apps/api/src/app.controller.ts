import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { CustomError } from './common/config/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    throw new CustomError('에러닷',401);
    return this.appService.getHello();
  }

  @Get('/api/token')
  getToken(@Res() res: Response): void {

    const testToken = jwt.sign({joonbee : '13b4a'}, 'test', { 'expiresIn' : '1h' } );
    res.cookie('joonbee-token',testToken,{
      maxAge: 1000 * 60 * 60,
    });

    res.send('쿠키발급함');
  }


}
