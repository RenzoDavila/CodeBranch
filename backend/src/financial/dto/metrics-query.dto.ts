import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * Query string admitido por `GET /financial/metrics`.
 */
export class MetricsQueryDto {
  /**
   * Lista de ids de CoinGecko separados por coma (ej. `bitcoin,ethereum`).
   * Si se omite, el servicio usa la cesta de activos por defecto.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9,\-\s]+$/i, {
    message: 'ids solo admite letras, números, guiones y comas',
  })
  ids?: string;

  /**
   * Divisa de referencia ISO (ej. `usd`, `eur`). Por defecto `usd`.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{3}$/i, { message: 'currency debe ser un código de 3 letras' })
  currency?: string;
}
