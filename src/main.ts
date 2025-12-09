import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe, BadRequestException } from '@nestjs/common';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 4000, process.env.HOST || '0.0.0.0');
  // Enable CORS for websockets and API
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      );
      console.error('Validation errors:', JSON.stringify(errors, null, 2));
      return new BadRequestException(messages.join('; '));
    },
  }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`🔌 WebSocket server is running on: ws://localhost:${port}/wheelers`);
}
bootstrap();
