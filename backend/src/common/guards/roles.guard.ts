import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../auth/domain/user-role.enum';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Guard de autorización RBAC.
 *
 * Lee los roles declarados con `@Roles()` (a nivel de handler o de
 * controlador) y los compara contra el rol de la sesión publicada por
 * `JwtAuthGuard`. Debe registrarse siempre después de éste:
 * `@UseGuards(JwtAuthGuard, RolesGuard)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * @param reflector Utilidad de Nest para leer metadata de rutas.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determina si la sesión actual tiene permiso sobre la ruta.
   * @param context Contexto de ejecución de Nest.
   * @throws {UnauthorizedException} Si la petición no está autenticada.
   * @throws {ForbiddenException} Si el rol no está autorizado.
   * @returns `true` cuando el acceso es permitido.
   */
  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!user) {
      throw new UnauthorizedException('Se requiere autenticación');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `El rol "${user.role}" no tiene acceso a este recurso`,
      );
    }

    return true;
  }
}
