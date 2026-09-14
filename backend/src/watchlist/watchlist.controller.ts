import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MUTATION_ROLES } from '../auth/domain/user-role.enum';
import type { SessionPayload } from '../auth/domain/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { WatchlistItem } from './domain/watchlist-item.entity';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { UpdateWatchlistItemDto } from './dto/update-watchlist-item.dto';
import { WatchlistService } from './watchlist.service';

/**
 * CRUD de la watchlist de criptomonedas.
 * Restringido a los roles `trader` y `admin`; todas sus mutaciones quedan
 * registradas automáticamente por `AuditLogInterceptor`.
 */
@Controller('watchlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MUTATION_ROLES)
export class WatchlistController {
  /**
   * @param watchlistService Casos de uso de watchlist.
   */
  constructor(private readonly watchlistService: WatchlistService) {}

  /**
   * `GET /watchlist`
   * Lista la watchlist del usuario (o de todos, si es `admin`).
   *
   * @param session Sesión autenticada.
   * @returns Elementos visibles.
   */
  @Get()
  findAll(@CurrentUser() session: SessionPayload): WatchlistItem[] {
    return this.watchlistService.findAll(session);
  }

  /**
   * `GET /watchlist/:id`
   * Recupera un elemento concreto.
   *
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   * @returns El elemento solicitado.
   */
  @Get(':id')
  findOne(
    @CurrentUser() session: SessionPayload,
    @Param('id') id: string,
  ): WatchlistItem {
    return this.watchlistService.findOne(session, id);
  }

  /**
   * `POST /watchlist`
   * Añade un activo a la watchlist.
   *
   * @param session Sesión autenticada.
   * @param dto Datos del activo.
   * @returns El elemento creado.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() session: SessionPayload,
    @Body() dto: CreateWatchlistItemDto,
  ): WatchlistItem {
    return this.watchlistService.create(session, dto);
  }

  /**
   * `PUT /watchlist/:id`
   * Actualiza los campos editables de un elemento.
   *
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   * @param dto Campos a modificar.
   * @returns El elemento actualizado.
   */
  @Put(':id')
  update(
    @CurrentUser() session: SessionPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWatchlistItemDto,
  ): WatchlistItem {
    return this.watchlistService.update(session, id, dto);
  }

  /**
   * `DELETE /watchlist/:id`
   * Elimina un elemento de la watchlist.
   *
   * @param session Sesión autenticada.
   * @param id Id del elemento.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() session: SessionPayload,
    @Param('id') id: string,
  ): void {
    this.watchlistService.remove(session, id);
  }
}
