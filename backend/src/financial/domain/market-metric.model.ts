/**
 * Métrica de mercado normalizada de un activo cripto.
 * Es el contrato estable que consume el frontend, aislándolo del formato
 * crudo de CoinGecko.
 */
export interface MarketMetric {
  /** Identificador del activo en CoinGecko (ej. `bitcoin`). */
  readonly id: string;
  /** Símbolo en mayúsculas (ej. `BTC`). */
  readonly symbol: string;
  /** Nombre legible del activo. */
  readonly name: string;
  /** URL del logo del activo. */
  readonly image: string;
  /** Precio actual en la divisa consultada. */
  readonly price: number;
  /** Variación porcentual en las últimas 24 horas. */
  readonly changePercent24h: number;
  /** Capitalización de mercado. */
  readonly marketCap: number;
  /** Volumen negociado en 24 horas. */
  readonly volume24h: number;
  /** Máximo de las últimas 24 horas. */
  readonly high24h: number;
  /** Mínimo de las últimas 24 horas. */
  readonly low24h: number;
  /** Serie de precios de los últimos 7 días, lista para Chart.js. */
  readonly sparkline7d: number[];
  /** Fecha ISO de la última actualización reportada por el proveedor. */
  readonly lastUpdated: string;
}

/**
 * Origen del que se sirvieron las métricas en una respuesta concreta.
 *
 * - `live`: llamada real al proveedor.
 * - `cache`: caché vigente dentro del TTL.
 * - `stale-cache`: el proveedor falló y se degradó al último valor conocido.
 */
export type MetricsSource = 'live' | 'cache' | 'stale-cache';

/**
 * Respuesta de `GET /financial/metrics`: métricas + metadatos de caché.
 * Los metadatos permiten al dashboard mostrar la frescura del dato y ajustar
 * su intervalo de *polling*.
 */
export interface MarketMetricsSnapshot {
  /** Métricas normalizadas de los activos solicitados. */
  readonly metrics: MarketMetric[];
  /** Divisa de referencia usada en los importes. */
  readonly currency: string;
  /** Procedencia de los datos servidos. */
  readonly source: MetricsSource;
  /** Fecha ISO en la que el backend generó/actualizó estos datos. */
  readonly fetchedAt: string;
  /** Segundos que restan antes de que la caché expire. */
  readonly cacheExpiresInSeconds: number;
}

/**
 * Resultado reducido de `GET /financial/search`.
 * Es el contrato que consume el autocomplete de la watchlist.
 */
export interface CoinSearchHit {
  /** Identificador CoinGecko (ej. `bitcoin`). */
  readonly id: string;
  /** Símbolo en mayúsculas (ej. `BTC`). */
  readonly symbol: string;
  /** Nombre legible. */
  readonly name: string;
}
