# Handoff: carrito y creación de pedidos

Fecha del handoff: 2026-10-03 (America/Guatemala).

## Objetivo original

Completar el objetivo principal del sitio: carrito visible y editable, persistencia al recargar, subtotal/resumen, contacto y entrega, **solo pago contraentrega**, validaciones, creación del pedido, confirmación con número de orden y recuperación ante errores. El usuario pidió usar la skill `impeccable` para que el flujo se vea y se sienta bien.

Regla global del repositorio: usar exclusivamente `pnpm`; nunca `npm` ni `npx`.

## Decisión aprobada por el usuario

- Superficie en modo **Operate**.
- Dirección escogida en una ronda visual de Impeccable: **“Hoja del taller”**.
- Seed de superficie: `06317842`.
- Comp aprobado: `.impeccable/mocks/decision/checkout-hoja-taller.png`.
- Sidecar de aprobación: `.impeccable/mocks/decision/checkout-hoja-taller.png.json` (`approved: true`).
- Contrato durable: `.impeccable/surfaces/src-app-pages-cart-cart-component-html.md`.
- El comp contiene datos ilustrativos incorrectos (MXN y otros importes). La implementación debe conservar la composición, pero usar verdad del proyecto: precios del catálogo en **GTQ**, operación en Quetzaltenango, costo de entrega “Por confirmar” y solo contraentrega.
- PRODUCT.md y DESIGN.md ya existían y son autoridad. No cambiar la identidad global.
- Impeccable reportó drift previo: `.impeccable/design.json` está desactualizado respecto a DESIGN.md. No repararlo como efecto secundario; solo ofrecer `document` al terminar.

## Estado de Impeccable

Ejecutado:

- `impeccable context --target src/app/shared/cart/cart.service.ts`
- `reference/new-work.md`, `reference/visualize.md`, `reference/craft-floor.md` leídos.
- Ronda de superficie y tres comps generados; usuario eligió Hoja del taller.
- `build-phase start --reset --comp .impeccable/mocks/decision/checkout-hoja-taller.png`
- Spec cerrada: 46 regiones, 2 plates, 28 regiones de texto medidas.
- Plates cerrados: `assets/plates/product-one-photo.png` y `assets/plates/product-two-photo.png`; son copias de fotos reales aportadas, con provenance embebida.
- Scaffold: `.impeccable/build/scaffold/layout.css` y `hero-reference.html`.

Estado actual:

```text
BUILD-PHASE HERO
comps skipped
spec closed
plates closed
hero open (último registro 57% missing)
sections/motion/responsive/review pending
```

Ese 57% **no es un fallo de la implementación actual**: se registró deliberadamente la primera captura con solo los plates, antes de añadir la capa semántica, como exige el workflow. La capa completa se añadió después y aún no se ha recapturado.

Continuación visual:

1. En una nueva sesión, ejecutar `impeccable context` una sola vez y leer esta superficie con `impeccable surface-brief read src/app/pages/cart/cart.component.html`; no repetir la ronda de conceptos.
2. Iniciar `pnpm start --host 127.0.0.1` (puede requerir escalación por bind local).
3. Iniciar Chrome headless con DevTools en 9222 y capturar `/carrito` a 1440×900 en `.impeccable/review/hero-repro.png`.
4. El carrito inicia vacío. Antes de la captura, sembrar localStorage y recargar:

```js
localStorage.setItem('lirios:cart:v1', JSON.stringify([
  { productId: 'arrangement-crimson-lilies', quantity: 1 },
  { productId: 'arrangement-golden-gerberas', quantity: 1 }
]));
location.reload();
```

5. Inspeccionar la captura y ejecutar `impeccable build-phase advance`. Si falla, abrir primero los crops que indique. El plate rojo puede requerir `object-fit: contain` para evitar el veto de clipping.
6. Tras cerrar hero: avanzar sections, motion y responsive; capturar escritorio 1440 full-page y móvil 390 en `.impeccable/review/desktop.png` y `mobile.png`.
7. Ejecutar una sola vez el detector sobre targets cambiados: `impeccable detect --json ...`.
8. Spawn obligatorio de `impeccable_finish_reviewer` sin historia heredada, siguiendo `new-work.md`; actuar sobre su disposition.
9. Spawn obligatorio de `impeccable_documenter`; es una extensión ordinaria, por lo que debe preservar DESIGN.md y reportar el drift previo, no arreglarlo sin permiso.

## Implementación presente

### Completo o sustancialmente completo

