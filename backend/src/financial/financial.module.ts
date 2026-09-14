import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { CoinGeckoClient } from './infrastructure/coingecko.client';

/**
 * Módulo de datos de mercado.
 * Expone `FinancialService` para que otros módulos (ej. watchlist) puedan
 * enriquecer sus respuestas con precios sin duplicar llamadas al proveedor.
 */
@Module({
  controllers: [FinancialController],
  providers: [FinancialService, CoinGeckoClient],
  exports: [FinancialService],
})
export class FinancialModule {}
