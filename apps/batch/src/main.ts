import { NestFactory } from '@nestjs/core';
import { BatchModule } from './batch.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(BatchModule);
}
bootstrap();
