import { UserRole } from './user-role.enum';

/**
 * Entidad de dominio que representa un usuario del dashboard.
 * Al no existir base de datos real, se persiste en memoria.
 */
export interface User {
  /** Identificador único e inmutable del usuario. */
  readonly id: string;
  /** Correo electrónico usado como identidad legible. */
  readonly email: string;
  /** Nombre a mostrar en la UI. */
  readonly displayName: string;
  /** Rol RBAC asignado al usuario. */
  readonly role: UserRole;
}

/**
 * Payload que se firma dentro del JWT y que se expone en `request.user`
 * una vez que `JwtAuthGuard` valida el token.
 */
export interface SessionPayload {
  /** Subject del JWT: id del usuario. */
  readonly sub: string;
  /** Correo del usuario autenticado. */
  readonly email: string;
  /** Rol efectivo para las validaciones RBAC. */
  readonly role: UserRole;
  /** Nombre a mostrar, replicado para evitar un round-trip extra al repositorio. */
  readonly displayName: string;
}
