import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../auth/domain/user-role.enum';

/** Clave de metadata donde se almacenan los roles autorizados de una ruta. */
export const ROLES_METADATA_KEY = 'rbac:roles';

/**
 * Declara qué roles pueden ejecutar un controlador o un handler concreto.
 * Es consumido por `RolesGuard`; si no se aplica, el guard permite el acceso
 * a cualquier usuario autenticado.
 *
 * @param roles Roles autorizados.
 * @returns Decorador de metadata de Nest.
 * @example
 * ```ts
 * @Roles(UserRole.TRADER, UserRole.ADMIN)
 * @Post()
 * create() {}
 * ```
 */
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_METADATA_KEY, roles);
