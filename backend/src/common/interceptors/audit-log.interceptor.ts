import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { MUTATION_ROLES } from '../../auth/domain/user-role.enum';
import type { SessionPayload } from '../../auth/domain/user.entity';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/** Verbos HTTP considerados mutaciones auditables. */
const MUTATION_METHODS: readonly string[] = Object.freeze([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

/**
 * Interceptor global de auditoría.
 *
 * Registra automáticamente un `AuditLog` cada vez que un usuario con rol
 * `trader` o `admin` ejecuta una mutación (POST/PUT/PATCH/DELETE), tanto si
 * la operación termina bien como si falla. Las lecturas y las peticiones no
 * autenticadas se ignoran para no contaminar la bitácora.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  /**
   * @param auditService Casos de uso de la bitácora.
   */
  constructor(private readonly auditService: AuditService) {}

  /**
   * Envuelve la ejecución del handler para auditar el resultado.
   * @param context Contexto de ejecución de Nest.
   * @param next Siguiente eslabón de la cadena.
   * @returns El flujo original, sin alterar la respuesta.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const session = request.user;

    if (!this.isAuditable(request.method, session)) {
      return next.handle();
    }

    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () =>
          this.write(request, session!, response.statusCode, 'success'),
        error: (error: unknown) =>
          this.write(request, session!, this.resolveStatus(error), 'failure'),
      }),
    );
  }

  /**
   * Determina si la petición debe auditarse.
   * @param method Verbo HTTP de la petición.
   * @param session Sesión autenticada, si existe.
   * @returns `true` si es una mutación de un rol auditable.
   */
  private isAuditable(
    method: string,
    session?: SessionPayload,
  ): session is SessionPayload {
    return (
      !!session &&
      MUTATION_METHODS.includes(method.toUpperCase()) &&
      MUTATION_ROLES.includes(session.role)
    );
  }

  /**
   * Persiste el registro de auditoría de la petición.
   * @param request Petición autenticada.
   * @param session Sesión del usuario.
   * @param statusCode Código HTTP resultante.
   * @param outcome Resultado de la operación.
   */
  private write(
    request: AuthenticatedRequest,
    session: SessionPayload,
    statusCode: number,
    outcome: 'success' | 'failure',
  ): void {
    this.auditService.record({
      userId: session.sub,
      userEmail: session.email,
      role: session.role,
      action: request.method.toUpperCase(),
      resource: request.originalUrl ?? request.url,
      statusCode,
      outcome,
      payload: this.extractPayload(request.body),
    });
  }

  /**
   * Normaliza el cuerpo de la petición a un objeto plano auditable.
   * @param body Cuerpo crudo de Express.
   * @returns Objeto plano o `null` si no aplica.
   */
  private extractPayload(body: unknown): Record<string, unknown> | null {
    return body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : null;
  }

  /**
   * Extrae el código HTTP de un error propagado por el handler.
   * @param error Error capturado.
   * @returns Código HTTP correspondiente.
   */
  private resolveStatus(error: unknown): number {
    return error instanceof HttpException
      ? error.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
