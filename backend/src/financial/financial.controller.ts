import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ALL_ROLES } from '../auth/domain/user-role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MarketMetricsSnapshot } from './domain/market-metric.model';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { DEFAULT_COIN_IDS, DEFAULT_CURRENCY, FinancialService } from './financial.service';

/**
 * Endpoints de datos de mercado (proxy cacheado sobre CoinGecko).
 * Accesible por cualquier rol autenticado.
 */
@Controller('financial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_ROLES)
export class FinancialController {
  /**
   * @param financialService Casos de uso de datos de mercado.
   */
  constructor(private readonly financialService: FinancialService) {}

  /**
   * `GET /financial/metrics?ids=bitcoin,ethereum&currency=usd`
   * Devuelve las métricas de mercado con metadatos de caché (TTL 60 s).
   *
   * @param query Filtros opcionales de activos y divisa.
   * @returns Snapshot de métricas listo para el dashboard.
   */
  @Get('metrics')
  getMetrics(@Query() query: MetricsQueryDto): Promise<MarketMetricsSnapshot> {
    const coinIds = query.ids
      ? query.ids.split(',')
      : [...DEFAULT_COIN_IDS];

    return this.financialService.getMetrics(
      coinIds,
      query.currency ?? DEFAULT_CURRENCY,
    );
  }
}
