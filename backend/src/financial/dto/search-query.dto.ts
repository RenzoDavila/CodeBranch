import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Query string admitido por `GET /financial/search`.
 */
export class SearchQueryDto {
  /**
   * Texto libre a buscar en CoinGecko (nombre, símbolo o id).
   */
  @IsString()
  @MinLength(1, { message: 'query no puede estar vacío' })
  @MaxLength(80)
  query: string;
}
