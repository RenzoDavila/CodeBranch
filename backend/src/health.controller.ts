import { Controller, Get } from '@nestjs/common';

/**
 * Respuesta del chequeo de salud de la API.
 */
interface HealthStatus {
  /** Estado general del servicio. */
  readonly status: 'ok';
  /** Nombre del servicio. */
  readonly service: string;
  /** Fecha ISO del chequeo. */
  readonly timestamp: string;
}

/**
 * Endpoint público de salud, útil para verificar que la API está levantada
 * antes de configurar el frontend.
 */
@Controller()
export class HealthController {
  /**
   * `GET /health`
   * @returns Estado actual del servicio.
   */
  @Get('health')
  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'real-time-financial-dashboard-api',
      timestamp: new Date().toISOString(),
    };
  }
}
