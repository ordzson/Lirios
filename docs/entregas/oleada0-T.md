# Oleada 0 · paso 0-T (agente de pruebas)

Fecha: 2026-11-19 · Rama `feat/taller` · Sin commit. Solo se tocaron archivos de T (§7.1): `scripts/verify-*.mjs`, `scripts/gen-golden-sql.mjs`, `supabase/tests/**` y esta nota. `package.json` no cambió: los cinco scripts ya registrados apuntan a estos archivos tal cual.

## Escrito

| Archivo | Qué hace |
| --- | --- |
| `scripts/verify-tokens.mjs` | Falla si hay hexadecimales (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) fuera de `src/styles/` en código nuevo. Revisa todo `src/**` (`.scss .sass .css .less .ts .js .mjs .html .svg`). **«Carpeta nueva» = cualquier archivo que no esté en la línea base** congelada dentro del script: los 11 archivos heredados de hoy (217 hexadecimales, por archivo y por valor). Un archivo nuevo debe tener cero; un archivo heredado puede quitar los suyos pero no agregar uno nuevo ni repetir uno más veces. No cuentan `&#039;`, `#add-button` ni `ruta#seccion`. `--baseline` imprime el estado actual (solo para que T reduzca la línea base). |
| `scripts/verify-migrations.mjs` | Reglas M1–M10 (detalle en la cabecera): nombre y prefijo único (M1); la inicial no cambia, sha256 congelado (M2); orden de §4.1, un archivo que §4.1 no nombra solo da aviso (M3); `create/drop table` y `alter table … add/drop column` solo en la inicial y en `*_core_production`/`*_core_commerce` (M4); una función en un archivo, o dos si el primero es `*_contract.sql`; las de la inicial no se redefinen salvo `create_order` v2 en `*_orders_flow` y `track_order` v2 en `*_tracking` (M5); cada función del contrato solo en su archivo dueño, y `*_contract.sql` trae el stub de todas menos esas dos (M6); una vista, un archivo dueño (M7); toda función nueva trae su `revoke … from public` en el mismo archivo y después de crearla (M8); `grant execute` según el rol de §4.1: anon a anon, staff/admin a `authenticated` y nunca a anon, las internas a nadie; prohibidos `grant … to public`, anon fuera de la lista blanca, `grant` en bloque y `alter default privileges … grant` a public/anon/authenticated (M9); `security definer` exige `set search_path = public, pg_temp` (M10). Analizador léxico propio: quita comentarios, cadenas y cuerpos `$tag$`. `--dir <carpeta>` para probar con otra carpeta. |
| `scripts/gen-golden-sql.mjs` | Lee `supabase/tests/fixtures/{costing,promotions,bouquet}.json`, valida cada caso contra el README (ids uuid en minúsculas o kebab para productos, números JSON, fechas, sin campos extra, id único en el directorio) y escribe `supabase/tests/generated/golden_<archivo>.sql`. La salida es determinista (sin fechas ni rutas, uuids auxiliares por sha1). Borra los `golden_*.sql` que ya no tienen su JSON. `--check` no escribe y sale con 1 si lo generado no coincide con el disco. Sin fixtures genera 0 archivos, no crea la carpeta y sale con 0. |
| `scripts/verify-flows.mjs` | Revisa la pila (`/` con `<app-root>`, `/api/health` por el proxy, API de Supabase < 500), abre Chrome headless (`CHROME_BIN` o lo busca en PATH; `--no-sandbox`) y por cada viewport de §9.6 (390×844 y 768×1024 táctiles, 1440×900 con ratón) corre `pnpm run db:reset`, espera a Supabase, comprueba que `/` se ve sin excepciones y corre los flujos del registro, cada uno en un contexto de navegador limpio (zona `America/Guatemala`, idioma `es-GT`). **Registro:** cada flujo es `scripts/verify-flow-<id>.mjs` (`export default { id, owner, title, viewports?, run(page, ctx) }`), se carga solo y se puede filtrar con `--only F7`. Si un flujo falla, guarda una captura en el directorio temporal. **Registro vacío:** igual prueba pila, Chrome, `db:reset` y los tres viewports, y sale con 0. |
| `supabase/tests/00_smoke.sql` | pgTAP mínimo (4 pruebas): pgTAP corre, existen `public.products`, `public.orders` y `public.create_order(jsonb)`. |

