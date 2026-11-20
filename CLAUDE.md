# Lirios · Dumish Blooms — instrucciones para agentes

Tienda Angular 21 (standalone + signals, SCSS, Vitest) con Supabase, Vercel Functions (`api/`) y Cloudflare R2. Se está construyendo el **Taller** (costeo y producción bajo pedido) según `PLAN.md`, en la rama `feat/taller`, **un paquete a la vez** en el orden de `PLAN.md` §8.

## Leer primero

- `PLAN.md` — el plan vigente: §2 decisiones, §3 supuestos, §4 arquitectura y contratos (firmas fijas), §7 protocolo, §8 tu paquete, §9 sus pruebas. `MEGAUPGRADE-PLAN.md` es la misma versión original; manda `PLAN.md`.
- `DESIGN.md` — sistema visual («El escaparate sereno»; panel: «Mesa de taller»).
- `PRODUCT.md` — producto y voz.
- `.impeccable/surfaces/<superficie>.md` — brief de cada pantalla, con su **Contrato de prueba** (selectores, inputs/outputs, `data-testid`, textos).
- `docs/entregas/` — notas de entrega de cada paquete (escribe la tuya al terminar).
- `ADMIN_PLAN.md` está **en pausa**; no se implementa.

## Reglas (PLAN.md §7.2)

1. Solo `pnpm`. Nunca `npm` ni `npx` (`pnpm exec`, `pnpm dlx`).
2. **Mobile-first**: CSS para 390 px y se amplía con `@include from(...)`. Nada de scroll horizontal a 360 px. Objetivos táctiles ≥ 44 px. Acción principal al alcance del pulgar (barra fija inferior).
3. Código nuevo sin hexadecimales: solo tokens de `src/styles/_tokens.scss`. Si falta un token, se pide al dueño del kit (A2 durante la Oleada 1; después, el líder).
4. Antes de crear un componente se busca en `src/app/ui/`. Si algo se repite dos veces, va al kit (lo agrega el dueño del kit).
5. Componentes standalone, `ChangeDetectionStrategy.OnPush`, inputs y estado con señales, rutas lazy.
6. Nunca `innerHTML`. Textos en español de Guatemala, lenguaje de la dueña (sin «slug», «SKU», «BOM»).
7. Nada de datos inventados sin rotular: lo de la semilla se marca «demostración».
8. Dinero: `formatGTQ`. Fechas: zona `America/Guatemala`. Nunca aritmética de dinero con flotantes sin redondear a 2.
9. Ningún secreto en el repo ni en `public/config.js`. No leer `private/`. `.env.local` está en `.gitignore` y no se sube.
10. No tocar archivos de otro dueño (PLAN.md §7.1 y la lista de archivos de cada paquete). Si hace falta, se pide al líder en la nota de entrega o se detiene.
11. **Las pruebas del catálogo no se modifican** (`**/*.catalog.spec.ts`, `api/**/*.catalog.test.ts`, `supabase/tests/**`, `scripts/verify-*.mjs`, `scripts/gen-golden-sql.mjs`). Si una parece equivocada, se detiene y se reporta al líder con el caso concreto. Se pueden agregar pruebas propias en archivos `*.spec.ts` normales.
12. No cambiar firmas de §4 (RPC, dominio, `src/app/core/domain/types.ts`) sin aprobación del líder.
13. Una función SQL, un archivo dueño (§4.1). Toda función nueva trae su `revoke` y sus `grant` en el mismo archivo.

Además: no hacer `git commit` salvo que se pida (un commit de cierre por paquete); `src/app/core/domain/types.ts` es solo del líder; el SCSS público ya aprobado no se reescribe hasta D3.

## Entorno local (PLAN.md §4.3)

En esta máquina otro proyecto (`horarios`) usa los puertos 54321–54327: **nunca tocar sus contenedores**. Este proyecto usa:

| Servicio | Dirección |
| --- | --- |
| Supabase API / base / Studio / correo | `127.0.0.1:55321` / `55322` / `55323` / `55324` (sombra 55320, analítica 55327, pooler 55329) |
| S3 local (SeaweedFS, en lugar de R2) | `http://127.0.0.1:58333`, bucket `lirios-dev` (lectura anónima) |
| API local (`api/**/*.ts`) | `http://127.0.0.1:4310` |
| Angular (`ng serve`, proxy `/api` → 4310) | `http://localhost:4200` |

`.env.local` (no versionado) = `.env.example` + las claves de `pnpm exec supabase status -o env`.

## Scripts clave

| Script | Qué hace |
| --- | --- |
| `pnpm run stack:up` / `stack:down` | Supabase local + SeaweedFS + bucket (`s3:up` / `s3:down` solo el S3) |
| `pnpm run dev` | API local (`dev:api`, con `tsx watch`) + `ng serve` en `:4200`; Ctrl+C detiene ambos |
| `pnpm run db:reset` | Reaplica migraciones y semilla (una sola base local: solo el agente activo) |
| `pnpm run db:test` | `db:golden` (SQL de los casos dorados) + pgTAP |
| `pnpm run db:types` | Regenera `src/app/core/data/database.types.ts` |
| `pnpm test` | Vitest de Angular (jsdom; `src/test-setup.ts` sustituye `showModal`/`close`) |
| `pnpm run test:api` | Vitest en Node para `api/**` y `server/**` (sin servidor) |
| `pnpm run typecheck:api` · `build` · `verify:public-build` | Tipos de Functions, build, revisión del build público |
| `pnpm run verify:tokens` · `verify:migrations` · `verify:flows` | Hexadecimales fuera de tokens · un dueño por función SQL · E2E con Chrome |

Autoverificación de cada paquete y definición de terminado: `PLAN.md` §7.3 y §7.4.
