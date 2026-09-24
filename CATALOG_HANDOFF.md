# Handoff de ejecución — Catálogo Lirios

## Estado de decisión

La dirección **Índice de taller** fue aprobada por la persona usuaria el 24 de septiembre de 2026 con la frase: “la opcion 1 me parece perfecta”. No reabrir la selección visual ni mezclarla con las otras propuestas.

Artefactos vinculantes:

- Desktop aprobado: `.impeccable/mocks/decision/catalogo-indice-taller.png` (1536×1024).
- Mobile aprobado: `.impeccable/mocks/decision/catalogo-indice-taller-mobile.png` (853×1844; referencia visual para 390×844 CSS px).
- Estado móvil de filtros: `.impeccable/mocks/decision/catalogo-indice-taller-mobile-filtros.png`.
- Brief de superficie: `.impeccable/surfaces/catalogo.md`.
- Registro de aprobación: `.impeccable/mocks/decision/catalogo-indice-taller.approved.json`.
- Los prompts exactos están junto a cada PNG y también embebidos en sus metadatos.

El catálogo extiende `DESIGN.md`; no crea otra identidad. La landing actual queda fuera de rediseño y no debe sufrir regresiones visuales.

## Resultado que debe entregar la siguiente instancia

Implementar una ruta pública `/catalogo` en Angular. Debe permitir recorrer una colección pequeña —aproximadamente 20 productos como máximo habitual—, alternar entre arreglos y flores individuales, filtrar y ordenar sin recargar la página, y llegar al detalle de cada producto. La página empieza con productos; no incluye hero, argumentos de venta ni bloques de categorías promocionales.

## Arquitectura recomendada

La aplicación actual renderiza la landing directamente desde `AppComponent` y `app.routes.ts` está vacío. Para añadir una ruta real sin duplicar la aplicación:

1. Convertir `AppComponent` en shell con `RouterOutlet`.
2. Mover el contenido y estado actual de la landing a un `HomeComponent`, preservándolo sin rediseño.
3. Crear un `CatalogComponent` standalone para `/catalogo`.
4. Extraer el encabezado actual a `SiteHeaderComponent` únicamente porque será compartido por ambas rutas.
5. Configurar scroll restoration y navegación por fragmentos para que los enlaces de la landing sigan funcionando.

Rutas mínimas:

- `/` → landing existente.
- `/catalogo` → todos los productos.
- `/catalogo?categoria=arreglos` → arreglos.
- `/catalogo?categoria=flores` → flores individuales.

No implementar todavía una segunda arquitectura de estado, store global ni dependencia de UI. Signals locales, `computed` y query params del Router son suficientes.

El detalle del producto puede enlazar a `/catalogo/:slug` si ese flujo ya está dentro de la instancia ejecutora. Si no lo está, conservar tarjetas como enlaces semánticos con el destino documentado y no inventar un modal incompleto.

## Integración con la landing

Actualizar destinos existentes sin alterar su presentación:

- “Ver arreglos” y “Explorar catálogo” → `/catalogo?categoria=arreglos`.
- “Ver flores individuales” → `/catalogo?categoria=flores`.
- La navegación global “Arreglos” y “Flores individuales” usa esas mismas rutas.
- “Personaliza” sigue apuntando a `/#personaliza` mientras no exista su propia ruta.
- “Seguir pedido” sigue apuntando a `/#seguimiento`.

## Modelo de datos mínimo

Crear un modelo tipado equivalente a:

```ts
type ProductCategory = 'arrangement' | 'single-flower';

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  colors: string[];
  flowerTypes: string[];
  price: number | null;
  currency: 'GTQ';
  image: string;
  imageSrcset?: string;
  imageAlt: string;
  featured?: boolean;
  sortOrder: number;
}
```

Reglas:

- `price: null` se presenta como “Precio por confirmar”; nunca como `Q 0`.
- **Precios mock (2026-09-24, pedido explícito de la persona usuaria):** los 7 productos provisionales tienen precios GTQ inventados para maquetar y probar el orden por precio. Viven únicamente en `catalog-products.ts`, marcados con un comentario, y deben sustituirse por precios reales antes de publicar. No copiarlos a otras superficies ni tratarlos como datos confirmados.
- Los conteos de Todos, Arreglos y Flores son derivados del arreglo de datos. No codificar `20/12/8`.
- Los valores de filtros también se derivan de productos reales; no ofrecer opciones sin resultados.
- Los nombres actuales son provisionales. Mantener una única fuente de datos para sustituirlos después.
- El orden inicial usa `sortOrder`; no depender del orden accidental del archivo.

