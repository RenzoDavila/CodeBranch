import { DatePipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AuditLog } from '../../../core/api/api.models';
import { DashboardApiService } from '../../../core/api/dashboard-api.service';

/**
 * Tabla Material de la bitácora de auditoría (`GET /audit/logs`).
 * Visible y enrutable solo para el rol `admin`.
 */
@Component({
  selector: 'app-audit-log',
  imports: [DatePipe, NgClass, MatButtonModule, MatIconModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit-log.component.html',
})
export class AuditLogComponent implements OnInit {
  /** Cliente HTTP del dashboard. */
  private readonly api = inject(DashboardApiService);

  /** Registros cargados. */
  readonly logs = signal<AuditLog[]>([]);

  /** `true` mientras se recarga la tabla. */
  readonly loading = signal(false);

  /** Error de carga, si lo hay. */
  readonly error = signal<string | null>(null);

  /** Columnas de la tabla Material. */
  readonly displayedColumns = [
    'timestamp',
    'user',
    'action',
    'resource',
    'status',
    'payload',
  ] as const;

  /**
   * Carga inicial de la bitácora.
   */
  ngOnInit(): void {
    this.reload();
  }

  /**
   * Recarga `GET /audit/logs`.
   */
  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAuditLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.loading.set(false);
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          httpError.status === 403
            ? 'Solo el rol admin puede consultar la bitácora.'
            : 'No se pudo cargar la auditoría.',
        );
      },
    });
  }

  /**
   * Serializa el payload auditado para mostrarlo en la tabla.
   *
   * @param payload Cuerpo persistido por el backend.
   * @returns JSON compacto o un guión.
   */
  formatPayload(payload: Record<string, unknown> | null): string {
    if (!payload) {
      return '—';
    }
    return JSON.stringify(payload);
  }
}
