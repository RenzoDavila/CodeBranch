/**
 * Roles soportados por el sistema RBAC del dashboard financiero.
 *
 * - `VIEWER`: solo lectura de métricas de mercado.
 * - `TRADER`: lectura de métricas + gestión de su propia watchlist.
 * - `ADMIN`: acceso total, incluyendo la bitácora de auditoría.
 */
export enum UserRole {
  VIEWER = 'viewer',
  TRADER = 'trader',
  ADMIN = 'admin',
}

/**
 * Lista inmutable con todos los roles válidos.
 * Útil para validación de DTOs y para proteger rutas abiertas a cualquier rol.
 */
export const ALL_ROLES: readonly UserRole[] = Object.freeze([
  UserRole.VIEWER,
  UserRole.TRADER,
  UserRole.ADMIN,
]);

/**
 * Roles autorizados a ejecutar mutaciones auditables (watchlist).
 */
export const MUTATION_ROLES: readonly UserRole[] = Object.freeze([
  UserRole.TRADER,
  UserRole.ADMIN,
]);