## Fotografías disponibles

Usar las versiones retocadas y sus WebP. No regenerar imágenes ni crear productos ficticios.

Arreglos disponibles:

- `assets/pics/retouched/webp/arreglo_tier1-retouched-full.webp`
- `assets/pics/retouched/webp/arreglo_tier1_2-retouched-full.webp`
- `assets/pics/retouched/webp/arreglo_tier1_3-retouched-full.webp`
- `assets/pics/retouched/webp/arreglo_tier2-retouched-full.webp`
- `assets/pics/retouched/webp/arreglo_tier3_3-retouched-full.webp`
- `assets/pics/retouched/webp/flores1-retouched-full.webp`

Flor individual disponible:

- `assets/pics/retouched/webp/flor_individual_1-retouched-full.webp`

Cada archivo `-full.webp` tiene contraparte `-640.webp` para `srcset`. Con el material actual, el catálogo mostrará 7 productos provisionales; crecerá sin cambiar la composición.

## Composición desktop

- Encabezado compartido, contenido y comportamiento coherentes con la landing.
- Debajo: breadcrumb pequeño “Lirios › Catálogo” y título serif “Catálogo”, sin hero.
- Estructura principal asimétrica: rail izquierdo de aproximadamente 22–24% y galería a la derecha.
- El rail contiene categorías con conteos, luego `Color`, `Tipo de flor`, `Ordenar` y al final el enlace secundario “Crear un arreglo personalizado →”.
- El rail es `position: sticky` debajo del header, no `fixed` al viewport.
- La galería usa tres columnas con imágenes dominantes, esquinas rectas, nombre serif, categoría sans y precio/placeholder debajo.
- El primer producto puede usar una proporción más vertical; mantener orden DOM natural y evitar masonry que altere lectura o teclado.
- Todo el inventario filtrado se muestra en una página. Sin paginación ni infinite scroll.

## Composición responsive

### 900 px o más

- Rail y galería simultáneos.
- Tres columnas cuando el ancho útil lo permita; dos columnas en el tramo intermedio.

### Menos de 900 px

- El rail desaparece como columna.
- Título compacto, seguido por una franja horizontal de categorías con conteos.
- Fila sticky con `Filtrar N` y `Ordenar`.
- Galería de dos columnas desde 390 px; una columna solo si el viewport o el contenido real no permiten nombres legibles.
- Gutter de 20 px y separación de 12–16 px entre columnas.

### Filtros móviles

- `Filtrar` abre un diálogo/sheet modal desde abajo, como el comp aprobado.
- Esquinas rectas, fondo crema, overlay carbón translúcido.
- Checkboxes cuadrados; nunca pills ni chips redondeados.
- Focus atrapado dentro del diálogo, Escape y “Cerrar” lo cierran, y el foco regresa al disparador.
- Footer fijo con “Limpiar” y un único CTA vino: “Ver N piezas”.
- Bloquear el scroll del documento mientras el diálogo esté abierto.

## Filtros y orden

- Categoría: selección única (`todos`, `arreglos`, `flores`).
- Color: selección múltiple con lógica OR dentro del grupo.
- Tipo de flor: selección múltiple con lógica OR dentro del grupo.
- Entre grupos aplicar lógica AND.
- Ordenar: `Recomendados`, `Nombre A–Z`, `Precio: menor a mayor` y `Precio: mayor a menor` (query param `orden=nombre|precio-asc|precio-desc`). Las opciones de precio solo aparecen cuando al menos un producto tiene precio; los productos sin precio quedan siempre al final y los empates se resuelven por `sortOrder`. Implementado el 2026-09-24 sobre los precios mock.
- Reflejar categoría, colores, tipos y orden en query params para que la vista pueda compartirse y restaurarse.
- Al cambiar filtros, actualizar resultados sin recarga, anunciar “N piezas” en una región `aria-live="polite"` y devolver la galería al inicio solo si esta quedó fuera del viewport.
- `Filtrar N` cuenta filtros activos; la categoría no suma a N porque ya es visible por separado.

No añadir buscador mientras el catálogo se mantenga cerca de 20 productos. Revisar esa decisión a partir de unas 40 piezas.

