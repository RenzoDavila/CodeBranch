import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MarketMetric } from '../../../core/api/api.models';

/**
 * Gráfico de línea (ng2-charts / Chart.js) alimentado por `sparkline7d`.
 * Es dinámico: al cambiar el `metric` de entrada se regenera el dataset.
 */
@Component({
  selector: 'app-metrics-chart',
  imports: [BaseChartDirective, CurrencyPipe, DecimalPipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metrics-chart.component.html',
})
export class MetricsChartComponent {
  /**
   * Activo seleccionado cuyos `sparkline7d` se van a pintar.
   * `null` muestra un estado vacío.
   */
  readonly metric = input<MarketMetric | null>(null);

  /**
   * Dataset de Chart.js derivado del sparkline del activo seleccionado.
   */
  readonly chartData = computed<ChartData<'line'>>(() => {
    const metric = this.metric();
    const series = metric?.sparkline7d ?? [];
    const positive = (metric?.changePercent24h ?? 0) >= 0;
    const stroke = positive ? '#34d399' : '#f87171';

    return {
      labels: series.map((_, index) => index),
      datasets: [
        {
          data: series,
          label: metric ? `${metric.symbol} · 7d` : 'Sin datos',
          borderColor: stroke,
          backgroundColor: positive
            ? 'rgba(52, 211, 153, 0.12)'
            : 'rgba(248, 113, 113, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  });

  /**
   * Opciones de Chart.js pensadas para un sparkline de mercado en tema oscuro.
   */
  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: () => 'Precio',
          label: (item) =>
            typeof item.parsed.y === 'number'
              ? ` ${item.parsed.y.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 2,
                })}`
              : '',
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: { display: false },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: '#94a3b8',
          callback: (value) =>
            typeof value === 'number'
              ? Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(value)
              : value,
        },
      },
    },
  };
}
