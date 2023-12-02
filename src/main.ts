import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { CustomExceptionFilter } from './common/config/error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Cookie Setting
  app.use(cookieParser());
  // Validation Configuration
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new CustomExceptionFilter());

  const config = new DocumentBuilder()
      .setTitle('JoonBee INTERVIEW')
      .setDescription(`For the start of one's career`)
      .setVersion('1.0')
      .addTag('joonbee')
      .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/swagger', app, document);
  
  await app.listen(3030);
}
bootstrap();
