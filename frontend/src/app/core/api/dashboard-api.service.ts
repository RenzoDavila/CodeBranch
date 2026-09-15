import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';
import {
  AuditLog,
  CoinSearchHit,
  CreateWatchlistItemPayload,
  MarketMetricsSnapshot,
  WatchlistItem,
} from './api.models';

/**
 * Cliente HTTP del backend del dashboard.
 * Concentra las URLs para que los componentes no conozcan la forma de la API.
 */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  /**
   * @param http Cliente HTTP de Angular (ya pasa por `authInterceptor`).
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene las métricas de mercado cacheadas (TTL 60 s en el backend).
   *
   * @param coinIds Ids CoinGecko a consultar. Si se omite, el backend usa su cesta por defecto.
   * @returns Snapshot con métricas y metadatos de caché.
   */
  getMetrics(coinIds?: readonly string[]): Observable<MarketMetricsSnapshot> {
    let params = new HttpParams();

    if (coinIds && coinIds.length > 0) {
      params = params.set('ids', coinIds.join(','));
    }

    return this.http.get<MarketMetricsSnapshot>(`${API_URL}/financial/metrics`, {
      params,
    });
  }

  /**
   * Busca activos en CoinGecko a través del proxy del backend.
   *
   * @param query Texto libre (nombre, símbolo o id).
   * @returns Coincidencias `{ id, symbol, name }`.
   */
  searchCoins(query: string): Observable<CoinSearchHit[]> {
    return this.http.get<CoinSearchHit[]>(`${API_URL}/financial/search`, {
      params: { query },
    });
  }

  /**
   * Lista la watchlist visible para la sesión actual.
   *
   * @returns Elementos de watchlist.
   */
  getWatchlist(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(`${API_URL}/watchlist`);
  }

  /**
   * Añade un activo a la watchlist.
   *
   * @param payload Datos del activo.
   * @returns El elemento creado.
   */
  addToWatchlist(payload: CreateWatchlistItemPayload): Observable<WatchlistItem> {
    return this.http.post<WatchlistItem>(`${API_URL}/watchlist`, payload);
  }

  /**
   * Elimina un elemento de la watchlist.
   *
   * @param id Identificador del elemento.
   * @returns Completa sin cuerpo (`204`).
   */
  removeFromWatchlist(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/watchlist/${id}`);
  }

  /**
   * Recupera la bitácora de auditoría (solo `admin`).
   *
   * @param limit Número máximo de registros.
   * @returns Registros ordenados del más reciente al más antiguo.
   */
  getAuditLogs(limit = 100): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${API_URL}/audit/logs`, {
      params: { limit },
    });
  }
}
