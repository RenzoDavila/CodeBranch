import type { Request } from 'express';
import type { SessionPayload } from '../../auth/domain/user.entity';

/**
 * Request de Express enriquecido por `JwtAuthGuard` con la sesión decodificada.
 */
export interface AuthenticatedRequest extends Request {
  /** Sesión del usuario autenticado; `undefined` en rutas no protegidas. */
  user?: SessionPayload;
}
