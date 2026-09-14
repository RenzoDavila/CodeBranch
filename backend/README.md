# Real-Time Financial Dashboard — API (NestJS)

API REST que expone métricas de mercado cripto (proxy cacheado sobre CoinGecko),
un CRUD de watchlist y una bitácora de auditoría, todo bajo control de acceso
basado en roles (RBAC).

## Arranque

```bash
npm install
npm run start:dev      # http://localhost:3000
```

Variables de entorno opcionales:

| Variable             | Por defecto                         | Uso                                                |
| -------------------- | ----------------------------------- | -------------------------------------------------- |
| `PORT`               | `3000`                              | Puerto de escucha.                                 |
| `CORS_ORIGIN`        | `http://localhost:4200`             | Origen permitido para el frontend Angular.         |
| `JWT_SECRET`         | secreto de desarrollo               | Clave HMAC de firma de tokens.                     |
| `COINGECKO_API_KEY`  | —                                   | Demo API key de CoinGecko (amplía el rate-limit).  |

## Arquitectura (Clean Architecture Lite)

El flujo es siempre `Controller → Service → Repository`, y las dependencias
apuntan hacia el dominio: los servicios solo conocen clases abstractas
(`UserRepository`, `WatchlistRepository`, `AuditLogRepository`), que se usan
como tokens de inyección y se enlazan a implementaciones en memoria dentro de
cada módulo. Cambiar a una base de datos real significa escribir una nueva
implementación y cambiar el `useClass`, sin tocar la capa de negocio.

```
src/
├── auth/            AuthModule       → login simulado y emisión de JWT
├── financial/       FinancialModule  → proxy CoinGecko + caché TTL
├── watchlist/       WatchlistModule  → CRUD de activos seguidos
├── audit/           AuditModule      → bitácora (global, consumida por el interceptor)
└── common/          guards, decoradores e interceptor transversales
```

## Endpoints

| Método   | Ruta                  | Roles autorizados         | Descripción                                  |
| -------- | --------------------- | ------------------------- | -------------------------------------------- |
| `GET`    | `/health`             | público                   | Chequeo de salud.                            |
| `POST`   | `/auth/mock-login`    | público                   | Emite un JWT para el rol indicado.           |
| `GET`    | `/auth/me`            | autenticado               | Perfil de la sesión activa.                  |
| `GET`    | `/financial/metrics`  | `viewer`,`trader`,`admin` | Métricas de mercado (caché de 60 s).         |
| `GET`    | `/watchlist`          | `trader`,`admin`          | Lista la watchlist.                          |
| `GET`    | `/watchlist/:id`      | `trader`,`admin`          | Detalle de un elemento.                      |
| `POST`   | `/watchlist`          | `trader`,`admin`          | Añade un activo.                             |
| `PUT`    | `/watchlist/:id`      | `trader`,`admin`          | Actualiza símbolo, precio objetivo o notas.  |
| `DELETE` | `/watchlist/:id`      | `trader`,`admin`          | Elimina un activo.                           |
| `GET`    | `/audit/logs`         | `admin`                   | Bitácora de mutaciones.                      |

### Login simulado

```bash
curl -X POST http://localhost:3000/auth/mock-login \
  -H 'Content-Type: application/json' -d '{"role":"trader"}'
```

Devuelve `accessToken` (JWT HS256, 1 h) que debe enviarse como
`Authorization: Bearer <token>`. Hay un usuario semilla por rol
(`viewer@codebranch.dev`, `trader@codebranch.dev`, `admin@codebranch.dev`).

## Decisiones de diseño

**RBAC en dos guards encadenados.** `JwtAuthGuard` verifica el token y publica
la sesión en `request.user`; `RolesGuard` compara el rol contra la metadata de
`@Roles()`. Se declaran juntos (`@UseGuards(JwtAuthGuard, RolesGuard)`) a nivel
de controlador, de modo que el orden queda explícito y una ruta sin `@Roles()`
solo exige estar autenticado.

**Caché de 60 s con degradación a dato obsoleto.** `FinancialService` envuelve
al cliente de CoinGecko con un `TtlCache` (TTL 60 s), indexado por la
combinación normalizada de activos y divisa: `?ids=btc,eth` y `?ids=eth,btc`
comparten entrada. Si el proveedor falla o devuelve `429`, el servicio sirve la
última respuesta conocida marcándola como `stale-cache` en lugar de romper el
dashboard; solo lanza `503` si nunca llegó a cachear nada. La respuesta incluye
`source` y `cacheExpiresInSeconds` para que el frontend muestre la frescura del
dato y ajuste su intervalo de *polling*.

**Auditoría desacoplada.** `AuditLogInterceptor` está registrado como
`APP_INTERCEPTOR`, así que ningún módulo de negocio conoce la auditoría. Filtra
por verbo (`POST`/`PUT`/`PATCH`/`DELETE`) y por rol (`trader`/`admin`), y
registra tanto los éxitos como los fallos con su código HTTP, lo que deja
rastro de los intentos rechazados. Los payloads se sanean de campos sensibles
antes de persistirse y el almacén está acotado a 500 registros.

**Propiedad del recurso.** Un `trader` solo opera sobre los elementos de su
propia watchlist (`403` en caso contrario); un `admin` ve y modifica los de
cualquier usuario.

## Verificación

```bash
npm run build     # compila
npm run lint      # oxlint con reglas type-aware
```

El flujo completo (RBAC, caché y auditoría) se verificó contra la API real de
CoinGecko con el servidor levantado.

> **Nota sobre `npm run test:e2e`:** la suite en `test/app.e2e-spec.ts` documenta
> el contrato RBAC, pero no se puede ejecutar en este entorno: NestJS 12
> distribuye sus paquetes como ESM puro (`"type": "module"`) y el runtime de
> Jest solo soporta `require(esm)` a partir de Node 24.9 (aquí hay Node 22).
> Con Node ≥ 24.9 la suite corre sin cambios; migrar Jest a ESM en Node 22
> obligaría a reescribir todos los imports relativos con extensión `.js`.
