import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateWatchlistItemPayload, MarketMetric, WatchlistItem } from '../../../core/api/api.models';
import { DashboardApiService } from '../../../core/api/dashboard-api.service';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * CRUD de watchlist visible y funcional solo para `trader` y `admin`.
 * Busca ids CoinGecko (con sugerencias de las métricas cargadas) y los
 * persiste vía `POST /watchlist`.
 */
@Component({
  selector: 'app-watchlist',
  imports: [
    CurrencyPipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watchlist.component.html',
})
export class WatchlistComponent {
  /**
   * Activos conocidos del snapshot de mercado, usados como sugerencias de búsqueda.
   */
  readonly knownCoins = input<MarketMetric[]>([]);

  /** Cliente HTTP del dashboard. */
  private readonly api = inject(DashboardApiService);

  /** Sesión global, para recargar la lista al cambiar de rol. */
  private readonly auth = inject(AuthService);

  /** Snackbar para confirmar altas/bajas y mostrar errores de la API. */
  private readonly snackBar = inject(MatSnackBar);

  /** Elementos cargados desde el backend. */
  readonly items = signal<WatchlistItem[]>([]);

  /** `true` mientras se recarga la lista. */
  readonly loading = signal(false);

  /** Id CoinGecko del formulario de alta. */
  readonly draftId = signal('');

  /** Símbolo del formulario de alta. */
  readonly draftSymbol = signal('');

  /** Precio objetivo opcional. */
  readonly draftTarget = signal<number | null>(null);

  /** Nota opcional. */
  readonly draftNotes = signal('');

  /** Columnas de la tabla Material. */
  readonly displayedColumns = ['asset', 'targetPrice', 'notes', 'actions'] as const;

  /**
   * Recarga la watchlist al montar el componente y cada vez que cambia el rol
   * (un admin ve todas las listas; un trader solo la suya).
   */
  constructor() {
    effect(() => {
      this.auth.role();
      untracked(() => this.reload());
    });
  }

  /**
   * Recarga la watchlist desde `GET /watchlist`.
   */
  reload(): void {
    this.loading.set(true);
    this.api.getWatchlist().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notify(this.readError(error));
      },
    });
  }

  /**
   * Autocompleta el símbolo si el id coincide con un activo conocido.
   *
   * @param event Evento `input` del campo de ID.
   */
  onIdInput(event: Event): void {
    const coinId = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.draftId.set(coinId);
    const match = this.knownCoins().find((coin) => coin.id === coinId);

    if (match) {
      this.draftSymbol.set(match.symbol);
    }
  }

  /**
   * Añade el activo del formulario a la watchlist (`POST /watchlist`).
   */
  add(): void {
    const coinId = this.draftId().trim().toLowerCase();
    const symbol = this.draftSymbol().trim().toUpperCase();

    if (!coinId || !symbol) {
      this.notify('Indica un ID de CoinGecko y un símbolo.');
      return;
    }

    const payload: CreateWatchlistItemPayload = {
      coinId,
      symbol,
      ...(this.draftTarget() ? { targetPrice: Number(this.draftTarget()) } : {}),
      ...(this.draftNotes().trim() ? { notes: this.draftNotes().trim() } : {}),
    };

    this.api.addToWatchlist(payload).subscribe({
      next: (created) => {
        this.items.update((current) => [...current, created]);
        this.draftId.set('');
        this.draftSymbol.set('');
        this.draftTarget.set(null);
        this.draftNotes.set('');
        this.notify(`${created.symbol} añadido a la watchlist`);
      },
      error: (error: HttpErrorResponse) => this.notify(this.readError(error)),
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
        this.notify(`${item.symbol} eliminado`);
      },
      error: (error: HttpErrorResponse) => this.notify(this.readError(error)),
    });
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
    return error.status === 0
      ? 'No hay conexión con la API'
      : `Error ${error.status}`;
  }

  /**
   * Muestra un snackbar breve.
   *
   * @param message Texto a mostrar.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3500 });
  }
}
