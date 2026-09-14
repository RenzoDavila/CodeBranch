import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, CreateAuditLogInput } from './domain/audit-log.entity';
import { AuditLogRepository } from './repositories/audit-log.repository';

/** Claves que nunca deben quedar registradas en la bitácora. */
const SENSITIVE_KEYS: readonly string[] = Object.freeze([
  'password',
  'token',
  'accessToken',
  'authorization',
  'secret',
]);

/**
 * Casos de uso de la bitácora de auditoría.
 * Concentra el saneado de payloads y el acceso de lectura para administradores.
 */
@Injectable()
export class AuditService {
  /** Logger contextualizado. */
  private readonly logger = new Logger(AuditService.name);

  /**
   * @param repository Repositorio de bitácora (implementación en memoria).
   */
  constructor(private readonly repository: AuditLogRepository) {}

  /**
   * Registra una acción auditable.
   * @param input Datos de la acción, ya resueltos por el interceptor.
   * @returns El registro persistido.
   */
  record(input: CreateAuditLogInput): AuditLog {
    const log = this.repository.create({
      ...input,
      payload: this.sanitizePayload(input.payload),
    });

    this.logger.log(
      `${log.role}:${log.userEmail} -> ${log.action} ${log.resource} (${log.statusCode})`,
    );

    return log;
  }

  /**
   * Lista la bitácora completa, del registro más reciente al más antiguo.
   * @param limit Número máximo de registros a devolver.
   * @returns Registros de auditoría.
   */
  findAll(limit?: number): AuditLog[] {
    return this.repository.findAll(limit);
  }

  /**
   * Lista los registros generados por un usuario.
   * @param userId Id del usuario.
   * @returns Registros de auditoría de ese usuario.
   */
  findByUser(userId: string): AuditLog[] {
    return this.repository.findByUserId(userId);
  }

  /**
   * Elimina los campos sensibles de un payload antes de persistirlo.
   * @param payload Cuerpo original de la petición.
   * @returns Copia saneada, o `null` si no había cuerpo relevante.
   */
  private sanitizePayload(
    payload: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!payload || Object.keys(payload).length === 0) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) =>
        SENSITIVE_KEYS.includes(key) ? [key, '[REDACTED]'] : [key, value],
      ),
    );
  }
}
