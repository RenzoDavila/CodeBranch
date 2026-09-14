import { Injectable, Logger } from '@nestjs/common';
import { MarketMetric } from '../domain/market-metric.model';

/**
 * Forma parcial del payload de `/api/v3/coins/markets`.
 * Solo se declaran los campos que el dashboard realmente consume.
 */
interface CoinGeckoMarketDto {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  last_updated: string | null;
  sparkline_in_7d?: { price: number[] };
}

/** URL base de la API pública v3 de CoinGecko. */
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

/** Tiempo máximo de espera por respuesta del proveedor (ms). */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Cliente HTTP del proveedor de datos de mercado (CoinGecko).
 *
 * Única pieza que conoce el formato externo: obtiene el payload crudo y lo
 * traduce al modelo de dominio `MarketMetric`. No implementa caché (eso es
 * responsabilidad de `FinancialService`) ni políticas de negocio.
 */
@Injectable()
export class CoinGeckoClient {
  /** Logger contextualizado. */
  private readonly logger = new Logger(CoinGeckoClient.name);

  /**
   * Consulta los datos de mercado de una lista de activos.
   *
   * @param coinIds Identificadores CoinGecko (ej. `['bitcoin', 'ethereum']`).
   * @param currency Divisa de referencia (ej. `usd`).
   * @throws {Error} Si la petición falla, expira o responde con estado != 2xx.
   * @returns Métricas normalizadas, en el orden devuelto por el proveedor.
   */
  async fetchMarkets(
    coinIds: string[],
    currency: string,
  ): Promise<MarketMetric[]> {
    const query = new URLSearchParams({
      vs_currency: currency,
      ids: coinIds.join(','),
      order: 'market_cap_desc',
      sparkline: 'true',
      price_change_percentage: '24h',
      precision: 'full',
    });

    const url = `${COINGECKO_BASE_URL}/coins/markets?${query.toString()}`;
    this.logger.log(`GET ${url}`);

    const response = await fetch(url, {
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `CoinGecko respondió ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as CoinGeckoMarketDto[];
    return payload.map((dto) => this.toMarketMetric(dto));
  }

  /**
   * Construye los headers de la petición, añadiendo la API key de demo si
   * está configurada (aumenta la cuota de rate-limit).
   * @returns Headers HTTP a enviar.
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { accept: 'application/json' };
    const demoApiKey = process.env.COINGECKO_API_KEY;

    if (demoApiKey) {
      headers['x-cg-demo-api-key'] = demoApiKey;
    }

    return headers;
  }

  /**
   * Traduce un DTO de CoinGecko al modelo de dominio, saneando nulos.
   * @param dto Elemento crudo devuelto por el proveedor.
   * @returns Métrica de mercado normalizada.
   */
  private toMarketMetric(dto: CoinGeckoMarketDto): MarketMetric {
    return {
      id: dto.id,
      symbol: dto.symbol.toUpperCase(),
      name: dto.name,
      image: dto.image,
      price: dto.current_price ?? 0,
      changePercent24h: dto.price_change_percentage_24h ?? 0,
      marketCap: dto.market_cap ?? 0,
      volume24h: dto.total_volume ?? 0,
      high24h: dto.high_24h ?? 0,
      low24h: dto.low_24h ?? 0,
      sparkline7d: dto.sparkline_in_7d?.price ?? [],
      lastUpdated: dto.last_updated ?? new Date().toISOString(),
    };
  }
}
