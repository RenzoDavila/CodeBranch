import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Interceptor HTTP funcional que inyecta `Authorization: Bearer <token>`
 * en todas las peticiones salientes mientras exista una sesión activa.
 *
 * Debe registrarse con `provideHttpClient(withInterceptors([authInterceptor]))`.
 *
 * @param req Petición original.
 * @param next Siguiente eslabón de la cadena.
 * @returns La petición clonada con el header, o la original si no hay token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).accessToken();

  if (!token || req.headers.has('Authorization')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
