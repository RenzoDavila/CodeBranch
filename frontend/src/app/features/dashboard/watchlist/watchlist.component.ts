import { CurrencyPipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  CoinSearchHit,
  CreateWatchlistItemPayload,
  MarketMetric,
  WatchlistItem,
} from '../../../core/api/api.models';
import { DashboardApiService } from '../../../core/api/dashboard-api.service';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * CRUD de watchlist visible y funcional solo para `trader` y `admin`.
 * El alta usa un autocomplete remoto (`GET /financial/search`) con debounce.
 */
@Component({
  selector: 'app-watchlist',
  imports: [
    CurrencyPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    NgClass,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watchlist.component.html',
})
export class WatchlistComponent {
  /**
   * Activos del snapshot de mercado, usados como fallback de precio actual.
   */
  readonly knownCoins = input<MarketMetric[]>([]);

  /** Cliente HTTP del dashboard. */
  private readonly api = inject(DashboardApiService);

  /** Sesión global, para recargar la lista al cambiar de rol. */
  private readonly auth = inject(AuthService);

  /** Snackbar de feedback (éxito / error). */
  private readonly snackBar = inject(MatSnackBar);

  /** Texto o activo seleccionado en el autocomplete. */
  readonly searchControl = new FormControl<string | CoinSearchHit | null>(null);

  /** Símbolo que se persistirá en la watchlist. */
  readonly symbolControl = new FormControl('', { nonNullable: true });

  /** Precio objetivo opcional. */
  readonly targetControl = new FormControl<number | null>(null);

  /** Nota opcional. */
  readonly notesControl = new FormControl('', { nonNullable: true });

  /** `true` mientras el autocomplete espera a CoinGecko. */
  readonly searching = signal(false);

  /** Elementos cargados desde el backend. */
  readonly items = signal<WatchlistItem[]>([]);

  /** `true` mientras se recarga la tabla. */
  readonly loading = signal(false);

  /** Precio actual por `coinId`, resuelto contra `/financial/metrics`. */
  readonly prices = signal<Record<string, number>>({});

  /**
   * Sugerencias remotas: debounce 300 ms, ignora repeticiones y cancela la
   * petición anterior con `switchMap`.
   */
  readonly suggestions = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      map((value) => (typeof value === 'string' ? value.trim() : '')),
      distinctUntilChanged(),
      switchMap((query) => this.searchCoins(query)),
    ),
    { initialValue: [] as CoinSearchHit[] },
  );

  /** Columnas de la tabla Material. */
  readonly displayedColumns = [
    'asset',
    'currentPrice',
    'targetPrice',
    'notes',
    'actions',
  ] as const;

  /**
   * Recarga la watchlist al montar el componente y cada vez que cambia el rol.
   */
  constructor() {
    effect(() => {
      this.auth.role();
      untracked(() => this.reload());
    });
  }

  /**
   * Texto mostrado en el input del autocomplete.
   *
   * @param value Cadena libre o activo seleccionado.
   * @returns Etiqueta legible.
   */
  displayCoin = (value: CoinSearchHit | string | null): string => {
    if (!value) {
      return '';
    }
    return typeof value === 'string' ? value : `${value.name} (${value.symbol})`;
  };

  /**
   * Autocompleta `id` y `symbol` al elegir una coincidencia.
   *
   * @param event Selección del `mat-autocomplete`.
   */
  onCoinSelected(event: MatAutocompleteSelectedEvent): void {
    const coin = event.option.value as CoinSearchHit;
    this.searchControl.setValue(coin, { emitEvent: false });
    this.symbolControl.setValue(coin.symbol.toUpperCase());
  }

  /**
   * Recarga la watchlist desde `GET /watchlist` y refresca los precios actuales.
   */
  reload(): void {
    this.loading.set(true);
    this.api.getWatchlist().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
        this.refreshPrices(items);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notifyError(this.readError(error));
      },
    });
  }

  /**
   * Añade el activo seleccionado a la watchlist (`POST /watchlist`).
   */
  add(): void {
    const selected = this.searchControl.value;
    const coinId =
      typeof selected === 'string'
        ? selected.trim().toLowerCase()
        : (selected?.id ?? '');
    const symbol = this.symbolControl.value.trim().toUpperCase();

    if (!coinId || !symbol) {
      this.notifyError('Selecciona un activo del buscador para continuar.');
      return;
    }

    const targetPrice = this.targetControl.value;
    const notes = this.notesControl.value.trim();
    const payload: CreateWatchlistItemPayload = {
      coinId,
      symbol,
      ...(targetPrice ? { targetPrice: Number(targetPrice) } : {}),
      ...(notes ? { notes } : {}),
    };

    this.api.addToWatchlist(payload).subscribe({
      next: (created) => {
        this.items.update((current) => [...current, created]);
        this.resetForm();
        this.refreshPrices(this.items());
        this.notifySuccess(`Activo añadido: ${created.symbol}`);
      },
      error: (error: HttpErrorResponse) => this.notifyError(this.readError(error)),
    });
  }

  /**
   * Elimina un elemento (`DELETE /watchlist/:id`).
   *
   * @param item Elemento a borrar.
   */
  remove(item: WatchlistItem): void {
    this.api.removeFromWatchlist(item.id).subscribe({
      next: () => {
        this.items.update((current) => current.filter((entry) => entry.id !== item.id));
        this.notifySuccess(`Activo eliminado: ${item.symbol}`);
      },
      error: (error: HttpErrorResponse) => this.notifyError(this.readError(error)),
    });
  }

  /**
   * Precio de mercado actual del activo, o `null` si aún no hay cotización.
   *
   * @param item Fila de la watchlist.
   * @returns Precio en USD.
   */
  currentPrice(item: WatchlistItem): number | null {
    return (
      this.prices()[item.coinId] ??
      this.knownCoins().find((coin) => coin.id === item.coinId)?.price ??
      null
    );
  }

  /**
   * Clase Tailwind del precio actual según el objetivo:
   * verde si cotiza en o por encima del target; rojo si está por debajo.
   *
   * @param item Fila de la watchlist.
   * @returns Clases CSS.
   */
  priceClass(item: WatchlistItem): string {
    const price = this.currentPrice(item);
    const target = item.targetPrice;

    if (price == null || target == null) {
      return 'text-slate-400';
    }

    return price >= target ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold';
  }

  /**
   * Consulta CoinGecko vía el backend. No dispara HTTP si hay menos de 2 caracteres.
   *
   * @param query Texto del input.
   * @returns Observable de coincidencias.
   */
  private searchCoins(query: string) {
    if (query.length < 2) {
      return of([] as CoinSearchHit[]);
    }

    this.searching.set(true);
    return this.api.searchCoins(query).pipe(
      catchError(() => {
        this.notifyError('No se pudo buscar en CoinGecko');
        return of([] as CoinSearchHit[]);
      }),
      finalize(() => this.searching.set(false)),
    );
  }

  /**
   * Pide cotizaciones de los ids de la watchlist para pintar el precio actual.
   *
   * @param items Filas visibles.
   */
  private refreshPrices(items: WatchlistItem[]): void {
    const ids = [...new Set(items.map((item) => item.coinId))];
    if (ids.length === 0) {
      this.prices.set({});
      return;
    }

    this.api.getMetrics(ids).subscribe({
      next: (snapshot) => {
        this.prices.set(
          Object.fromEntries(snapshot.metrics.map((metric) => [metric.id, metric.price])),
        );
      },
      error: () => {
        /* El color cae al fallback de `knownCoins` si esta petición falla. */
      },
    });
  }

  /**
   * Limpia el formulario de alta sin re-disparar la búsqueda.
   */
  private resetForm(): void {
    this.searchControl.setValue(null, { emitEvent: false });
    this.symbolControl.setValue('');
    this.targetControl.setValue(null);
    this.notesControl.setValue('');
  }

  /**
   * Extrae el mensaje de error de una respuesta NestJS.
   *
   * @param error Error HTTP.
   * @returns Mensaje legible.
   */
  private readError(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
    return error.status === 0 ? 'No hay conexión con la API' : `Error ${error.status}`;
  }

  /**
   * Toast de éxito.
   *
   * @param message Texto a mostrar.
   */
  private notifySuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }

  /**
   * Toast de error.
   *
   * @param message Texto a mostrar.
   */
  private notifyError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4500 });
  }
}
