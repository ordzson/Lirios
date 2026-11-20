# Oleada 0 · líder/integrador (pasos 3–7)

Fecha: 2026-11-19 · Rama `feat/taller` · Sin commit (cambios en el árbol de trabajo). Pasos 1–2 ya estaban en `82ec50b`.

## Hecho

| Paso | Archivos |
| --- | --- |
| 3 · S3 local | `docker-compose.dev.yml` (SeaweedFS 4.54 en `127.0.0.1:58333`), `docker/seaweedfs/s3.json` (identidad `dev` + `anonymous` solo `Read`), `scripts/dev-s3-init.mjs` (crea `lirios-dev`, idempotente), `.env.example` (valores locales de §4.3), scripts `s3:up`/`s3:down` y `stack:up`/`stack:down` los incluyen. Sin cambios: funcionaba tal cual. `server/r2.ts` no se tocó (A4). |
| 4 · Functions en local | `tsx` 4.23.15 (devDependency, `pnpm add -D`), `scripts/dev-api.mjs` (monta `api/**/*.ts` en `127.0.0.1:4310`, resuelve la ruta en cada petición, admite `export default { fetch }`, función por defecto o `GET`/`POST`…, `[param].ts`, rechaza `..`; carga `.env.local` con `process.loadEnvFile`), `scripts/dev.mjs` (escribe `public/config.js`, arranca `tsx watch` del API y `ng serve` con prefijos `[api]`/`[ng]`; si uno cae detiene al otro; Ctrl+C detiene ambos por grupo de procesos; sin dependencias nuevas), `proxy.conf.json` (`/api` → `http://127.0.0.1:4310`), `angular.json` `serve.options.proxyConfig`, scripts `dev` y `dev:api`. |
| 5 · Pruebas con `<dialog>` | `src/test-setup.ts` (sustituto de `showModal`/`show`/`close`: cambia `open`, `close` emite el evento una vez y guarda `returnValue`), conectado en `angular.json` `test.options.setupFiles`; incluido en `tsconfig.spec.json` y excluido de `tsconfig.app.json`. `src/test-setup.spec.ts` (prueba propia, no de catálogo). |
| 6 · Contratos | `src/app/core/domain/types.ts` (copia literal de §4.2 con cabecera de dueño; `diff` contra el plan = idéntico), `supabase/tests/fixtures/README.md` (forma de `costing.json`, `promotions.json`, `bouquet.json`, reglas de ids, números, fechas, lotes, comparación y ejemplo del lirio rojo validado como JSON), `.impeccable/surfaces/ui-kit.md` (UI-01..05 + F7: `ui-number-stepper`, `ui-sheet`, `ui-confirm-dialog`, `ToastService`/`ui-toast-host`, `ui-money-input`, `ui-chip-group`, muestrario `/admin/_kit`), `.impeccable/surfaces/admin-shell.md` (UI-06: `app-admin-shell`, `ADMIN_NAV` con 10 destinos y `adminOnly`, `data-testid` `admin-shell-*`). |
| 7 · Documentos | `PLAN.md` (copia de `MEGAUPGRADE-PLAN.md`, que se conserva), `CLAUDE.md` (reglas §7.2 + punteros, puertos, scripts), nota de pausa al inicio de `ADMIN_PLAN.md`, `docs/entregas/README.md`. |

## Verificación

```
$ docker compose -f docker-compose.dev.yml down -v && pnpm run s3:up
 Container lirios-dev-s3-1 Healthy
Created S3 bucket "lirios-dev" at http://127.0.0.1:58333
$ pnpm run s3:up            # segunda vez
S3 bucket "lirios-dev" already exists at http://127.0.0.1:58333
# PUT firmado (identidad dev) de check/hello.txt, luego GET anónimo:
HTTP/1.1 200 OK · Cache-Control: public, max-age=31536000, immutable · Content-Type: text/plain · cuerpo «hola»
# tras borrar: GET anónimo 404 · PUT anónimo 403 · listado anónimo 403

$ pnpm run dev
[api] [dev-api] listening on http://127.0.0.1:4310
[api] [dev-api]   /api/health  ←  api/health.ts
[api] [dev-api]   /api/uploads/delete  ←  api/uploads/delete.ts
[api] [dev-api]   /api/uploads/sign  ←  api/uploads/sign.ts
[ng]    ➜  Local:   http://localhost:4200/
$ curl http://localhost:4200/api/health
HTTP/1.1 200 OK
{"ok":true,"services":{"supabase":true,"r2":false}}
# GET / → 200 · /api/nope → 404 · GET /api/uploads/sign → 405 · POST sin token → 401 · /api/..%2Fserver%2Fenv → 404
# Ctrl+C (SIGINT a scripts/dev.mjs) → 4200 y 4310 liberados

$ pnpm test                  → Test Files 8 passed (8) · Tests 17 passed (17)
$ pnpm run test:api          → sin pruebas todavía, sale en 0
$ pnpm exec tsc -p tsconfig.app.json --noEmit   → ok (incluye types.ts)
$ pnpm run typecheck:api     → ok
$ pnpm run build             → Application bundle generation complete
$ pnpm run verify:public-build → Verified 37 allowlisted public photographs
```

## Pendientes y decisiones

- `GET /api/health` informa `r2: false` en local porque exige `R2_ACCOUNT_ID`, que con `R2_ENDPOINT` queda vacío. Lo resuelve A4 al agregar `R2_ENDPOINT` a `server/r2.ts` (y a la comprobación de salud); no se tocó aquí.
- `stack:up` completo no se volvió a correr (Supabase ya estaba arriba); `s3:up`, que es lo nuevo, sí.
- Paso 0-T (scripts `verify-*`, `gen-golden-sql`, `00_smoke.sql`), paso 8 (capturas base, otro agente) y paso 9 (CI) no son de esta sesión.
- Contratos de UI-01..06 elegidos por el líder (textos «Quitar uno»/«Agregar uno», «Escribe un monto válido.», chip único que no se deselecciona, destinos y rutas del shell, Equipo solo admin, Catálogo en «Más»): revisar con el usuario antes de que T escriba las pruebas si algo no le convence.
- SeaweedFS queda corriendo (`lirios-dev-s3-1`); `pnpm run s3:down` lo detiene.
