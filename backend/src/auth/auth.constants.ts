/**
 * Secreto HMAC usado para firmar los JWT simulados.
 * En un entorno real provendría de un gestor de secretos; aquí se permite
 * sobreescribirlo por variable de entorno para no hardcodear en despliegues.
 */
export const JWT_SECRET: string =
  process.env.JWT_SECRET ?? 'codebranch-financial-dashboard-dev-secret';

/**
 * Tiempo de vida del token en segundos (1 hora).
 */
export const JWT_EXPIRES_IN_SECONDS = 3600;
