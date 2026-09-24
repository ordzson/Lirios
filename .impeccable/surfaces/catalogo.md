---
version: 1
slug: "catalogo"
primary_target: "src/app/pages/catalog/catalog.component.html"
related_targets:
  - "src/app/pages/catalog/catalog.component.scss"
  - "src/app/pages/catalog/catalog.component.ts"
  - "src/app/app.routes.ts"
---

# Catálogo

## Scope and mode

Ruta pública independiente `/catalogo`, modo **Operate**. Permite explorar una colección pequeña de arreglos listos y flores individuales. No persuade de nuevo: la landing ya cumple esa tarea.

## Audience and job

Una persona que ya entiende qué vende Lirios llega para ver piezas concretas, cambiar rápidamente de categoría, acotar por atributos y abrir un producto. Puede estar eligiendo un regalo o una flor para sí misma; necesita orientación sin la densidad de un marketplace.

## Outcome and proof

Éxito: identificar una pieza y llegar a su detalle con poco desplazamiento. La prueba son las fotografías reales de flores de limpiapipas; el material debe leerse antes que la interfaz. Conteos, precios, nombres y filtros proceden de datos reales y nunca se inventan. Excepción temporal: precios mock para maquetar y ordenar por precio (ver `CATALOG_HANDOFF.md`), pendientes de sustituir antes de publicar.

## Approved direction

**NAME:** Índice de taller.

**THESIS:** Un índice lateral sereno organiza una galería editorial; la colección se siente escogida, pero sigue siendo fácil de operar.

**VISUAL AUTHORITY:** hereda `DESIGN.md` sin cambios: crema mate, vino, carbón, Bodoni Moda para voz y Manrope para operación, esquinas rectas, reglas finas, fotografías reales y ausencia de cards elevadas.

**FIRST VIEWPORT:** header compartido; breadcrumb y “Catálogo” contenidos; rail izquierdo con Todos/Arreglos/Flores y filtros; a la derecha empiezan inmediatamente seis piezas en una retícula de tres columnas.

**MOBILE:** header compacto; título; categorías horizontales; fila sticky Filtrar/Ordenar; dos columnas de productos. El filtro abre un sheet crema con checkboxes cuadrados y footer Limpiar/Ver N piezas.

**FOCAL MOMENT:** la categoría cambia sin recargar y la galería se recompone con un anuncio de resultados discreto; el producto, no el control, sigue dominando la vista.

**HONEST RISK:** el rail puede parecer demasiado técnico si los filtros se expanden todos a la vez. Mantener grupos colapsables, pocas opciones reales y ningún control que no cambie resultados.

## Content ranges

- Mínimo útil: 4 productos.
- Estado actual provisional: 7 fotografías reales.
- Típico esperado: 12–20 productos.
- Máximo antes de replantear búsqueda/paginación: aproximadamente 40.
- Categorías: `arrangement` y `single-flower`.
- Precio puede ser nulo y se comunica como “Precio por confirmar”.

## Information architecture

Orden de superficie: header → breadcrumb/título → categorías/filtros + galería → enlace secundario a personalización → cierre/footer compartido si corresponde. No hay hero, narrativa de marca, testimonios, proceso de compra ni muestras repetidas de la landing.

## Interaction contract

- Categoría única; color y tipo de flor multiselección.
- OR dentro de cada grupo, AND entre grupos.
- Estado compartible por query params.
- Todos los resultados se renderizan sin paginación.
- Filtros móviles en diálogo modal con focus trap, Escape, retorno de foco y bloqueo de scroll.
- Estado activo nunca depende solo del color.
- La cuadrícula conserva orden DOM y visual.

## Required states

Carga sin layout shift, error con reintento, combinación sin resultados con limpiar, catálogo vacío, imagen fallida y precio ausente. No usar skeleton shimmer agresivo ni ilustraciones de relleno.

## Constraints and anti-goals

- No buscador para el volumen actual.
- No cards redondeadas, chips, badges, gradientes, glass ni sombras de ecommerce.
- No precios (salvo los mock temporales), stock, descuentos o datos de entrega inventados.
- No librería UI o store global nuevo.
- No regresión visual de la landing.

## Approved references

- Desktop: `.impeccable/mocks/decision/catalogo-indice-taller.png`.
- Mobile: `.impeccable/mocks/decision/catalogo-indice-taller-mobile.png`.
- Mobile filter state: `.impeccable/mocks/decision/catalogo-indice-taller-mobile-filtros.png`.
- Full execution handoff: `CATALOG_HANDOFF.md`.
