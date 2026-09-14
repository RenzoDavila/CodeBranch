import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { FinancialModule } from './financial/financial.module';
import { HealthController } from './health.controller';
import { WatchlistModule } from './watchlist/watchlist.module';

/**
 * Módulo raíz de la API del Real-Time Financial Dashboard.
 *
 * Compone los cuatro módulos de negocio y registra `AuditLogInterceptor` a
 * nivel de aplicación, de modo que cualquier mutación ejecutada por un
 * `trader` o `admin` queda auditada sin necesidad de decorar cada handler.
 */
@Module({
  imports: [AuthModule, AuditModule, FinancialModule, WatchlistModule],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }],
})
export class AppModule {}