- `src/app/shared/cart/cart.service.ts`
  - líneas públicas readonly;
  - add/increase/decrease/set/remove/clear;
  - límite 1–99;
  - persistencia `localStorage` bajo `lirios:cart:v1`;
  - recuperación de JSON inválido y mensaje recuperable;
  - `retryPersistence()`.
- `src/app/shared/orders/order.service.ts`
  - modelos de pedido/contacto/entrega/items;
  - persistencia local bajo `lirios:orders:v1` (máximo 25);
  - número `LIR-YYYYMMDD-XXXX`;
  - estado `received`, pago `cash-on-delivery`, entrega `null`/por confirmar;
  - error explícito `OrderStorageError` si no puede guardar.
- `src/app/pages/cart/cart.component.ts|html|scss`
  - carga catálogo y cruza IDs con productos reales;
  - muestra líneas y piezas ausentes;
  - aumenta/disminuye/elimina;
  - subtotal GTQ, total y entrega por confirmar;
  - formulario reactivo con nombre, teléfono/WhatsApp, email opcional, receptor, dirección, municipio Quetzaltenango, referencias y notas;
  - validaciones y foco al primer error;
  - solo contraentrega;
  - submit guarda orden, conserva datos en error, limpia carrito solo tras éxito y navega a `/pedido/:orderNumber`;
  - estados loading/error/empty/persistence/submitting;
  - diseño responsive “Hoja del taller”.
- `angular.json`: sirve PNG de `assets/plates`.
- `src/app/app.routes.ts`: ruta `/carrito` añadida.
- `pnpm run build` **pasa** después de estos cambios (2026-10-03 15:25 local).

### Pendiente funcional imprescindible

1. Crear `src/app/pages/order-confirmation/` (TS/HTML/SCSS):
   - leer `orderNumber` de ruta;
   - recuperar con `OrderService.find()`;
   - mostrar “Solicitud recibida”, número, copiar número, resumen, contacto, entrega, pago contraentrega y siguiente paso de confirmación manual;
   - estado recuperable si el pedido no existe en este navegador.
2. Añadir ruta `/pedido/:orderNumber` antes del wildcard.
3. Cambiar el enlace “Carrito” de `src/app/shared/site-header/site-header.component.html` de `/catalogo` a `/carrito`.
4. Considerar pasar `[catalogMode]="true"` en confirmación para mantener header compacto.
5. Añadir tests:
   - cart service: persistencia, incremento/decremento, remove, corrupción;
   - order service: guarda/recupera, genera número, falla sin storage;
   - cart component: validación y error recuperable;
   - confirmation component: pedido presente/ausente.
6. Ejecutar `pnpm test` y `pnpm run build` al final.

## Archivos creados/modificados hasta ahora

- `CHECKOUT_HANDOFF.md` (este archivo)
- `angular.json`
- `src/app/app.routes.ts`
- `src/app/shared/cart/cart.service.ts`
- `src/app/shared/orders/order.service.ts`
- `src/app/pages/cart/cart.component.ts`
- `src/app/pages/cart/cart.component.html`
- `src/app/pages/cart/cart.component.scss`
- `assets/plates/product-one-photo.png`
- `assets/plates/product-two-photo.png`
- `.impeccable/checkout-options.json`
- `.impeccable/checkout-brief-body.md`
- `.impeccable/surfaces/src-app-pages-cart-cart-component-html.md`
- `.impeccable/mocks/decision/checkout-{talonario,hoja-taller,escaparate}.png` y sidecars
- `.impeccable/build/*` (estado/spec/scaffold actual)

No hay repositorio Git operativo en el cwd (`git status` devuelve “not a git repository”), así que inspeccionar archivos directamente.

## Restricciones de producto y copy

- No afirmar backend/Supabase: el proyecto no tiene cliente ni esquema de Supabase instalados. La capa local actual es sustituible.
- No inventar costo/fecha/cobertura adicional/disponibilidad/canales de contacto.
- Los precios de `CATALOG_PRODUCTS` están marcados como mock temporal en `CATALOG_HANDOFF.md`; mostrarlos como están, sin convertirlos en hechos definitivos.
- La confirmación es manual por WhatsApp/correo según PRODUCT.md; no prometer tiempos.
- Vaciar carrito únicamente después de persistir el pedido.
- Mantener esquinas cuadradas, crema `#faf2eb`, vino, Bodoni/Manrope, reglas finas, sin cards elevadas, gradientes, glass ni pills.
- Accesibilidad: teclado, foco visible, live regions, contraste, reduced motion, labels/errores asociados.

## Procesos

El servidor Angular y Chrome headless usados para la primera captura fueron cerrados antes de este handoff. Los puertos 4200 y 9222 deberían estar libres.
