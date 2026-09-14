import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../auth/domain/user-role.enum';
import { SessionPayload } from '../auth/domain/user.entity';
import { WatchlistItem } from './domain/watchlist-item.entity';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { UpdateWatchlistItemDto } from './dto/update-watchlist-item.dto';
import { WatchlistRepository } from './repositories/watchlist.repository';

/**
 * Casos de uso del CRUD de watchlist.
 *
 * Aplica la regla de propiedad del recurso: un `trader` solo opera sobre sus
 * propios elementos, mientras que un `admin` tiene visibilidad y control
 * sobre los de cualquier usuario.
 */
@Injectable()
export class WatchlistService {
  /**
   * @param repository Repositorio de watchlists (implementación en memoria).
   */
  constructor(private readonly repository: WatchlistRepository) {}

  /**
   * Lista los elementos visibles para la sesión actual.
   * @param session Sesión autenticada.
   * @returns Todos los elementos si es `admin`; los propios en otro caso.
   */
  findAll(session: SessionPayload): WatchlistItem[] {
    return session.role === UserRole.ADMIN
      ? this.repository.findAll()
      : this.repository.findByUserId(session.sub);
  }

  /**
   * Recupera un elemento concreto.
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   * @throws {NotFoundException} Si el elemento no existe.
   * @throws {ForbiddenException} Si el elemento pertenece a otro usuario.
   * @returns El elemento solicitado.
   */
  findOne(session: SessionPayload, id: string): WatchlistItem {
    return this.getOwnedItem(session, id);
  }

  /**
   * Añade un activo a la watchlist del usuario autenticado.
   * @param session Sesión autenticada.
   * @param dto Datos del activo.
   * @throws {ConflictException} Si el activo ya está en su watchlist.
   * @returns El elemento creado.
   */
  create(
    session: SessionPayload,
    dto: CreateWatchlistItemDto,
  ): WatchlistItem {
    const coinId = dto.coinId.trim().toLowerCase();

    if (this.repository.findByUserAndCoin(session.sub, coinId)) {
      throw new ConflictException(
        `"${coinId}" ya existe en la watchlist del usuario`,
      );
    }

    return this.repository.create({
      userId: session.sub,
      coinId,
      symbol: dto.symbol.trim().toUpperCase(),
      targetPrice: dto.targetPrice ?? null,
      notes: dto.notes?.trim() ?? null,
    });
  }

  /**
   * Actualiza un elemento existente.
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   * @param dto Campos a modificar.
   * @throws {NotFoundException} Si el elemento no existe.
   * @throws {ForbiddenException} Si el elemento pertenece a otro usuario.
   * @returns El elemento actualizado.
   */
  update(
    session: SessionPayload,
    id: string,
    dto: UpdateWatchlistItemDto,
  ): WatchlistItem {
    this.getOwnedItem(session, id);

    const updated = this.repository.update(id, {
      ...(dto.symbol !== undefined && { symbol: dto.symbol.trim().toUpperCase() }),
      ...(dto.targetPrice !== undefined && { targetPrice: dto.targetPrice }),
      ...(dto.notes !== undefined && { notes: dto.notes.trim() }),
    });

    if (!updated) {
      throw new NotFoundException(`Elemento de watchlist "${id}" no encontrado`);
    }

    return updated;
  }

  /**
   * Elimina un elemento de la watchlist.
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   * @throws {NotFoundException} Si el elemento no existe.
   * @throws {ForbiddenException} Si el elemento pertenece a otro usuario.
   */
  remove(session: SessionPayload, id: string): void {
    this.getOwnedItem(session, id);
    this.repository.delete(id);
  }

  /**
   * Resuelve un elemento validando existencia y propiedad.
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   * @throws {NotFoundException} Si el elemento no existe.
   * @throws {ForbiddenException} Si no pertenece al usuario y no es `admin`.
   * @returns El elemento validado.
   */
  private getOwnedItem(session: SessionPayload, id: string): WatchlistItem {
    const item = this.repository.findById(id);

    if (!item) {
      throw new NotFoundException(`Elemento de watchlist "${id}" no encontrado`);
    }

    if (item.userId !== session.sub && session.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'No puedes operar sobre la watchlist de otro usuario',
      );
    }

    return item;
  }
}
