/**
 * Entrada almacenada en la caché con su marca temporal de escritura.
 * @template T Tipo del valor cacheado.
 */
interface CacheEntry<T> {
  /** Valor cacheado. */
  readonly value: T;
  /** Epoch en milisegundos del momento en que se escribió la entrada. */
  readonly storedAt: number;
}

/**
 * Caché en memoria con expiración por tiempo (TTL), sin dependencias externas.
 *
 * Está pensada para amortiguar el *rate-limiting* de APIs públicas: además de
 * `get()` (que respeta el TTL) expone `getStale()`, que permite degradar
 * elegantemente devolviendo el último valor conocido cuando el origen falla.
 *
 * @template T Tipo del valor cacheado.
 */
export class TtlCache<T> {
  /** Almacén interno indexado por clave de caché. */
  private readonly entries = new Map<string, CacheEntry<T>>();

  /**
   * @param ttlMs Tiempo de vida de cada entrada en milisegundos.
   */
  constructor(private readonly ttlMs: number) {}

  /**
   * Obtiene un valor vigente (no expirado).
   * @param key Clave de caché.
   * @returns El valor si sigue vigente, o `undefined` si no existe o expiró.
   */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Obtiene un valor ignorando el TTL, junto con su antigüedad.
   * Se usa como *fallback* cuando la API de origen no responde.
   * @param key Clave de caché.
   * @returns El valor y su antigüedad en milisegundos, o `undefined`.
   */
  getStale(key: string): { value: T; ageMs: number } | undefined {
    const entry = this.entries.get(key);

    return entry
      ? { value: entry.value, ageMs: Date.now() - entry.storedAt }
      : undefined;
  }

  /**
   * Escribe (o sobreescribe) un valor y reinicia su TTL.
   * @param key Clave de caché.
   * @param value Valor a almacenar.
   * @returns El propio valor almacenado, para permitir encadenamiento.
   */
  set(key: string, value: T): T {
    this.entries.set(key, { value, storedAt: Date.now() });
    return value;
  }

  /**
   * Calcula los segundos restantes de vigencia de una entrada.
   * @param key Clave de caché.
   * @returns Segundos hasta la expiración (0 si no existe o ya expiró).
   */
  getRemainingTtlSeconds(key: string): number {
    const entry = this.entries.get(key);

    if (!entry) {
      return 0;
    }

    const remainingMs = this.ttlMs - (Date.now() - entry.storedAt);
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  /**
   * Vacía por completo la caché.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Indica si una entrada superó su TTL.
   * @param entry Entrada a evaluar.
   * @returns `true` si la entrada está expirada.
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.storedAt >= this.ttlMs;
  }
}
