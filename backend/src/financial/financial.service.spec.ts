import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MarketMetric } from './domain/market-metric.model';
import { FinancialService } from './financial.service';
import { CoinGeckoClient } from './infrastructure/coingecko.client';

/**
 * Métrica mínima usada como respuesta simulada de CoinGecko.
 */
const BITCOIN_METRIC: MarketMetric = {
  id: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  image: 'https://example.com/btc.png',
  price: 70_000,
  changePercent24h: 1.25,
  marketCap: 1_000_000_000_000,
  volume24h: 25_000_000_000,
  high24h: 71_000,
  low24h: 69_000,
  sparkline7d: [69_000, 70_000, 70_500],
  lastUpdated: '2026-09-14T00:00:00.000Z',
};

describe('FinancialService (TTL cache)', () => {
  let fetchMarkets: jest.MockedFunction<
    (coinIds: string[], currency: string) => Promise<MarketMetric[]>
  >;
  let service: FinancialService;

  beforeEach(() => {
    fetchMarkets = jest.fn(async () => [BITCOIN_METRIC]);
    service = new FinancialService({
      fetchMarkets,
    } as unknown as CoinGeckoClient);
  });

  it('dispara una sola petición HTTP si se pide el mismo mercado dos veces dentro del TTL de 60s', async () => {
    const first = await service.getMetrics(['bitcoin']);
    const second = await service.getMetrics(['bitcoin']);

    expect(fetchMarkets).toHaveBeenCalledTimes(1);
    expect(fetchMarkets).toHaveBeenCalledWith(['bitcoin'], 'usd');

    expect(first.source).toBe('live');
    expect(second.source).toBe('cache');
    expect(second.metrics).toEqual(first.metrics);
    expect(second.cacheExpiresInSeconds).toBeGreaterThan(0);
    expect(second.cacheExpiresInSeconds).toBeLessThanOrEqual(60);
  });

  it('normaliza el orden de ids para reutilizar la misma entrada de caché', async () => {
    await service.getMetrics(['ethereum', 'bitcoin']);
    await service.getMetrics(['bitcoin', 'ethereum']);

    expect(fetchMarkets).toHaveBeenCalledTimes(1);
    expect(fetchMarkets).toHaveBeenCalledWith(['bitcoin', 'ethereum'], 'usd');
  });

  it('vuelve a llamar al proveedor tras invalidar la caché', async () => {
    await service.getMetrics(['bitcoin']);
    service.invalidateCache();
    await service.getMetrics(['bitcoin']);

    expect(fetchMarkets).toHaveBeenCalledTimes(2);
  });
});
