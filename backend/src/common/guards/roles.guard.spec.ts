import {
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserRole } from '../../auth/domain/user-role.enum';
import type { SessionPayload } from '../../auth/domain/user.entity';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

/**
 * Construye un `ExecutionContext` HTTP mínimo para ejercitar el guard
 * sin levantar una aplicación Nest.
 *
 * @param user Sesión publicada por `JwtAuthGuard`, o `undefined` si no hay auth.
 * @returns Contexto de ejecución simulado.
 */
function mockHttpContext(user?: SessionPayload): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

/**
 * Sesión JWT de un usuario con el rol indicado.
 *
 * @param role Rol RBAC a simular.
 * @returns Payload equivalente al que deja `JwtAuthGuard` en `request.user`.
 */
function sessionOf(role: UserRole): SessionPayload {
  return {
    sub: `user-${role}`,
    email: `${role}@codebranch.dev`,
    displayName: `Demo ${role}`,
    role,
  };
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite el acceso cuando la ruta no declara @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(mockHttpContext(sessionOf(UserRole.VIEWER)))).toBe(
      true,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_METADATA_KEY,
      expect.any(Array),
    );
  });

  it('permite a un trader acceder a una ruta de trader/admin', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.TRADER,
      UserRole.ADMIN,
    ]);

    expect(guard.canActivate(mockHttpContext(sessionOf(UserRole.TRADER)))).toBe(
      true,
    );
  });

  it('lanza ForbiddenException (403) si un viewer accede a una ruta de trader/admin', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.TRADER,
      UserRole.ADMIN,
    ]);

    const context = mockHttpContext(sessionOf(UserRole.VIEWER));

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/viewer.*no tiene acceso/i);

    try {
      guard.canActivate(context);
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getStatus()).toBe(
        HttpStatus.FORBIDDEN,
      );
      return;
    }

    throw new Error('RolesGuard debería haber rechazado al viewer');
  });

  it('lanza UnauthorizedException si no hay sesión en una ruta protegida por roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(mockHttpContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
