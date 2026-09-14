import { IsEnum } from 'class-validator';
import { UserRole } from '../domain/user-role.enum';

/**
 * Cuerpo esperado por `POST /auth/mock-login`.
 * El login es simulado: basta con declarar el rol con el que se quiere operar.
 */
export class MockLoginDto {
  /**
   * Rol con el que se desea iniciar sesión.
   * Debe ser uno de `viewer`, `trader` o `admin`.
   */
  @IsEnum(UserRole, {
    message: `role debe ser uno de: ${Object.values(UserRole).join(', ')}`,
  })
  role: UserRole;
}
