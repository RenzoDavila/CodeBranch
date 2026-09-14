import { Routes } from '@angular/router';
import { USER_ROLES } from './core/auth/auth.models';
import { roleGuard } from './core/auth/role.guard';
import { AuditLogComponent } from './features/dashboard/audit-log/audit-log.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

/**
 * Rutas de la SPA.
 * `/audit` queda protegida por `roleGuard` y solo admite el rol `admin`.
 */
export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: { roles: [...USER_ROLES] },
  },
  {
    path: 'audit',
    component: AuditLogComponent,
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
  },
  { path: '**', redirectTo: '' },
];
