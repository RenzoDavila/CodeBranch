import { UserRole } from '../../auth/domain/user-role.enum';

/** Resultado de la operación auditada. */
export type AuditOutcome = 'success' | 'failure';

/**
 * Registro inmutable de una mutación ejecutada sobre la API.
 * Se genera automáticamente por `AuditLogInterceptor`.
 */
export interface AuditLog {
  /** Identificador único del registro. */
  readonly id: string;
  /** Id del usuario que ejecutó la acción. */
  readonly userId: string;
  /** Correo del usuario, para lectura directa en la UI de admin. */
  readonly userEmail: string;
  /** Rol efectivo en el momento de la acción. */
  readonly role: UserRole;
  /** Verbo HTTP de la mutación (`POST`, `PUT`, `PATCH`, `DELETE`). */
  readonly action: string;
  /** Ruta afectada (ej. `/watchlist/abc-123`). */
  readonly resource: string;
  /** Código HTTP con el que se resolvió la petición. */
  readonly statusCode: number;
  /** Si la operación terminó correctamente o con error. */
  readonly outcome: AuditOutcome;
  /** Cuerpo enviado, saneado de campos sensibles. `null` si no hubo cuerpo. */
  readonly payload: Record<string, unknown> | null;
  /** Fecha ISO de la acción. */
  readonly timestamp: string;
}

/**
 * Datos necesarios para crear un `AuditLog`.
 * El repositorio se encarga de generar `id` y `timestamp`.
 */
export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'timestamp'>;
