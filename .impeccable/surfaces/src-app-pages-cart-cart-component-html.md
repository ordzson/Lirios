---
version: 1
slug: "src-app-pages-cart-cart-component-html"
primary_target: "src/app/pages/cart/cart.component.html"
related_targets: ["src/app/pages/cart/cart.component.scss","src/app/pages/cart/cart.component.ts","src/app/pages/order-confirmation/order-confirmation.component.html","src/app/pages/order-confirmation/order-confirmation.component.scss","src/app/pages/order-confirmation/order-confirmation.component.ts","src/app/shared/cart/cart.service.ts","src/app/shared/orders/order.service.ts","src/app/shared/site-header/site-header.component.html","src/app/app.routes.ts"]
---

# Carrito y pedido

## Scope and mode

Ruta pública `/carrito`, modo **Operate**, con confirmación recuperable en `/pedido/:orderNumber`. Permite revisar las piezas elegidas, completar contacto y entrega, confirmar contraentrega y conservar el número de orden sin crear una cuenta.

## Audience and job

Una persona que ya eligió flores necesita terminar su solicitud con confianza y pocos rodeos. Debe poder corregir cantidades o eliminar líneas, entender el total, saber qué datos faltan y reintentar sin perder el carrito si algo falla.

## Outcome, truth, and states

Éxito: el pedido queda guardado, el carrito se vacía solo después de guardar y aparece un número de orden reutilizable. Los productos y precios vienen de `CATALOG_PRODUCTS`; la entrega permanece “Por confirmar”; el único pago es contraentrega. Debe cubrir carga, carrito vacío, producto faltante, persistencia limitada, formulario inválido, envío en curso, error recuperable y confirmación ausente.

## Direction contract

**THESIS:** Una hoja continua del taller lleva del carrito a la entrega con el resumen siempre a la vista; rehúsa tanto el checkout fragmentado en pantallas como el formulario genérico de ecommerce.

**OWN-WORLD:** Hereda crema mate, vino, carbón y rubor; Bodoni da voz a títulos y nombres, Manrope opera campos y controles. La estructura vive en tres columnas, reglas finas, campos subrayados, esquinas rectas y fotografías reales pequeñas, sin cards elevadas.

**STORY:** La persona revisa y corrige sus piezas, completa datos de contacto y entrega, confirma contraentrega y recibe un número de orden. El resumen acompaña todo el recorrido y los errores explican cómo continuar sin borrar lo escrito.

**FIRST VIEWPORT:** Header compacto; índice numerado estrecho a la izquierda con Carrito, Tus datos, Entrega y Confirmar; columna central amplia con “Tu pedido”, líneas editables y el comienzo del formulario; resumen fijo a la derecha con subtotal, entrega por confirmar, total, contraentrega y la única acción primaria.

**FORM:** “Hoja del taller”, tercera estructura de la lista fundamentada y elegida en la ronda de superficie. Seed `06317842`. Comp aprobado: `.impeccable/mocks/decision/checkout-hoja-taller.png`. Momento memorable: todo el pedido se entiende como una sola hoja que conserva orientación mientras cambian cantidades y total.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints and unresolved decisions

No se inventan costo, fecha, cobertura adicional, disponibilidad ni canales de contacto. La persistencia actual será local y sustituible porque el proyecto no incluye aún cliente ni esquema de Supabase; la interfaz no debe afirmar sincronización remota. Los precios siguen siendo mock de maquetación hasta que el negocio proporcione los reales.
