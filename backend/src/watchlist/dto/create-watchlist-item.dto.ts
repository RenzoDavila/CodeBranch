import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo esperado por `POST /watchlist`.
 */
export class CreateWatchlistItemDto {
  /** Id del activo en CoinGecko (ej. `bitcoin`). */
  @IsString()
  @Length(1, 60)
  coinId: string;

  /** Símbolo del activo (ej. `BTC`). */
  @IsString()
  @Length(1, 12)
  symbol: string;

  /** Precio objetivo opcional para alertas visuales en el dashboard. */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetPrice?: number;

  /** Anotación libre opcional. */
  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;
}
