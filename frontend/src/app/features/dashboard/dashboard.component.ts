import { CurrencyPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { MarketMetric, MarketMetricsSnapshot } from '../../core/api/api.models';
import { DashboardApiService } from '../../core/api/dashboard-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { MetricsChartComponent } from './metrics-chart/metrics-chart.component';
import { WatchlistComponent } from './watchlist/watchlist.component';

/** Intervalo de refresco de métricas (ms). El backend cachea 60 s. */
const METRICS_POLL_MS = 30_000;

/**
 * Contenedor principal del dashboard.
 * Restringe visualmente watchlist y auditoría con `@if` sobre el Signal de rol.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    AuditLogComponent,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MetricsChartComponent,
    NgClass,
    WatchlistComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  /** Sesión global (Signals de rol y usuario). */
  readonly auth = inject(AuthService);

  /** Cliente HTTP. */
  private readonly api = inject(DashboardApiService);

  /** Teardown de suscripciones. */
  private readonly destroyRef = inject(DestroyRef);

  /** Snapshot de mercado vigente. */
  readonly snapshot = signal<MarketMetricsSnapshot | null>(null);

  /** Activo cuyo sparkline se pinta en el gráfico. */
  readonly selectedId = signal<string>('bitcoin');

  /** `true` mientras se pide el primer snapshot. */
  readonly loading = signal(true);

  /** Error de carga de métricas. */
  readonly error = signal<string | null>(null);

  /**
   * Recarga métricas cada vez que cambia el rol (nuevo JWT) y arranca el polling.
   */
  constructor() {
    effect(() => {
      this.auth.role();
      untracked(() => this.loadMetrics());
    });
  }

  /**
   * Inicia el polling de métricas. El backend responde desde caché si el TTL
   * de 60 s sigue vigente, así que 30 s no provoca rate-limit.
   */
  ngOnInit(): void {
    interval(METRICS_POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMetrics(false));
  }

  /**
   * Activo seleccionado, resuelto contra el snapshot actual.
   *
   * @returns La métrica seleccionada, o la primera disponible.
   */
  selectedMetric(): MarketMetric | null {
    const metrics = this.snapshot()?.metrics ?? [];
    return metrics.find((item) => item.id === this.selectedId()) ?? metrics[0] ?? null;
  }

  /**
   * Marca un activo como seleccionado para el gráfico.
   *
   * @param id Identificador CoinGecko.
   */
  select(id: string): void {
    this.selectedId.set(id);
  }

  /**
   * Formatea un importe grande (market cap / volumen) en notación compacta.
   *
   * @param value Número a formatear.
   * @returns Cadena tipo `$1.5T`.
   */
  compactUsd(value: number): string {
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Etiqueta corta del origen del snapshot.
   *
   * @param source Procedencia reportada por el backend.
   * @returns Texto para el chip de frescura.
   */
  sourceLabel(source: MarketMetricsSnapshot['source']): string {
    switch (source) {
      case 'live':
        return 'En vivo';
      case 'cache':
        return 'Caché 60s';
      case 'stale-cache':
        return 'Caché degradada';
    }
  }

  /**
   * Pide `GET /financial/metrics`.
   *
   * @param showSpinner Si es `false`, refresca en segundo plano (polling).
   */
  loadMetrics(showSpinner = true): void {
    if (showSpinner) {
      this.loading.set(true);
    }

    this.api.getMetrics().subscribe({
      next: (snapshot) => {
        this.snapshot.set(snapshot);
        this.error.set(null);
        this.loading.set(false);

        const selected = this.selectedMetric();
        if (selected) {
          this.selectedId.set(selected.id);
        }
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          httpError.status === 0
            ? 'Sin conexión con http://localhost:3000'
            : 'No se pudieron cargar las métricas de mercado.',
        );
      },
    });
  }
}
