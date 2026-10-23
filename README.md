# Lirios

Tienda Angular para flores artesanales, preparada para Vercel Functions, Supabase y Cloudflare R2.

## Desarrollo

El proyecto usa exclusivamente `pnpm`.

```bash
pnpm install
pnpm start
```

Sin credenciales, la tienda usa el catálogo local y la orden de muestra `LIR-2048`. La interfaz administrativa puede revisarse localmente en `http://localhost:4200/admin?preview=1`; sus datos están rotulados como ilustrativos y esa ruta de vista previa no se habilita fuera de `localhost`.

## Verificación

```bash
pnpm test
pnpm run typecheck:api
pnpm run build
pnpm run verify:public-build
```

Con el sitio iniciado y Google Chrome instalado, `pnpm run verify:navigation` comprueba el scroll
táctil sobre las galerías, los diálogos, filtros y cambios de ruta en teléfono, tableta y escritorio.
Acepta otra URL local como argumento y `CHROME_BIN` si Chrome está en una ruta diferente.
La prueba utiliza el catálogo local, sin consultar el backend.

## Arquitectura

- Angular 21: tienda y panel administrativo.
- Supabase Auth + Postgres + RLS: usuarios, roles, catálogo, inventario, pedidos y seguimiento.
- Vercel Functions: firma y eliminación segura de objetos en Cloudflare R2.
- Cloudflare R2: fotografías públicas mediante dominio propio; las cargas usan URLs firmadas de cinco minutos.

La guía completa de provisión y credenciales está en [DEPLOYMENT.md](DEPLOYMENT.md).

## GitHub Pages

Cada push a `main` verifica y publica la tienda en [GitHub Pages](https://ordzson.github.io/Lirios/).
El workflow configura la ruta base y genera `404.html` para permitir enlaces directos a las rutas de Angular.
Pages usa el catálogo local y la orden de muestra; las Functions de `/api` requieren el despliegue en Vercel descrito arriba.
