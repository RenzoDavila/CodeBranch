/**
 * Métrica de mercado normalizada que expone `GET /financial/metrics`.
 */
export interface MarketMetric {
  /** Identificador CoinGecko (ej. `bitcoin`). */
  readonly id: string;
  /** Símbolo en mayúsculas (ej. `BTC`). */
  readonly symbol: string;
  /** Nombre legible. */
  readonly name: string;
  /** URL del logo. */
  readonly image: string;
  /** Precio actual en la divisa consultada. */
  readonly price: number;
  /** Variación porcentual en 24 h. */
  readonly changePercent24h: number;
  /** Capitalización de mercado. */
  readonly marketCap: number;
  /** Volumen de 24 h. */
  readonly volume24h: number;
  /** Máximo de 24 h. */
  readonly high24h: number;
  /** Mínimo de 24 h. */
  readonly low24h: number;
  /** Serie de precios de 7 días, lista para Chart.js. */
  readonly sparkline7d: number[];
  /** Fecha ISO de la última actualización del proveedor. */
  readonly lastUpdated: string;
}

/** Procedencia de un snapshot de métricas. */
export type MetricsSource = 'live' | 'cache' | 'stale-cache';

/**
 * Snapshot de mercado con metadatos de caché del backend.
 */
export interface MarketMetricsSnapshot {
  /** Activos incluidos en la respuesta. */
  readonly metrics: MarketMetric[];
  /** Divisa de los importes. */
  readonly currency: string;
  /** Origen de los datos (`live`, `cache` o `stale-cache`). */
  readonly source: MetricsSource;
  /** Fecha ISO en la que el backend sirvió el snapshot. */
  readonly fetchedAt: string;
  /** Segundos restantes de vigencia de la caché. */
  readonly cacheExpiresInSeconds: number;
}

/**
 * Elemento de la watchlist persistido en memoria en el backend.
 */
export interface WatchlistItem {
  /** Identificador único del elemento. */
  readonly id: string;
  /** Propietario. */
  readonly userId: string;
  /** Id CoinGecko. */
  readonly coinId: string;
  /** Símbolo. */
  readonly symbol: string;
  /** Precio objetivo, o `null`. */
  readonly targetPrice: number | null;
  /** Nota libre, o `null`. */
  readonly notes: string | null;
  /** Fecha ISO de creación. */
  readonly createdAt: string;
  /** Fecha ISO de última modificación. */
  readonly updatedAt: string;
}

/**
 * Cuerpo de `POST /watchlist`.
 */
export interface CreateWatchlistItemPayload {
  /** Id CoinGecko a seguir. */
  readonly coinId: string;
  /** Símbolo a persistir. */
  readonly symbol: string;
  /** Precio objetivo opcional. */
  readonly targetPrice?: number;
  /** Nota opcional. */
  readonly notes?: string;
}

/**
 * Registro de auditoría generado por el interceptor del backend.
 */
export interface AuditLog {
  /** Identificador único. */
  readonly id: string;
  /** Id del usuario que mutó. */
  readonly userId: string;
  /** Correo del usuario. */
  readonly userEmail: string;
  /** Rol efectivo. */
  readonly role: string;
  /** Verbo HTTP. */
  readonly action: string;
  /** Ruta afectada. */
  readonly resource: string;
  /** Código HTTP resultante. */
  readonly statusCode: number;
  /** Resultado de la operación. */
  readonly outcome: 'success' | 'failure';
  /** Cuerpo saneado, o `null`. */
  readonly payload: Record<string, unknown> | null;
  /** Fecha ISO de la acción. */
  readonly timestamp: string;
}
