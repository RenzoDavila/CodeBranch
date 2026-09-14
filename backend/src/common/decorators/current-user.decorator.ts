import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { SessionPayload } from '../../auth/domain/user.entity';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Inyecta la sesión autenticada (`SessionPayload`) en un parámetro del handler.
 * Requiere que la ruta esté protegida por `JwtAuthGuard`.
 *
 * @throws {UnauthorizedException} Si la ruta no fue protegida por el guard.
 * @example
 * ```ts
 * findAll(@CurrentUser() user: SessionPayload) {}
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException('Sesión no encontrada en la petición');
    }

    return request.user;
  },
);
