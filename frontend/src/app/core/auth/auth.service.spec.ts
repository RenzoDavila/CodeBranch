import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { API_URL } from '../api/api.config';
import { AuthSession, UserRole } from './auth.models';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

/**
 * Fabrica una respuesta de `POST /auth/mock-login` para el rol dado.
 *
 * @param role Rol de la sesión simulada.
 * @returns Cuerpo JSON que emite el backend.
 */
function sessionFor(role: UserRole): AuthSession {
  return {
    accessToken: `token-${role}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: `user-${role}`,
      email: `${role}@codebranch.dev`,
      displayName: `Demo ${role}`,
      role,
    },
  };
}

/**
 * Snapshot de ruta con los roles declarados en `data.roles`.
 *
 * @param roles Roles autorizados de la ruta.
 * @returns `ActivatedRouteSnapshot` mínimo para el guard.
 */
function routeWithRoles(roles: UserRole[]): ActivatedRouteSnapshot {
  return { data: { roles } } as unknown as ActivatedRouteSnapshot;
}

describe('AuthService + roleGuard', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });

    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  /**
   * Completa un `login(role)` flushando la petición HTTP correspondiente.
   *
   * @param role Rol a autenticar.
   */
  async function loginAs(role: UserRole): Promise<void> {
    const pending = auth.login(role);
    const request = httpMock.expectOne(`${API_URL}/auth/mock-login`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ role });

    request.flush(sessionFor(role));
    await pending;
  }

  /**
   * Evalúa `roleGuard` dentro del contexto de inyección de TestBed.
   *
   * @param roles Roles permitidos en la ruta.
   * @returns Resultado síncrono del `CanActivateFn`.
   */
  function activate(roles: UserRole[]): GuardResult {
    return TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(roles), {} as RouterStateSnapshot),
    ) as GuardResult;
  }

  it('login(role) actualiza el Signal de rol y el token', async () => {
    expect(auth.role()).toBeNull();

    await loginAs('viewer');
    expect(auth.role()).toBe('viewer');
    expect(auth.accessToken()).toBe('token-viewer');
    expect(auth.isAdmin()).toBe(false);
    expect(auth.canMutateWatchlist()).toBe(false);

    await loginAs('trader');
    expect(auth.role()).toBe('trader');
    expect(auth.accessToken()).toBe('token-trader');
    expect(auth.canMutateWatchlist()).toBe(true);
    expect(auth.isAdmin()).toBe(false);

    await loginAs('admin');
    expect(auth.role()).toBe('admin');
    expect(auth.isAdmin()).toBe(true);
    expect(auth.canMutateWatchlist()).toBe(true);
  });

  it('permite la navegación cuando el Signal de rol está en data.roles', async () => {
    await loginAs('admin');

    expect(activate(['admin'])).toBe(true);
    expect(activate(['trader', 'admin'])).toBe(true);
  });

  it('bloquea a un viewer en una ruta de trader/admin y redirige a /', async () => {
    await loginAs('viewer');

    const result = activate(['trader', 'admin']);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('bloquea a un trader en /audit (solo admin) tras un cambio de rol', async () => {
    await loginAs('admin');
    expect(activate(['admin'])).toBe(true);

    await loginAs('trader');
    expect(auth.role()).toBe('trader');

    const result = activate(['admin']);
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});
