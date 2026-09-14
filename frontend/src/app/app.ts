import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { RoleSwitcherComponent } from './shared/role-switcher/role-switcher.component';

/**
 * Shell de la aplicación: cabecera con `RoleSwitcher` y el `router-outlet`.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RoleSwitcherComponent],
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Estado de sesión global. */
  readonly auth = inject(AuthService);

  /**
   * Reintenta el login simulado como `viewer` si el arranque no pudo contactar la API.
   */
  retrySession(): void {
    void this.auth.login('viewer');
  }
}
