import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo esperado por `PUT /watchlist/:id`.
 * Todos los campos son opcionales: solo se aplican los recibidos.
 */
export class UpdateWatchlistItemDto {
  /** Nuevo símbolo del activo. */
  @IsOptional()
  @IsString()
  @Length(1, 12)
  symbol?: string;

  /** Nuevo precio objetivo. */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetPrice?: number;

  /** Nueva anotación libre. */
  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;
}
