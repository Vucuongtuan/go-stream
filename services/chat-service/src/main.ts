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

  // Enable service-level CORS only when explicitly requested.
  // When running behind Nginx (recommended), keep this disabled so Nginx
  // exclusively manages CORS headers and preflight responses.
  const enableServiceCors = process.env.ENABLE_SERVICE_CORS === 'true';
  if (enableServiceCors) {
    app.enableCors({
      origin: '*',
      methods: 'GET,POST,PUT,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization',
    });
    console.log('⚙️  Chat Service: service-level CORS enabled');
  }

  const port = process.env.PORT || 3001;
  // Use host '0.0.0.0' to ensure Fastify binds correctly inside docker containers
  await app.listen(port, '0.0.0.0');
  console.log(`🟢 Chat Service running on port ${port} with Fastify`);
}
bootstrap();
