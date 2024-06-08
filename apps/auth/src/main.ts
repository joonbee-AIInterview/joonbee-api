import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { CustomExceptionFilter } from '@app/common/config/error.filter';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  const configService = app.get(ConfigService);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: configService.get("AUTH_TCP_PORT")
    }
  });

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new CustomExceptionFilter());
  app.setGlobalPrefix('auth');

  await app.startAllMicroservices();
  await app.listen(configService.get("AUTH_PORT"));
}
bootstrap();
