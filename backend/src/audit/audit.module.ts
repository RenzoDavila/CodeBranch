import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import {
  AuditLogRepository,
  InMemoryAuditLogRepository,
} from './repositories/audit-log.repository';

/**
 * Módulo de auditoría.
 *
 * Se marca como `@Global` porque `AuditLogInterceptor` está registrado a
 * nivel de aplicación y necesita `AuditService` en cualquier contexto de
 * ejecución, sin acoplar cada módulo de negocio a la auditoría.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: AuditLogRepository, useClass: InMemoryAuditLogRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}
