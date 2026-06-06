import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  const port = process.env.PORT || 3001;
  // Use host '0.0.0.0' to ensure Fastify binds correctly inside docker containers
  await app.listen(port, '0.0.0.0');
  console.log(`🟢 Chat Service running on port ${port} with Fastify`);
}
bootstrap();
