import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { AuthSession } from './auth.service';
import type { SessionPayload, User } from './domain/user.entity';
import { MockLoginDto } from './dto/mock-login.dto';

/**
 * Endpoints de autenticación simulada.
 * Punto de entrada del flujo RBAC: aquí el cliente obtiene el Bearer token.
 */
@Controller('auth')
export class AuthController {
  /**
   * @param authService Casos de uso de autenticación.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * `POST /auth/mock-login`
   * Emite un JWT firmado para el rol solicitado (login simulado, sin password).
   *
   * @param dto Cuerpo con el rol deseado.
   * @returns Token de acceso y perfil del usuario.
   */
  @Post('mock-login')
  @HttpCode(HttpStatus.OK)
  mockLogin(@Body() dto: MockLoginDto): AuthSession {
    return this.authService.mockLogin(dto.role);
  }

  /**
   * `GET /auth/me`
   * Devuelve el perfil de la sesión activa. Permite al frontend rehidratar
   * su signal de sesión tras un refresco de página.
   *
   * @param session Sesión inyectada desde el JWT.
   * @returns Usuario autenticado.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() session: SessionPayload): User {
    return this.authService.getProfile(session);
  }
}
