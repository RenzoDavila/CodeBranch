import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_EXPIRES_IN_SECONDS, JWT_SECRET } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  InMemoryUserRepository,
  UserRepository,
} from './repositories/user.repository';

/**
 * Módulo de autenticación y RBAC.
 *
 * Registra `JwtModule` en modo global para que `JwtAuthGuard` pueda usarse
 * desde cualquier otro módulo sin re-importaciones, y enlaza el contrato
 * `UserRepository` con su implementación en memoria.
 */
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: UserRepository, useClass: InMemoryUserRepository },
  ],
  exports: [AuthService, UserRepository],
})
export class AuthModule {}
