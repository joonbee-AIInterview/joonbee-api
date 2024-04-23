import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { CustomExceptionFilter } from '@app/common/config/error.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new CustomExceptionFilter());
  app.setGlobalPrefix('auth');

  await app.listen(4000);
}
bootstrap();
