import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CreateWatchlistItemInput,
  UpdateWatchlistItemInput,
  WatchlistItem,
} from '../domain/watchlist-item.entity';

/**
 * Contrato del repositorio de watchlists.
 */
export abstract class WatchlistRepository {
  /**
   * Lista todos los elementos de todos los usuarios.
   * @returns Elementos ordenados por fecha de creación ascendente.
   */
  abstract findAll(): WatchlistItem[];

  /**
   * Lista los elementos de un usuario.
   * @param userId Id del propietario.
   * @returns Elementos del usuario.
   */
  abstract findByUserId(userId: string): WatchlistItem[];

  /**
   * Busca un elemento por su id.
   * @param id Id del elemento.
   * @returns El elemento o `undefined`.
   */
  abstract findById(id: string): WatchlistItem | undefined;

  /**
   * Busca un activo concreto dentro de la watchlist de un usuario.
   * @param userId Id del propietario.
   * @param coinId Id del activo en CoinGecko.
   * @returns El elemento o `undefined`.
   */
  abstract findByUserAndCoin(
    userId: string,
    coinId: string,
  ): WatchlistItem | undefined;

  /**
   * Crea un nuevo elemento.
   * @param input Datos del elemento.
   * @returns El elemento creado.
   */
  abstract create(input: CreateWatchlistItemInput): WatchlistItem;

  /**
   * Actualiza parcialmente un elemento existente.
   * @param id Id del elemento.
   * @param changes Campos a modificar.
   * @returns El elemento actualizado o `undefined` si no existe.
   */
  abstract update(
    id: string,
    changes: UpdateWatchlistItemInput,
  ): WatchlistItem | undefined;

  /**
   * Elimina un elemento.
   * @param id Id del elemento.
   * @returns `true` si se eliminó, `false` si no existía.
   */
  abstract delete(id: string): boolean;
}

/**
 * Implementación en memoria del repositorio de watchlists.
 * Usa un `Map<string, WatchlistItem>` indexado por id de elemento.
 */
@Injectable()
export class InMemoryWatchlistRepository extends WatchlistRepository {
  /** Almacén en memoria indexado por id de elemento. */
  private readonly items = new Map<string, WatchlistItem>();

  /**
   * Lista todos los elementos de todos los usuarios.
   * @returns Nuevo array con los elementos.
   */
  findAll(): WatchlistItem[] {
    return [...this.items.values()];
  }

  /**
   * Lista los elementos de un usuario.
   * @param userId Id del propietario.
   * @returns Elementos del usuario.
   */
  findByUserId(userId: string): WatchlistItem[] {
    return this.findAll().filter((item) => item.userId === userId);
  }

  /**
   * Busca un elemento por su id.
   * @param id Id del elemento.
   * @returns El elemento o `undefined`.
   */
  findById(id: string): WatchlistItem | undefined {
    return this.items.get(id);
  }

  /**
   * Busca un activo concreto dentro de la watchlist de un usuario.
   * @param userId Id del propietario.
   * @param coinId Id del activo en CoinGecko.
   * @returns El elemento o `undefined`.
   */
  findByUserAndCoin(
    userId: string,
    coinId: string,
  ): WatchlistItem | undefined {
    return this.findByUserId(userId).find((item) => item.coinId === coinId);
  }

  /**
   * Crea un nuevo elemento.
   * @param input Datos del elemento.
   * @returns El elemento creado.
   */
  create(input: CreateWatchlistItemInput): WatchlistItem {
    const now = new Date().toISOString();
    const item: WatchlistItem = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);
    return item;
  }

  /**
   * Actualiza parcialmente un elemento existente.
   * @param id Id del elemento.
   * @param changes Campos a modificar.
   * @returns El elemento actualizado o `undefined` si no existe.
   */
  update(
    id: string,
    changes: UpdateWatchlistItemInput,
  ): WatchlistItem | undefined {
    const current = this.items.get(id);

    if (!current) {
      return undefined;
    }

    const updated: WatchlistItem = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    };

    this.items.set(id, updated);
    return updated;
  }

  /**
   * Elimina un elemento.
   * @param id Id del elemento.
   * @returns `true` si se eliminó, `false` si no existía.
   */
  delete(id: string): boolean {
    return this.items.delete(id);
  }
}
