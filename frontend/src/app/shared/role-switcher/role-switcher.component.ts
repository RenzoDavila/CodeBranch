import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { USER_ROLES, UserRole } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Opción renderizada en el selector de rol.
 */
interface RoleOption {
  /** Valor enviado a `POST /auth/mock-login`. */
  readonly value: UserRole;
  /** Etiqueta visible. */
  readonly label: string;
  /** Descripción corta del permiso. */
  readonly hint: string;
}

/**
 * Selector de Angular Material en la cabecera que cambia instantáneamente
 * la sesión llamando a `AuthService.login(role)`.
 */
@Component({
  selector: 'app-role-switcher',
  imports: [MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-switcher.component.html',
})
export class RoleSwitcherComponent {
  /** Servicio de sesión global. */
  readonly auth = inject(AuthService);

  /** Router para redirigir si el nuevo rol pierde acceso a la ruta actual. */
  private readonly router = inject(Router);

  /**
   * Opciones del selector, alineadas con los tres roles del backend.
   */
  readonly roles: readonly RoleOption[] = [
    { value: 'viewer', label: 'Viewer', hint: 'Solo lectura de mercado' },
    { value: 'trader', label: 'Trader', hint: 'Watchlist + métricas' },
    { value: 'admin', label: 'Admin', hint: 'Acceso total + auditoría' },
  ];

  /**
   * Cambia de rol emitiendo un nuevo JWT. Si el usuario estaba en `/audit`
   * y el nuevo rol no es `admin`, vuelve al dashboard.
   *
   * @param role Rol seleccionado en el `mat-select`.
   */
  async onRoleChange(role: UserRole): Promise<void> {
    if (role === this.auth.role()) {
      return;
    }

    try {
      await this.auth.login(role);
    } catch {
      return;
    }

    if (!this.auth.isAdmin() && this.router.url.startsWith('/audit')) {
      await this.router.navigateByUrl('/');
    }
  }

  /**
   * Indica si un valor pertenece a la lista de roles conocidos.
   * Evita que el template dependa de un type assertion.
   *
   * @param value Valor emitido por `mat-select`.
   * @returns El rol si es válido; el rol actual en caso contrario.
   */
  asRole(value: string): UserRole {
    return (USER_ROLES as readonly string[]).includes(value)
      ? (value as UserRole)
      : (this.auth.role() ?? 'viewer');
  }
}
