import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../../auth/auth.constants';
import type { SessionPayload } from '../../auth/domain/user.entity';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Guard de autenticación: valida el `Authorization: Bearer <token>` y publica
 * la sesión decodificada en `request.user` para que `RolesGuard`, el
 * interceptor de auditoría y los controladores puedan consumirla.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * @param jwtService Servicio de verificación de JWT.
   */
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Verifica el token de la petición entrante.
   * @param context Contexto de ejecución de Nest.
   * @throws {UnauthorizedException} Si falta el token o es inválido/expirado.
   * @returns `true` cuando la petición queda autenticada.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Token de acceso ausente');
    }

    try {
      request.user = await this.jwtService.verifyAsync<SessionPayload>(token, {
        secret: JWT_SECRET,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Token de acceso inválido o expirado');
    }
  }

  /**
   * Extrae el token del header `Authorization`.
   * @param authorizationHeader Valor crudo del header.
   * @returns El token o `undefined` si el header no sigue el esquema Bearer.
   */
  private extractBearerToken(
    authorizationHeader?: string,
  ): string | undefined {
    const [scheme, token] = authorizationHeader?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
  }
}
