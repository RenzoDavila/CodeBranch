import { Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { ALL_ROLES, UserRole } from '../domain/user-role.enum';

/**
 * Contrato del repositorio de usuarios.
 * Se declara como clase abstracta para usarla directamente como token de
 * inyección de Nest, manteniendo el desacoplamiento entre servicio y
 * mecanismo de persistencia.
 */
export abstract class UserRepository {
  /**
   * Obtiene todos los usuarios registrados.
   * @returns Copia de la colección de usuarios.
   */
  abstract findAll(): User[];

  /**
   * Busca un usuario por su identificador.
   * @param id Identificador del usuario.
   * @returns El usuario encontrado o `undefined`.
   */
  abstract findById(id: string): User | undefined;

  /**
   * Busca el usuario semilla asociado a un rol.
   * Es la pieza clave del flujo de `mock-login`.
   * @param role Rol solicitado.
   * @returns El usuario con ese rol o `undefined`.
   */
  abstract findByRole(role: UserRole): User | undefined;
}

/**
 * Implementación en memoria del repositorio de usuarios.
 *
 * Mantiene un `Map<string, User>` con un usuario semilla por cada rol RBAC,
 * suficiente para el flujo de autenticación simulada de la prueba técnica.
 */
@Injectable()
export class InMemoryUserRepository extends UserRepository {
  /** Almacén en memoria indexado por id de usuario. */
  private readonly users = new Map<string, User>();

  /**
   * Inicializa el almacén con un usuario por rol.
   */
  constructor() {
    super();
    this.seed();
  }

  /**
   * Obtiene todos los usuarios registrados.
   * @returns Nuevo array con los usuarios (evita mutaciones externas).
   */
  findAll(): User[] {
    return [...this.users.values()];
  }

  /**
   * Busca un usuario por su identificador.
   * @param id Identificador del usuario.
   * @returns El usuario encontrado o `undefined`.
   */
  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  /**
   * Busca el usuario semilla asociado a un rol.
   * @param role Rol solicitado.
   * @returns El usuario con ese rol o `undefined`.
   */
  findByRole(role: UserRole): User | undefined {
    return this.findAll().find((user) => user.role === role);
  }

  /**
   * Crea los usuarios semilla, uno por cada rol declarado en `ALL_ROLES`.
   */
  private seed(): void {
    for (const role of ALL_ROLES) {
      const user: User = {
        id: `user-${role}`,
        email: `${role}@codebranch.dev`,
        displayName: `Demo ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
        role,
      };
      this.users.set(user.id, user);
    }
  }
}
