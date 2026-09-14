# AI Prompts — Real-Time Financial Dashboard

Documentación del proceso de la prueba técnica: cómo se partió el trabajo en prompts, qué se pidió en cada fase y los dos fallos que hubo que corregir a mano antes de dar el entregable por cerrado.

## Key Prompts

La conversación se diseñó en tres fases, cada una con un prompt de arranque acotado. El objetivo era evitar un “hazlo todo” y forzar entregas incrementales (backend ejecutable → SPA consumiendo la API → batería de tests sobre la lógica crítica).

### 0. Contrato de arquitectura (prompt de sistema)

Antes de escribir código se fijó el marco:

- Stack: NestJS (REST) + Angular 18+ standalone (Signals, `@if`/`@for`), Tailwind, Angular Material, Chart.js (`ng2-charts`).
- Clean Architecture Lite: Controller → Service → InMemory Repository.
- JSDoc en APIs públicas. Cero sobre-ingeniería. RBAC (`viewer` / `trader` / `admin`) como requisito de negocio, no como adorno.

La IA debía responder `Entendido` y esperar instrucciones. Eso evitó que inventara un alcance distinto al del enunciado.

### 1. Arquitectura Backend

Prompt de fase: generar la API en `/backend` con Auth, proxy CoinGecko, Watchlist y Audit.

Qué se pidió explícitamente:

- `POST /auth/mock-login` emitiendo JWT por rol + `RolesGuard` para proteger rutas.
- `GET /financial/metrics` cacheado 60 s (TTL en memoria) para no morir por rate-limit de CoinGecko.
- CRUD de watchlist solo para `trader`/`admin`.
- Interceptor que escribe `AuditLog` en cada mutación; `GET /audit/logs` solo `admin`.
- Persistencia en Arrays/Maps. Código directamente ejecutable.

Resultado: módulos `AuthModule`, `FinancialModule`, `WatchlistModule` y `AuditModule`, con repositorios in-memory y CORS hacia `http://localhost:4200`.

### 2. Consumo Frontend

Prompt de fase: SPA Angular 18+ en `/frontend` contra `http://localhost:3000`.

Qué se pidió explícitamente:

- `AuthService` con Signals (`token`, `role`) y `login(role)` → `POST /auth/mock-login`.
- `authInterceptor` registrado con `provideHttpClient(withInterceptors([authInterceptor]))`.
- `RoleSwitcherComponent` (Material select) en la cabecera.
- Dashboard con `@if` según el Signal de rol: métricas para todos, watchlist para trader/admin, auditoría para admin.
- `MetricsChartComponent` pintando `sparkline7d` con ng2-charts.
- Watchlist y tabla Material de audit logs.

Resultado: la UI refleja el RBAC en plantilla y consume la API real. El gráfico es dinámico al cambiar de activo.

### 3. Pruebas estratégicas

Prompt de fase: no testear renderizado básico; cubrir solo la lógica que puede romper el enunciado.

Qué se pidió explícitamente:

1. Jest / NestJS — `RolesGuard`: un `viewer` recibe `ForbiddenException` (403) en rutas de `trader`/`admin`.
2. Jest / NestJS — `FinancialService`: dos lecturas dentro de 60 s disparan una sola llamada HTTP simulada al proxy CoinGecko.
3. Angular — `AuthService` + `roleGuard`: cambiar de rol actualiza el Signal; el guard permite o bloquea la navegación según ese Signal.

Resultado: `backend/src/common/guards/roles.guard.spec.ts`, `backend/src/financial/financial.service.spec.ts` y `frontend/src/app/core/auth/auth.service.spec.ts`.

Cómo correrlas:

```bash
cd backend && npm test
cd frontend && npx ng test --watch=false
```

> El frontend del scaffold Angular 22 usa Vitest, no Karma. Las specs están escritas con la API de Jasmine (`describe` / `it` / `expect`) y se ejecutan con `ng test`.

---

## AI Errors & Fixes (Requisito Crítico)

### 1. Brecha de seguridad en UI (`@if` sin guard de ruta)

**Qué hizo la IA.** En el dashboard ocultó correctamente los bloques de Admin (y la watchlist) con el control de flujo de Angular 18+:

```html
@if (auth.isAdmin()) {
  <app-audit-log />
}
```

Eso basta para no *mostrar* la tabla si el Signal de rol no es `admin`. No basta para *autorizar* el recurso.

**Qué omitió.** No protegió `/audit` en el router. Un `viewer` o `trader` podía escribir `http://localhost:4200/audit` a mano y el `AuditLogComponent` se instanciaba igual, disparando `GET /audit/logs` (el backend sí devolvía 403, pero la ruta de la SPA quedaba abierta).

**Cómo se detectó.** Navegación manual por URL con sesión `viewer` / `trader` después de ver que el enlace “Auditoría” desaparecía de la cabecera. Ocultar no es autorizar.

**Fix aplicado.** `RoleGuard` (`CanActivateFn`) leyendo el Signal de `AuthService` y registrado en `app.routes.ts`:

```ts
{
  path: 'audit',
  component: AuditLogComponent,
  canActivate: [roleGuard],
  data: { roles: ['admin'] },
}
```

Si el rol actual no está en `data.roles`, el guard redirige a `/`. La UI (`@if`) y el router (`canActivate`) quedan alineados: uno oculta, el otro impide la navegación directa.

### 2. Colisión de ecosistema (ESM vs CJS)

**Qué hizo la IA.** Generó Jest en el modo CommonJS por defecto del scaffold Nest (`ts-jest` emitiendo `require()`, sin `useESM`). En un NestJS 10/CJS eso arranca. Aquí no.

**Por qué colapsó.** NestJS 12 publica `@nestjs/common` (y el resto de `@nestjs/*`) como ESM puro (`"type": "module"`). Node 22, cuando Jest carga esos paquetes vía `require()`, falla:

```
Must use import to load ES Module: node_modules/@nestjs/common/index.js
```

Node solo soporta `require(esm)` de forma nativa a partir de 24.9. El entorno de la prueba es Node 22.

**Cómo se detectó.** `npm test` / `npm run test:e2e` rompían al importar cualquier archivo que tocara `@nestjs/common` (el `RolesGuard`, el `FinancialService`, etc.). No era un fallo de las aserciones: la suite ni siquiera llegaba a instanciar el guard.

**Fix aplicado.** Reconfigurar Jest para ejecutarse nativamente en ESM (`backend/jest.config.ts`):

- `preset: 'ts-jest/presets/default-esm'`
- `extensionsToTreatAsEsm: ['.ts']`
- `useESM: true` en el transform de `ts-jest`
- `node --experimental-vm-modules` (ya lo traía el `package.json` del scaffold)

Con eso `ts-jest` emite `import` en lugar de `require()`, Node 22 carga `@nestjs/common` como ESM y la suite (403 del `viewer`, TTL de 60 s del proxy) corre en verde.

---

## Arranque local vs Docker

```bash
# local
cd backend && npm run start:dev    # :3000
cd frontend && npm start           # :4200

# docker
docker compose up --build
```

- API: http://localhost:3000/health  
- UI: http://localhost:4200  
- Selector de sesión en la cabecera: Viewer / Trader / Admin (`POST /auth/mock-login`).