## Estados obligatorios

- **Carga:** reservar proporción de imágenes para evitar layout shift; usar bloques crema/sand discretos y “Cargando colección…”, sin shimmer agresivo.
- **Error:** “No pudimos cargar la colección.” con acción “Intentar de nuevo”.
- **Sin resultados:** “No encontramos piezas con esa combinación.” y “Limpiar filtros”.
- **Imagen fallida:** conservar nombre y datos; usar fondo neutro sin ilustración inventada.
- **Precio ausente:** “Precio por confirmar”.
- **Catálogo vacío:** mensaje sobrio y ruta a personalización; no mostrar filtros vacíos.

## Interacción y movimiento

- Hover de producto: escala de imagen máxima aproximada de 1.015 y cambio sutil del subrayado/nombre.
- Nada de apariciones por scroll. La página debe estar visible en reposo.
- Transiciones de filtros entre 160–220 ms; con `prefers-reduced-motion`, cambio inmediato o fundido breve.
- Toda la tarjeta es un enlace, con foco visible de 3 px vino y offset suficiente.

## Accesibilidad

- Controles sans; nombres y títulos serif según `DESIGN.md`.
- Targets táctiles mínimos de 44×44 CSS px.
- Los grupos de filtros deben tener `fieldset` y `legend` o semántica equivalente.
- La categoría activa se comunica con texto/estado, no solo color.
- El orden visual y DOM deben coincidir.
- `alt` describe la pieza y material, no repite el nombre sin contexto.
- Contraste mínimo WCAG AA y navegación completa por teclado.

## No hacer

- No añadir hero, textos persuasivos, testimonios ni mosaicos de categorías.
- No usar cards elevadas, bordes redondeados, pills, glass, gradientes o badges comerciales.
- No inventar precios (salvo los mock de maquetación descritos en «Modelo de datos mínimo»), stock, descuentos, entrega, colores o especies.
- No instalar una librería de componentes ni de estado para esta página.
- No regenerar las fotografías existentes.
- No cambiar `DESIGN.md` salvo que la implementación requiera una decisión durable aprobada.
- No tocar la composición aprobada de la landing salvo el mínimo necesario para convertirla en ruta.

## Criterios de aceptación

1. `/catalogo` carga directamente productos y reproduce la jerarquía del comp desktop.
2. A 390×844 la interfaz reproduce el comp móvil, con al menos cuatro productos visibles o parcialmente visibles antes de desplazarse demasiado.
3. Categorías, filtros y orden sobreviven recarga mediante query params.
4. Los conteos coinciden con los datos reales.
5. No hay paginación, búsqueda ni contenido promocional redundante.
6. Los estados vacío, error, carga y precio ausente están implementados.
7. El diálogo móvil cumple cierre, retorno de foco, Escape y bloqueo de scroll.
8. La landing conserva su apariencia y sus anclas funcionan desde ambas rutas.
9. `pnpm test` y `pnpm run build` pasan.
10. Se capturan y revisan en una sola ronda inicial: desktop 1536×1024, desktop 1440×900, mobile 390×844 y estado móvil de filtros abierto; una segunda ronda como máximo después de corregir en lote.

## Proceso Impeccable para la instancia ejecutora

1. Ejecutar una vez `impeccable context --target src/app/pages/catalog/catalog.component.html`.
2. Leer `reference/new-work.md` y `reference/craft-floor.md` antes de editar UI.
3. Tratar el desktop aprobado como comp vinculante y las dos vistas móviles como referencias de adaptación/estado.
4. Construir con imágenes reales existentes; no producir plates nuevas.
5. Ejecutar el detector una sola vez al final de las correcciones mecánicas.
6. Hacer finish review con capturas desktop y móvil; no autoaprobar la implementación.

## Comandos de verificación

Usar siempre `pnpm`, nunca npm/npx.

```bash
pnpm test
pnpm run build
pnpm start --host 127.0.0.1 --port 4200
```

Capturas con el helper existente:

```bash
node .impeccable/build/capture.mjs http://127.0.0.1:4200/catalogo .impeccable/review/catalog-desktop.png 1536 1024
node .impeccable/build/capture.mjs http://127.0.0.1:4200/catalogo .impeccable/review/catalog-mobile.png 390 844
```

El workspace no funciona actualmente como repositorio Git; revisar cambios por archivos y no depender de `git diff`.
