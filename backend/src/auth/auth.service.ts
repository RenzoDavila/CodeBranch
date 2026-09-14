import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_EXPIRES_IN_SECONDS } from './auth.constants';
import { SessionPayload, User } from './domain/user.entity';
import { UserRole } from './domain/user-role.enum';
import { UserRepository } from './repositories/user.repository';

/**
 * Respuesta devuelta tras un login simulado exitoso.
 */
export interface AuthSession {
  /** JWT firmado (HS256) que el frontend debe enviar como Bearer token. */
  readonly accessToken: string;
  /** Esquema de autorización esperado por la API. */
  readonly tokenType: 'Bearer';
  /** Segundos de validez restantes del token. */
  readonly expiresIn: number;
  /** Datos públicos del usuario autenticado. */
  readonly user: User;
}

/**
 * Casos de uso de autenticación y emisión de tokens.
 *
 * No valida credenciales (es un login simulado para la prueba técnica):
 * resuelve el usuario semilla del rol solicitado y firma un JWT real.
 */
@Injectable()
export class AuthService {
  /**
   * @param users Repositorio de usuarios (implementación en memoria).
   * @param jwtService Servicio de firma/verificación de JWT.
   */
  constructor(
    private readonly users: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Emite una sesión firmada para el rol solicitado.
   * @param role Rol con el que se desea operar.
   * @throws {UnauthorizedException} Si no existe usuario semilla para el rol.
   * @returns Token de acceso y perfil del usuario.
   */
  mockLogin(role: UserRole): AuthSession {
    const user = this.users.findByRole(role);

    if (!user) {
      throw new UnauthorizedException(`No existe un usuario para el rol "${role}"`);
    }

    const payload: SessionPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      user,
    };
  }

  /**
   * Recupera el perfil completo del usuario asociado a una sesión activa.
   * @param session Payload extraído del JWT por `JwtAuthGuard`.
   * @throws {UnauthorizedException} Si el usuario del token ya no existe.
   * @returns El usuario persistido en memoria.
   */
  getProfile(session: SessionPayload): User {
    const user = this.users.findById(session.sub);

    if (!user) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    return user;
  }
}
