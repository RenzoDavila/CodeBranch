import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditLog, CreateAuditLogInput } from '../domain/audit-log.entity';

/**
 * Contrato del repositorio de bitácora de auditoría.
 */
export abstract class AuditLogRepository {
  /**
   * Persiste un nuevo registro de auditoría.
   * @param input Datos de la acción auditada.
   * @returns El registro creado, con `id` y `timestamp` asignados.
   */
  abstract create(input: CreateAuditLogInput): AuditLog;

  /**
   * Lista la bitácora ordenada del registro más reciente al más antiguo.
   * @param limit Número máximo de registros a devolver.
   * @returns Registros de auditoría.
   */
  abstract findAll(limit?: number): AuditLog[];

  /**
   * Lista los registros de un usuario concreto.
   * @param userId Id del usuario.
   * @returns Registros de auditoría de ese usuario.
   */
  abstract findByUserId(userId: string): AuditLog[];
}

/** Máximo de registros retenidos en memoria (evita crecimiento ilimitado). */
const MAX_RETAINED_LOGS = 500;

/**
 * Implementación en memoria de la bitácora de auditoría.
 *
 * Usa un array como *ring buffer* acotado a `MAX_RETAINED_LOGS`: al ser un
 * almacén volátil de proceso, se descartan los registros más antiguos en
 * lugar de consumir memoria sin límite.
 */
@Injectable()
export class InMemoryAuditLogRepository extends AuditLogRepository {
  /** Almacén en memoria, ordenado del más antiguo al más reciente. */
  private readonly logs: AuditLog[] = [];

  /**
   * Persiste un nuevo registro de auditoría.
   * @param input Datos de la acción auditada.
   * @returns El registro creado.
   */
  create(input: CreateAuditLogInput): AuditLog {
    const log: AuditLog = {
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(log);

    if (this.logs.length > MAX_RETAINED_LOGS) {
      this.logs.shift();
    }

    return log;
  }

  /**
   * Lista la bitácora del registro más reciente al más antiguo.
   * @param limit Número máximo de registros a devolver.
   * @returns Registros de auditoría.
   */
  findAll(limit?: number): AuditLog[] {
    const ordered = [...this.logs].reverse();
    return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
  }

  /**
   * Lista los registros de un usuario concreto.
   * @param userId Id del usuario.
   * @returns Registros de auditoría de ese usuario.
   */
  findByUserId(userId: string): AuditLog[] {
    return this.findAll().filter((log) => log.userId === userId);
  }
}