## Salida real

```
$ pnpm run verify:tokens
verify:tokens OK: 50 archivos revisados en src/ (sin src/styles/); 217 hexadecimales heredados dentro de la línea base (11 archivos); 0 nuevos.

$ pnpm run verify:migrations
verify:migrations OK: 1 migración(es), 7 función(es), 0 vista(s); inicial intacta, un dueño por función, revoke/grant en su archivo.

$ pnpm run db:golden
db:golden OK: 0 caso(s) → 0 archivo(s) en supabase/tests/generated.

$ pnpm run db:test
db:golden OK: 0 caso(s) → 0 archivo(s) en supabase/tests/generated.
Target: local stack (127.0.0.1:55322)
supabase/tests/00_smoke.sql .. ok
All tests successful.
Files=1, Tests=4 · Result: PASS

$ pnpm run verify:flows          # sin `pnpm run dev`
verify:flows FALLA: la pila local no está arriba (PLAN.md §4.3):
  http://127.0.0.1:4200/ no responde (ECONNREFUSED); ¿corre `pnpm run dev`?
  http://127.0.0.1:4200/api/health no responde (ECONNREFUSED)
(exit 1)

$ pnpm run verify:flows          # con `pnpm run dev` arriba
pila OK: app http://127.0.0.1:4200, /api/health por el proxy, Supabase http://127.0.0.1:55321
registro de flujos vacío (scripts/verify-flow-*.mjs): se prueba solo la infraestructura
Chrome OK: Chrome/147.0.7727.137 (/usr/bin/google-chrome)
390×844: db:reset OK (24.1 s)
PASS 390×844 base: la tienda pinta / sin excepciones
768×1024: db:reset OK (24.7 s)
PASS 768×1024 base: la tienda pinta / sin excepciones
1440×900: db:reset OK (24.6 s)
PASS 1440×900 base: la tienda pinta / sin excepciones
verify:flows OK: 3 comprobación(es) en 3 viewports, 0 flujo(s) (76.2 s).
```

## Pruebas de que fallan cuando deben (copias temporales, ya borradas)

- **verify:tokens** (copia de `src/` en el scratchpad): un `#c0ffee` en `src/app/ui/probe/probe.scss`, y `#ffffff` más un `#2d2427` de sobra en `cart.component.scss` → `FALLA: 3 hexadecimal(es)` con archivo:línea, exit 1. `#123456` en `src/styles/_tokens.scss`, `&#039;` y `#add-button` no cuentan.
- **verify:migrations** (`--dir` con migraciones sintéticas): una carpeta buena (`*_materials.sql` con `consume_material_fifo` y `admin_receive_lot`, revoke y grant, comentarios y cuerpos con texto engañoso) → OK. La mala → exit 1 con M1 (nombre), M2 (inicial tocada), M4 (`create table`, `add column`), M5 (`is_staff` redefinida, `create_order` en contract, `recipe_cost` en tres archivos), M6 (fuera de su dueño, stubs que faltan), M7 (`costing_overview` en materials), M8 (sin revoke), M9 (interna concedida a anon, staff sin grant, grant en bloque) y M10 (security definer sin `search_path`).
- **db:golden** (`--fixtures` y `--out` en el scratchpad): con el ejemplo del README más un caso de promoción («Q20 en arreglos» → Q125) y R1 de ramo, genera 3 archivos, y una segunda corrida da los mismos bytes (`--check` OK). Se corrieron en una base desechable (`golden_probe`, borrada al final) con tablas y funciones de reemplazo: `1..6 ok`, `1..2 ok`, `1..4 ok`, y los datos del caso se deshacen. Con un fixture malo (número como cadena, ítem con material y ranura, id repetido) → `FALLA: 3 problema(s)`, exit 1, sin escribir nada.
- **verify:flows**: con un flujo de prueba (`scripts/verify-flow-zz-probe.mjs`, borrado) que usó `goto`, `press('Tab')`, `focused`, `click` (toque o ratón), `waitFor`, `press('Escape')` y `ctx.supabase`, y que falla a propósito a 1440 → `PASS 390×844 ZZ`, `FAIL 1440×900 ZZ` con captura, exit 1.

