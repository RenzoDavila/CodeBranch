import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../auth/domain/user-role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditLog } from './domain/audit-log.entity';

/**
 * Endpoints de consulta de la bitácora de auditoría.
 * Reservados exclusivamente al rol `admin`.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  /**
   * @param auditService Casos de uso de la bitácora.
   */
  constructor(private readonly auditService: AuditService) {}

  /**
   * `GET /audit/logs?limit=50`
   * Devuelve la bitácora ordenada del registro más reciente al más antiguo.
   *
   * @param limit Número máximo de registros (opcional).
   * @returns Registros de auditoría.
   */
  @Get('logs')
  findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): AuditLog[] {
    return this.auditService.findAll(limit);
  }
}
