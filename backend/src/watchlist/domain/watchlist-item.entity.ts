/**
 * Activo seguido por un usuario en su watchlist.
 */
export interface WatchlistItem {
  /** Identificador único del elemento. */
  readonly id: string;
  /** Propietario del elemento (id de usuario). */
  readonly userId: string;
  /** Id del activo en CoinGecko (ej. `bitcoin`). */
  readonly coinId: string;
  /** Símbolo en mayúsculas (ej. `BTC`). */
  readonly symbol: string;
  /** Precio objetivo definido por el usuario. `null` si no aplica. */
  readonly targetPrice: number | null;
  /** Anotación libre del usuario. `null` si no aplica. */
  readonly notes: string | null;
  /** Fecha ISO de creación. */
  readonly createdAt: string;
  /** Fecha ISO de la última modificación. */
  readonly updatedAt: string;
}

/** Datos necesarios para crear un elemento de watchlist. */
export type CreateWatchlistItemInput = Omit<
  WatchlistItem,
  'id' | 'createdAt' | 'updatedAt'
>;

/** Campos modificables de un elemento de watchlist. */
export type UpdateWatchlistItemInput = Partial<
  Pick<WatchlistItem, 'symbol' | 'targetPrice' | 'notes'>
>;
