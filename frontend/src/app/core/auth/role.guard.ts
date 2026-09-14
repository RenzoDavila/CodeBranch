import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { USER_ROLES, UserRole } from './auth.models';
import { AuthService } from './auth.service';

/**
 * `CanActivateFn` que autoriza una ruta comparando el rol actual (Signal)
 * contra `route.data.roles`. Si la ruta no declara roles, admite cualquiera
 * de los tres roles autenticados.
 *
 * @param route Snapshot de la ruta solicitada.
 * @returns `true` si el rol está autorizado; un `UrlTree` al dashboard en caso contrario.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const currentRole = auth.role();
  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [...USER_ROLES];

  if (currentRole && allowedRoles.includes(currentRole)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
