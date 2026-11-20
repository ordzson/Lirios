# Baseline screenshots — Oleada 0, paso 8

Fecha: 2026-11-19 · Rama: `feat/taller` (commit base `82ec50b` + cambios locales sin commit)

Capturas de referencia ("antes") de todas las pantallas públicas, para comparar contra el MEGAUPGRADE.

## Cómo se tomaron

- App servida con `pnpm exec ng serve --port 4300` (build de desarrollo).
- `public/config.js` apunta al Supabase local (`http://127.0.0.1:55321`), así que catálogo y precios son datos reales del seed local (7 productos).
- Chrome headless vía CDP, `deviceScaleFactor: 1`, `mobile: true` en 390 px. Antes de capturar se recorre la página con scroll para disparar lazy-load y reveals, y se vuelve arriba.
- Captura de página completa armada en franjas de 2000 px y unida con PIL, porque una sola captura de 1440×7932 colgaba Chrome. El header fijo/sticky aparece solo arriba.
- `localStorage` se limpia antes de cada captura. Donde se indica, se precarga un estado antes de que arranque la app.

## Archivos

| Archivo | Ruta | Viewport | Estado mostrado |
|---|---|---|---|
| `home-390x844.png` | `/` | 390×844 | Inicio completo (hero, arreglos listos, flor individual, personalizados, pasos, seguimiento, footer). |
| `home-1440x900.png` | `/` | 1440×900 | Igual, escritorio. |
| `catalogo-390x844.png` | `/catalogo` | 390×844 | Catálogo con los 7 productos de Supabase local, filtro "Todos", carrito vacío. |
| `catalogo-1440x900.png` | `/catalogo` | 1440×900 | Igual, escritorio. |
| `catalogo-detalle-390x844.png` | `/catalogo/lirios-carmesi` | 390×844 | Panel de detalle de producto abierto. **Solo viewport**, no página completa, porque el panel es fijo y en página completa quedaba recortado sobre la grilla. |
| `catalogo-detalle-1440x900.png` | `/catalogo/lirios-carmesi` | 1440×900 | Igual, escritorio (solo viewport). |
| `personalizados-390x844.png` | `/personalizados` | 390×844 | Página de arreglos personalizados en estado inicial (sin selección). |
| `personalizados-1440x900.png` | `/personalizados` | 1440×900 | Igual, escritorio. |
| `carrito-vacio-390x844.png` | `/carrito` | 390×844 | Estado vacío ("Tu carrito espera una flor."). |
| `carrito-vacio-1440x900.png` | `/carrito` | 1440×900 | Igual, escritorio. |
| `carrito-con-items-390x844.png` | `/carrito` | 390×844 | Checkout con 2 líneas precargadas en `lirios:cart:v1` (Lirios carmesí ×1, Lirios rosados ×2, subtotal Q 435.00). Formulario vacío. |
| `carrito-con-items-1440x900.png` | `/carrito` | 1440×900 | Igual, escritorio. |
| `pedido-390x844.png` | `/pedido/LIR-20261119-AB7K` | 390×844 | Confirmación de pedido con un pedido ficticio precargado en `lirios:orders:v1` (mismos 2 productos, contacto y entrega de ejemplo). |
| `pedido-1440x900.png` | `/pedido/LIR-20261119-AB7K` | 1440×900 | Igual, escritorio. |
| `pedido-no-encontrado-390x844.png` | `/pedido/LIR-00000000-ZZZZ` | 390×844 | Estado "No encontramos esta solicitud." (el pedido no existe en este navegador). |
| `pedido-no-encontrado-1440x900.png` | `/pedido/LIR-00000000-ZZZZ` | 1440×900 | Igual, escritorio. |
| `admin-acceso-390x844.png` | `/admin/acceso` | 390×844 | Login del taller ("El taller, en orden."), sin sesión. |
| `admin-acceso-1440x900.png` | `/admin/acceso` | 1440×900 | Igual, escritorio. |

## Notas

- `/admin` (protegido por `adminGuard`) sin sesión redirige a `/admin/acceso?returnUrl=%2Fadmin`, que se ve igual a `admin-acceso-*`. No se guardó aparte. El panel autenticado no se capturó.
- La ruta comodín `**` redirige a `/`.
- La confirmación de pedido lee el pedido de `localStorage` (`OrderService.find`), no de Supabase. Por eso el pedido de ejemplo se precargó en el navegador.
