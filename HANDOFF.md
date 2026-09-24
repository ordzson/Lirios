# Handoff — Lirios / Impeccable

## Objetivo vigente (2026-09-24)

Implementar la ruta independiente `/catalogo` a partir de la dirección aprobada **Índice de taller**. El paquete ejecutable completo está en `CATALOG_HANDOFF.md`; el contrato visual principal es `.impeccable/mocks/decision/catalogo-indice-taller.png`, acompañado por sus comps móviles y `.impeccable/surfaces/catalogo.md`.

No reabrir la dirección ni mezclarla con propuestas descartadas. La landing existente debe convertirse en ruta `/` sin rediseñarla ni introducir regresiones.

## Base ya implementada: landing

La composición aprobada de la página de inicio es `.impeccable/mocks/composition-a.png`. No sustituirla ni reabrir su dirección visual.

## Estado exacto (2026-09-23, fin de sesión 2)

- Todas las fases de build cerradas: comps, spec, plates, hero (80%), sections, motion, responsive (desktop 76%), review.
- Finish review: `.impeccable/review/finish-review.md`. Corrió en hilo (modo degradado) porque se rechazó el spawn del subagente.
  - Disposición: `fix`. Dos rondas de corrección aplicadas: GROUND #faf2eb, CTA agrupado, tiers sin eyebrow, placeholder de contacto, contraste del placeholder y caret.
  - Único ítem abierto (parcial): el lettering del titular y del wordmark es menos condensado que el del comp. Bodoni Moda 500 acerca el peso, pero la familia es más ancha; cerrarlo exige elegir otra cara display condensada (decisión de la persona usuaria). Se probó Bodoni Moda variable con opsz y se descartó: las hairlines se pierden.
- `DESIGN.md` y `.impeccable/design.json` escritos por el documenter (en hilo, modo degradado).
- Detector manual: ejecutado una vez, `[]`.
- Capturas vigentes: `.impeccable/review/desktop.png`, `mobile.png`, `hero-repro.png`; diff final en `.impeccable/review/diff/final/` (77%).

## Implementación actual

- Angular 21.2 standalone, SCSS, pnpm.
- Se eligió Angular 21 porque Node 22.21.1 no cumple el mínimo de Angular 22.
- Entrada principal:
  - `src/app/app.component.html`
  - `src/app/app.component.scss`
  - `src/app/app.component.ts`
  - `src/styles.scss`
- Fuentes locales:
  - `@fontsource/bodoni-moda` (400 y 500)
  - `@fontsource-variable/manrope`
- Plates con provenance embebida:
  - `assets/plates/hero-photo.png`
  - `assets/plates/category-arrangements-photo.png`
  - `assets/plates/category-stems-photo.png`
  - `assets/plates/category-custom-photo.png`
- La página ya contiene:
  - hero fiel al comp;
  - catálogo editorial de arreglos;
  - sección de flores individuales;
  - personalización por 3 tiers;
  - proceso de compra/pago/seguimiento;
  - demo honesta de seguimiento con `LIR-2048`;
  - footer.
- Build de producción verificado: `pnpm run build` pasa (budget de estilos por componente subido a 20/24 kB).
- Responsive: layout del comp ≥1100px (alto `min(100vh, 56.28vw)`), menú plegable <1100px, una columna <900px con estante deslizable de categorías.
- Motion: una sola coreografía de apertura («entra en foco»), con reduced-motion a fundidos.
- Captura full-page válida y revisada visualmente: `.impeccable/review/sections-desktop.png` (1440×5820).
- Captura exacta del hero: `.impeccable/review/hero-repro.png`.
- Diff del hero: `.impeccable/review/diff/hero/`.

## Decisiones de contenido

- “Lirios” sigue siendo provisional.
- Imágenes y nombres de catálogo se declaran provisionales.
- No se inventaron testimonios, zonas/costos de envío ni datos de contacto.
- Precios: el catálogo usa precios mock en GTQ (pedido explícito, 2026-09-24) solo para maquetar y ordenar por precio. Están en `src/app/pages/catalog/catalog-products.ts` y deben sustituirse por los reales antes de publicar. Ver `CATALOG_HANDOFF.md`.
- Pagos mostrados: transferencia y contraentrega.
- Confirmación: manual por WhatsApp o correo.
- Seguimiento: por número de orden, sin cuenta obligatoria.
- La demo local reconoce únicamente `LIR-2048` y lo dice explícitamente.

## Infraestructura local

- `pnpm-workspace.yaml` contiene el store local y los build scripts aprobados.
- `.npmrc` apunta a `.pnpm-store`; `.pnpm-store/` está ignorado.
- No usar npm ni npx.
- `.git` es un directorio vacío; este workspace no funciona actualmente como repositorio Git.
- Los servidores de Angular y Chrome DevTools quedaron cerrados al hacer este handoff.

## Capturas exactas

Capturar en serie, nunca en paralelo: rAF no corre en pestañas de fondo. `CAPTURE_EVAL="js"` permite fijar un estado antes de capturar (por ejemplo, el menú abierto).

Helper: `.impeccable/build/capture.mjs`.

Arranque local (el sandbox puede exigir escalación):

```bash
pnpm start --host 127.0.0.1 --port 4200
```

Chrome DevTools para viewport exacto (también puede exigir escalación):

```bash
google-chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars --remote-debugging-port=9222 --user-data-dir=/tmp/lirios-cdp about:blank
```

Captura viewport:

```bash
node .impeccable/build/capture.mjs http://127.0.0.1:4200/ .impeccable/review/hero-repro.png 1672 941
```

Captura full-page:

```bash
node .impeccable/build/capture.mjs http://127.0.0.1:4200/ .impeccable/review/desktop.png 1440 900 --full
```

## Próximos pasos

1. Decidir si se financia otra ronda para el ítem TYPE abierto (buscar una cara display condensada de alto contraste) o si se da por buena la versión actual.
2. Si cambia la tipografía: recapturar, volver a revisar y actualizar DESIGN.md y el sidecar.

## Precauciones

- No regenerar las plates: ya pasaron y tienen provenance.
- No reescribir el hero por gusto; el comp es contrato espacial.
- No ejecutar `impeccable context` más de una vez por sesión.
- Leer `craft-floor.md` inmediatamente antes de la próxima edición UI en la nueva sesión.
- La captura full-page lanzada justo antes del handoff terminó aunque la llamada fuera interrumpida; el archivo fue abierto y validado.
