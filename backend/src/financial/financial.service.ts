import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  CoinSearchHit,
  MarketMetric,
  MarketMetricsSnapshot,
} from './domain/market-metric.model';
import { CoinGeckoClient } from './infrastructure/coingecko.client';
import { TtlCache } from './infrastructure/ttl-cache';

/** TTL de la caché de métricas: 60 segundos, según requisito. */
export const METRICS_CACHE_TTL_MS = 60_000;

/** TTL de la caché de búsqueda: 30 s, para no martillar CoinGecko desde el autocomplete. */
export const SEARCH_CACHE_TTL_MS = 30_000;

/** Activos mostrados por defecto en el dashboard. */
export const DEFAULT_COIN_IDS: readonly string[] = Object.freeze([
  'bitcoin',
  'ethereum',
  'solana',
  'cardano',
  'ripple',
  'dogecoin',
  'polkadot',
  'chainlink',
]);

/** Divisa de referencia por defecto. */
export const DEFAULT_CURRENCY = 'usd';

/**
 * Casos de uso de datos de mercado.
 *
 * Envuelve al proveedor externo con una caché en memoria de 60 s para evitar
 * el rate-limiting de CoinGecko (el dashboard consulta en *polling*), y
 * degrada a la última respuesta conocida si el proveedor falla.
 */
@Injectable()
export class FinancialService {
  /** Logger contextualizado. */
  private readonly logger = new Logger(FinancialService.name);

  /** Caché de snapshots indexada por combinación de activos + divisa. */
  private readonly cache = new TtlCache<MarketMetric[]>(METRICS_CACHE_TTL_MS);

  /** Caché de resultados de búsqueda indexada por query normalizada. */
  private readonly searchCache = new TtlCache<CoinSearchHit[]>(SEARCH_CACHE_TTL_MS);

  /**
   * @param coinGeckoClient Cliente del proveedor de datos de mercado.
   */
  constructor(private readonly coinGeckoClient: CoinGeckoClient) {}

  /**
   * Devuelve las métricas de mercado, sirviéndolas de caché cuando siguen
   * vigentes (< 60 s) y refrescándolas contra el proveedor en caso contrario.
   *
   * @param coinIds Activos a consultar. Si se omite, usa `DEFAULT_COIN_IDS`.
   * @param currency Divisa de referencia. Por defecto `usd`.
   * @throws {ServiceUnavailableException} Si el proveedor falla y no existe
   * ninguna respuesta previa en caché de la que degradar.
   * @returns Snapshot con las métricas y metadatos de frescura.
   */
  async getMetrics(
    coinIds: readonly string[] = DEFAULT_COIN_IDS,
    currency: string = DEFAULT_CURRENCY,
  ): Promise<MarketMetricsSnapshot> {
    const ids = this.normalizeCoinIds(coinIds);
    const cacheKey = this.buildCacheKey(ids, currency);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      this.logger.debug(`Cache HIT para ${cacheKey}`);
      return this.buildSnapshot(cached, currency, 'cache', cacheKey);
    }

    try {
      const metrics = await this.coinGeckoClient.fetchMarkets(ids, currency);
      this.cache.set(cacheKey, metrics);
      return this.buildSnapshot(metrics, currency, 'live', cacheKey);
    } catch (error) {
      return this.recoverFromCache(error, cacheKey, currency);
    }
  }

  /**
   * Busca activos en CoinGecko por texto libre.
   * Cachea 30 s por query para que el debounce del autocomplete no dispare
   * una petición HTTP por cada tecla repetida.
   *
   * @param query Texto de búsqueda.
   * @throws {ServiceUnavailableException} Si el proveedor falla y no hay caché previa.
   * @returns Coincidencias `{ id, symbol, name }`.
   */
  async search(query: string): Promise<CoinSearchHit[]> {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    const cached = this.searchCache.get(normalized);
    if (cached) {
      this.logger.debug(`Search cache HIT para "${normalized}"`);
      return cached;
    }

    try {
      const hits = await this.coinGeckoClient.searchCoins(normalized);
      return this.searchCache.set(normalized, hits);
    } catch (error) {
      const stale = this.searchCache.getStale(normalized);
      if (stale) {
        return stale.value;
      }

      const reason = error instanceof Error ? error.message : 'error desconocido';
      throw new ServiceUnavailableException(
        `No se pudo buscar en CoinGecko: ${reason}`,
      );
    }
  }

  /**
   * Invalida la caché de métricas. Expuesto para forzar un refresco manual
   * desde la UI y para escenarios de test.
   */
  invalidateCache(): void {
    this.cache.clear();
    this.searchCache.clear();
    this.logger.log('Caché de métricas invalidada');
  }

  /**
   * Intenta servir el último valor conocido cuando el proveedor falla.
   * @param error Error original lanzado por el cliente HTTP.
   * @param cacheKey Clave de caché consultada.
   * @param currency Divisa de referencia.
   * @throws {ServiceUnavailableException} Si no hay valor previo en caché.
   * @returns Snapshot marcado como `stale-cache`.
   */
  private recoverFromCache(
    error: unknown,
    cacheKey: string,
    currency: string,
  ): MarketMetricsSnapshot {
    const reason = error instanceof Error ? error.message : 'error desconocido';
    const stale = this.cache.getStale(cacheKey);

    if (!stale) {
      this.logger.error(`Proveedor caído y sin caché previa: ${reason}`);
      throw new ServiceUnavailableException(
        `No se pudieron obtener las métricas de mercado: ${reason}`,
      );
    }

    this.logger.warn(
      `Proveedor caído (${reason}). Sirviendo caché de ${Math.round(stale.ageMs / 1000)}s`,
    );
    return this.buildSnapshot(stale.value, currency, 'stale-cache', cacheKey);
  }

  /**
   * Ensambla la respuesta pública con sus metadatos de caché.
   * @param metrics Métricas a exponer.
   * @param currency Divisa de referencia.
   * @param source Procedencia de los datos.
   * @param cacheKey Clave usada, para calcular el TTL restante.
   * @returns Snapshot listo para el controlador.
   */
  private buildSnapshot(
    metrics: MarketMetric[],
    currency: string,
    source: MarketMetricsSnapshot['source'],
    cacheKey: string,
  ): MarketMetricsSnapshot {
    return {
      metrics,
      currency,
      source,
      fetchedAt: new Date().toISOString(),
      cacheExpiresInSeconds: this.cache.getRemainingTtlSeconds(cacheKey),
    };
  }

  /**
   * Sanea y ordena los ids recibidos para que la clave de caché sea estable
   * independientemente del orden en que lleguen en el query string.
   * @param coinIds Ids crudos.
   * @returns Ids normalizados, únicos y ordenados.
   */
  private normalizeCoinIds(coinIds: readonly string[]): string[] {
    const normalized = coinIds
      .map((id) => id.trim().toLowerCase())
      .filter((id) => id.length > 0);

    const unique = [...new Set(normalized)].sort();
    return unique.length > 0 ? unique : [...DEFAULT_COIN_IDS].sort();
  }

  /**
   * Construye la clave de caché de una consulta.
   * @param coinIds Ids normalizados.
   * @param currency Divisa de referencia.
   * @returns Clave determinista.
   */
  private buildCacheKey(coinIds: string[], currency: string): string {
    return `${currency.toLowerCase()}:${coinIds.join(',')}`;
  }
}
