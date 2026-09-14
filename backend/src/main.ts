import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Puerto por defecto de la API. */
const DEFAULT_PORT = 3000;

/**
 * Punto de entrada de la aplicación.
 *
 * Habilita CORS para el frontend Angular, registra la validación global de
 * DTOs y arranca el servidor HTTP.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();
