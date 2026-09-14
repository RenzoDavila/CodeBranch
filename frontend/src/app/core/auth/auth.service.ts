import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../api/api.config';
import { AuthSession, MUTATION_ROLES, User, UserRole } from './auth.models';

/** Clave de `localStorage` donde se persiste la última sesión emitida. */
const SESSION_STORAGE_KEY = 'cb.financial.session';

/**
 * Estado de sesión global del dashboard.
 *
 * Toda la reactividad de autenticación (token, usuario, rol) vive en Signals
 * para que plantillas (`@if`), el interceptor HTTP y el `roleGuard` lean la
 * misma fuente de verdad sin Subjects ni NgRx.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Token JWT vigente. `null` si no hay sesión. */
  private readonly tokenSignal = signal<string | null>(null);

  /** Perfil del usuario asociado al token. */
  private readonly userSignal = signal<User | null>(null);

  /** `true` mientras se está emitiendo un nuevo token. */
  private readonly loadingSignal = signal(false);

  /** Último error de autenticación, si lo hay. */
  private readonly errorSignal = signal<string | null>(null);

  /** Token de acceso de solo lectura para el interceptor HTTP. */
  readonly accessToken = this.tokenSignal.asReadonly();

  /** Usuario autenticado de solo lectura. */
  readonly user = this.userSignal.asReadonly();

  /** Rol efectivo de la sesión, o `null` si no hay usuario. */
  readonly role = computed<UserRole | null>(() => this.userSignal()?.role ?? null);

  /** Indica si existe un token con el que llamar a la API. */
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.userSignal());

  /** Indica si el rol actual puede mutar la watchlist. */
  readonly canMutateWatchlist = computed(() => {
    const role = this.role();
    return !!role && MUTATION_ROLES.includes(role);
  });

  /** Indica si el rol actual es administrador. */
  readonly isAdmin = computed(() => this.role() === 'admin');

  /** Estado de carga de un `login()`. */
  readonly loading = this.loadingSignal.asReadonly();

  /** Mensaje de error de autenticación. */
  readonly error = this.errorSignal.asReadonly();

  /**
   * @param http Cliente HTTP de Angular.
   */
  constructor(private readonly http: HttpClient) {
    this.restoreFromStorage();
  }

  /**
   * Garantiza una sesión antes de arrancar el router.
   * Reemite el JWT del último rol persistido (o `viewer`) para no arrancar
   * con un token caducado.
   *
   * @returns Promesa que se resuelve cuando hay sesión o cuando el backend no responde.
   */
  async ensureSession(): Promise<void> {
    const role = this.role() ?? 'viewer';

    try {
      await this.login(role);
    } catch {
      this.errorSignal.set(
        'No se pudo conectar con la API. Comprueba que el backend está en http://localhost:3000.',
      );
    }
  }

  /**
   * Emite un JWT simulado para el rol solicitado (`POST /auth/mock-login`)
   * y actualiza los Signals de sesión.
   *
   * @param role Rol con el que se desea operar.
   * @returns La sesión emitida por el backend.
   */
  async login(role: UserRole): Promise<AuthSession> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const session = await firstValueFrom(
        this.http.post<AuthSession>(`${API_URL}/auth/mock-login`, { role }),
      );
      this.persist(session);
      return session;
    } catch (error) {
      this.errorSignal.set('No se pudo cambiar de rol. ¿Está levantado el backend?');
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Cierra la sesión local (no hay endpoint de logout: el token es de un solo uso en memoria).
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Restaura token y usuario desde `localStorage` si existen.
   */
  private restoreFromStorage(): void {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      if (session.accessToken && session.user?.role) {
        this.tokenSignal.set(session.accessToken);
        this.userSignal.set(session.user);
      }
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  /**
   * Publica la sesión en los Signals y la persiste para sobrevivir un refresco.
   *
   * @param session Sesión emitida por el backend.
   */
  private persist(session: AuthSession): void {
    this.tokenSignal.set(session.accessToken);
    this.userSignal.set(session.user);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}