## Decisiones y pendientes para el líder

1. **El esquema que usa `gen-golden-sql.mjs` es provisional.** Las tablas y columnas de §4.1 las fija A1, así que el objeto `SCHEMA` (al inicio del script) es mi lectura de §4.1: `business_settings.hourly_rate/overhead_pct/assembly_fee/assembly_minutes`, `materials.family/color_id`, `material_lots.quantity/remaining/unit_cost/total_cost`, `recipe_items.slot_family/waste_pct`, `recipe_components.component_recipe_id`, `promotions.product_ids text[]`, precio en `flower_designs` (un diseño por variante), `addons.kind 'wrap'|'extra'`. T lo ajusta al esquema real en el paso 0 de A3, cuando escribe los JSON. Hasta entonces no corre, porque no hay fixtures.
2. **Lotes con saldo 0.** El README (regla 5) pide cantidad comprada = `remaining`. Un «último lote» ya agotado queda entonces con cantidad 0, así que A1 no debe poner `check (quantity > 0)` en `material_lots`, o el README tiene que decir otra cosa.
3. **`suggestedPrice`** no se compara en SQL: §4.1 no tiene una función SQL para eso; solo lo prueba TS (D-22).
4. **Un `begin/rollback` por caso no funciona con pgTAP**: deshace también los `ok` ya registrados (lo comprobé). Cada caso corre en una función `pg_temp.golden_<n>()` con un bloque plpgsql que lanza SQLSTATE `LG000` para deshacer sus datos y devuelve el resultado como jsonb. El efecto es el mismo que pide la regla 9 del README; conviene ajustar su redacción.
5. **`db:test` y CI entre paquetes.** Cuando T escriba los JSON (paso 0 de A3), `golden_costing.sql` fallará hasta B2 (`recipe_cost` es un stub) y `golden_promotions.sql` hasta C2. Es lo que espera §7.3, pero CI en `feat/**` quedará en rojo mientras tanto. El líder decide si eso se acepta o si hace falta un mecanismo de pendientes.
6. M3 solo avisa ante un archivo de migración que §4.1 no nombra; no lo rechaza.
7. `db:reset` dura unos 24 s por viewport, así que `verify:flows` tarda unos 80 s aunque el registro esté vacío.

## Lo que CI necesita

- Supabase CLI con la pila arriba (`supabase start`: base 55322, API 55321) para `db:test` y `verify:flows`. `supabase test db` descarga la imagen `public.ecr.aws/supabase/pg_prove:3.36`.
- `pnpm run dev` (o equivalente) sirviendo `http://127.0.0.1:4200` con `/api` → `:4310`. Otra dirección se pasa con `FLOWS_BASE_URL` o `--base-url`.
- Chrome: `CHROME_BIN`, o `google-chrome` / `google-chrome-stable` / `chromium` / `chromium-browser` en PATH. Siempre arranca con `--no-sandbox --disable-dev-shm-usage`.
- Variables (de `process.env` o `.env.local`; manda `process.env`): `SUPABASE_URL` (por defecto `http://127.0.0.1:55321`) y `SUPABASE_SERVICE_ROLE_KEY`, o en su lugar `SUPABASE_PUBLISHABLE_KEY`. `/api/health` debe responder `ok: true`.
- Casos dorados al día: `pnpm run db:test` y luego `git status --porcelain supabase/tests/generated` vacío. También sirve `node scripts/gen-golden-sql.mjs --check`. Sin fixtures la carpeta `supabase/tests/generated/` no existe y no se crea.
- Node 22 o más nuevo (usa el `WebSocket` global). No hay dependencias nuevas.
