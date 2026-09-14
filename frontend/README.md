# Real-Time Financial Dashboard — Frontend (Angular)

SPA standalone que consume la API NestJS en `http://localhost:3000`.

## Arranque

```bash
# terminal 1
cd backend && npm run start:dev

# terminal 2
cd frontend && npm start
```

La UI queda en [http://localhost:4200](http://localhost:4200). Al cargar, pide un JWT de `viewer` y el selector de la cabecera cambia de rol al instante (`POST /auth/mock-login`).

## RBAC en la UI

| Rol      | Métricas | Watchlist | Auditoría (`/audit`) |
| -------- | -------- | --------- | -------------------- |
| `viewer` | sí       | oculto    | oculto + guard       |
| `trader` | sí       | CRUD      | oculto + guard       |
| `admin`  | sí       | CRUD      | tabla + ruta         |

El gráfico de `MetricsChartComponent` pinta el `sparkline7d` de CoinGecko vía ng2-charts y se actualiza al seleccionar otra moneda.
