/**
 * Roles RBAC soportados por el dashboard. Deben coincidir con el enum del backend.
 */
export type UserRole = 'viewer' | 'trader' | 'admin';

/**
 * Lista inmutable de roles válidos, usada por el selector de sesión y el RoleGuard.
 */
export const USER_ROLES: readonly UserRole[] = Object.freeze([
  'viewer',
  'trader',
  'admin',
]);

/**
 * Roles autorizados a mutar la watchlist.
 */
export const MUTATION_ROLES: readonly UserRole[] = Object.freeze([
  'trader',
  'admin',
]);

/**
 * Perfil público del usuario autenticado, tal como lo devuelve el backend.
 */
export interface User {
  /** Identificador único del usuario semilla. */
  readonly id: string;
  /** Correo de identidad. */
  readonly email: string;
  /** Nombre a mostrar en la cabecera. */
  readonly displayName: string;
  /** Rol efectivo de la sesión. */
  readonly role: UserRole;
}

/**
 * Respuesta de `POST /auth/mock-login`.
 */
export interface AuthSession {
  /** JWT firmado que el interceptor inyecta como Bearer. */
  readonly accessToken: string;
  /** Esquema de autorización. */
  readonly tokenType: 'Bearer';
  /** Segundos de validez del token. */
  readonly expiresIn: number;
  /** Perfil del usuario asociado al token. */
  readonly user: User;
}
