---
version: 1
slug: 'ui-kit'
primary_target: 'src/app/ui/'
related_targets:
  - 'src/styles/_tokens.scss'
  - 'src/styles/_mixins.scss'
  - 'src/app/pages/admin/kit/'
  - 'DESIGN.md'
  - 'PLAN.md'
mode: 'Operate'
owner: 'A2 (Oleada 1); después de la Oleada 1, el líder'
tests: 'UI-01, UI-02, UI-03, UI-04, UI-05, F7'
decision: 'contrato fijado por el líder en la Oleada 0 (PLAN.md §7.5)'
---

# Kit de interfaz

## THESIS

**Las herramientas de la mesa de taller.** Un juego pequeño de piezas sobrias que el panel y la tienda comparten: mismas esquinas rectas, mismas reglas finas, mismo vino para la acción. Cada pieza resuelve una tarea concreta del taller (contar, cobrar, elegir, confirmar, deshacer) y se opera completa con el pulgar a 390 px y con teclado. Rehúsa la librería genérica de componentes redondeados y el adorno: nada de sombras, píldoras, gradientes ni animación decorativa.

## OWN-WORLD

Hereda `DESIGN.md` sin cambios: crema mate, vino, carbón y noche; Manrope para operar; Bodoni solo en títulos de hoja si el contexto es de marca. Colores y medidas vienen solo de `src/styles/_tokens.scss` (sin hexadecimales en el kit). Movimiento: transiciones de estado de 160–180 ms y nada con `prefers-reduced-motion: reduce`. Objetivos táctiles ≥ 44 px (`@include touch-target`). Estado activo nunca depende solo del color.

## STORY

La dueña cuenta limpiapipas con un contador, escribe lo que pagó por un lote con coma o punto, elige colores con chips, abre una hoja inferior para registrar una compra, confirma una cancelación y, si se equivoca, toca «Deshacer» en el aviso. Todo pasa en el teléfono, en la mesa, con las manos ocupadas: piezas grandes, texto claro, cero sorpresas.

## FIRST VIEWPORT

El muestrario `/admin/_kit` (solo en desarrollo, `isDevMode()`) apila cada pieza en una columna a 390 px con su nombre como encabezado de sección y sus estados (normal, deshabilitado, error). A 1440 px las secciones se acomodan en dos columnas. Arriba, los disparadores de la hoja y de la confirmación, porque F7 los usa.

## FORM

- Standalone, `ChangeDetectionStrategy.OnPush`, inputs/outputs/model por señal. Una carpeta por pieza: `src/app/ui/<nombre>/<nombre>.component.ts` (y `.html`, `.scss` si hace falta), exportada desde `src/app/ui/index.ts`.
- Sin `innerHTML`. Sin dependencias nuevas.
- Hoja (`sheet`) y confirmación sobre `<dialog>` nativo: hoja inferior en móvil (borde superior recto, ancho completo, respeta `safe-area-inset-bottom`), panel lateral derecho desde `@include from(desktop)`.
- En jsdom `showModal` y `close` son el sustituto de `src/test-setup.ts`: los componentes no deben depender de otro comportamiento del diálogo para montar.
- Riesgo honesto: un kit muy completo antes de tener pantallas tienta a inventar variantes. Se construyen las piezas de PLAN.md §4.2 con las variantes mínimas; lo que falte se agrega cuando una pantalla lo pida dos veces.

## Contrato de prueba

Vinculante desde que T escribe UI-01..06 y F7: cambiar un selector, input, output, `data-testid` o texto pasa por el líder (PLAN.md §7.5). Las pruebas buscan primero por rol y nombre accesible; el `data-testid` cubre lo que no tiene rol estable. Formato `<superficie>-<elemento>[-<id>]`, en kebab-case. Tipos en notación de Angular (`input<T>()`, `input.required<T>()`, `model<T>()`, `output<T>()`).

### `ui-number-stepper` · UI-01 · `src/app/ui/number-stepper/`

| Miembro | Tipo | Por defecto | Notas |
| --- | --- | --- | --- |
| `value` | `model<number>` | `0` | Siempre dentro de `[min, max]`; se ajusta al límite si llega fuera. |
| `min` | `input<number>` | `0` | |
| `max` | `input<number \| null>` | `null` | `null` = sin máximo. |
| `step` | `input<number>` | `1` | |
| `label` | `input.required<string>` | — | Nombre accesible del control. |
| `disabled` | `input<boolean>` | `false` | |

- Estructura: botón «Quitar uno» · valor · botón «Agregar uno».
- El valor es el elemento con `role="spinbutton"`, enfocable (`tabindex="0"`), con `aria-label` = `label`, `aria-valuenow` = `value`, `aria-valuemin` = `min` y `aria-valuemax` = `max` (ausente si `max` es `null`).
- Teclado sobre el valor: `ArrowUp`/`ArrowRight` suma `step`; `ArrowDown`/`ArrowLeft` resta `step`; `Home` va a `min`; `End` va a `max` (si existe). Nunca pasa de los límites.
- En el límite, el botón correspondiente lleva el atributo `disabled`.

| `data-testid` | Elemento |
| --- | --- |
| `number-stepper-decrement` | botón «Quitar uno» (`aria-label="Quitar uno"`) |
| `number-stepper-value` | elemento `role="spinbutton"` |
| `number-stepper-increment` | botón «Agregar uno» (`aria-label="Agregar uno"`) |

### `ui-sheet` · UI-02, F7 · `src/app/ui/sheet/`

| Miembro | Tipo | Por defecto | Notas |
| --- | --- | --- | --- |
| `open` | `model<boolean>` | `false` | `true` → `dialog.showModal()`; `false` → `dialog.close()`. |
| `label` | `input.required<string>` | — | Título visible de la hoja; el `<dialog>` lo usa con `aria-labelledby`. |
| `closed` | `output<void>` | — | Se emite una vez cada vez que el `<dialog>` dispara `close` (botón, Esc o `open = false`). |

- Renderiza un `<dialog>` nativo. Al recibir el evento `close` del diálogo: `open` pasa a `false` y se emite `closed`.
- Botón de cierre con `aria-label="Cerrar"`. El contenido se proyecta (`<ng-content>`); una acción fija inferior opcional se proyecta con el atributo `sheet-actions`.
- Al cerrar, el foco vuelve al elemento que tenía el foco al abrir (lo verifica F7 en Chrome).

| `data-testid` | Elemento |
| --- | --- |
| `sheet-dialog` | el `<dialog>` |
| `sheet-title` | el título (texto = `label`) |
| `sheet-close` | botón «Cerrar» |

### `ui-confirm-dialog` · F7 · `src/app/ui/confirm-dialog/`

| Miembro | Tipo | Por defecto |
| --- | --- | --- |
| `open` | `model<boolean>` | `false` |
| `title` | `input.required<string>` | — |
| `message` | `input<string>` | `''` |
| `confirmLabel` | `input<string>` | `'Confirmar'` |
| `cancelLabel` | `input<string>` | `'Cancelar'` |
| `tone` | `input<'default' \| 'danger'>` | `'default'` |
| `confirmed` | `output<void>` | — |
| `cancelled` | `output<void>` | — (también con Esc) |

Mismo comportamiento de `<dialog>` que `ui-sheet`. `data-testid`: `confirm-dialog-dialog`, `confirm-dialog-confirm`, `confirm-dialog-cancel`.

### Avisos con deshacer · UI-03 · `src/app/ui/toast/`

- Servicio `ToastService` (`providedIn: 'root'`):
  - `show(options: { message: string; undo?: () => void; durationMs?: number }): string` → id del aviso. `durationMs` por defecto `6000`.
  - `dismiss(id: string): void`
  - `toasts: Signal<readonly { id: string; message: string; hasUndo: boolean }[]>`
- Componente `ui-toast-host` (uno, en el shell del panel y en el muestrario): región con `role="status"` y `aria-live="polite"` que siempre existe en el DOM (aunque esté vacía) y muestra los avisos de `toasts()`.
- Si el aviso trae `undo`: botón «Deshacer». Tocarlo llama a `undo()` una sola vez y cierra el aviso. Al vencer `durationMs` el aviso se cierra sin llamar a `undo`.

| `data-testid` | Elemento |
| --- | --- |
| `toast-region` | la región `aria-live` |
| `toast-item` | cada aviso (texto = `message`) |
| `toast-undo` | botón «Deshacer» |

### `ui-money-input` · UI-04 · `src/app/ui/money-input/`

| Miembro | Tipo | Por defecto | Notas |
| --- | --- | --- | --- |
| `value` | `model<number \| null>` | `null` | Número redondeado a 2 decimales (`Math.round(n * 100) / 100`); `null` si está vacío. |
| `label` | `input.required<string>` | — | `<label for>` visible. |
| `min` | `input<number>` | `0` | |
| `disabled` | `input<boolean>` | `false` | |

- `<input type="text" inputmode="decimal">` con prefijo visible «Q».
- Se interpreta en cada evento `input` (precio y margen reaccionan al instante): se quitan espacios; se acepta **un** separador decimal, `.` o `,`, con hasta 2 decimales. `'145'` → `145`; `'145.5'` → `145.5`; `'145,50'` → `145.5`.
- Rechaza negativos (`'-5'`), menores que `min`, más de 2 decimales, separadores de miles (`'1,250.50'`) y texto: no cambia `value`, pone `aria-invalid="true"` y muestra «Escribe un monto válido.» (enlazado con `aria-describedby`).
- Al perder el foco con un valor válido, muestra el número con 2 decimales (`145.50`).

| `data-testid` | Elemento |
| --- | --- |
| `money-input-control` | el `<input>` |
| `money-input-error` | el mensaje de error (solo existe si hay error) |

### `ui-chip-group` · UI-05 · `src/app/ui/chip-group/`

| Miembro | Tipo | Por defecto | Notas |
| --- | --- | --- | --- |
| `options` | `input.required<readonly ChipOption[]>` | — | `interface ChipOption { value: string; label: string; disabled?: boolean }` (exportada desde `src/app/ui/chip-group/`). |
| `selected` | `model<readonly string[]>` | `[]` | Selección única: 0 o 1 elemento. |
| `multiple` | `input<boolean>` | `false` | |
| `label` | `input.required<string>` | — | Contenedor `role="group"` con `aria-label` = `label`. |

- Cada chip es `<button type="button">` con `aria-pressed="true|false"` y una marca visible además del color (borde y ✓ de `ui-icon`).
- Única: tocar un chip lo deja como único seleccionado; tocar el ya activo no cambia nada.
- Múltiple: tocar alterna; el orden de `selected` sigue el orden de `options`.
- Un chip `disabled` no cambia la selección.

| `data-testid` | Elemento |
| --- | --- |
| `chip-group-chip-<value>` | cada chip |

### Resto del kit (PLAN.md §4.2; sin prueba de catálogo todavía)

Selector fijo; inputs orientativos, los afina A2 y quedan escritos aquí al cerrar la Oleada 1: `ui-button` (`variant: 'primary' | 'secondary' | 'quiet' | 'danger'`, `type`, `disabled`, `busy`), `ui-icon` (`name`), `ui-field` (`label`, `hint`, `error`), `ui-text-input`, `ui-select`, `ui-segmented` (`options`, `value: model<string>`), `ui-switch` (`checked: model<boolean>`, `label`; `role="switch"`), `ui-tabs`, `ui-list-detail`, `ui-empty-state` (`title`, `message`), `ui-skeleton`, `ui-meter` (`value`, `min`, `max`, `low`, `label`), `ui-stat` (`label`, `value`, `delta`), `ui-status-dot` (`status`, `label` en texto), `ui-photo` (`src`, `srcSmall`, `alt`), `ui-sticky-action-bar` (con safe-area), `ui-bar-chart` y `ui-line-chart` (con tabla alternativa accesible). Carpetas reservadas para otros paquetes: `ui/image-upload` (A4), `ui/capacity-calendar` (B3), `ui/composer` (B2), `ui/bouquet-builder` (C0).

### Muestrario `/admin/_kit` · F7

- Ruta hija del panel, cargada solo si `isDevMode()`; no aparece en la navegación del shell.
- Botón «Abrir hoja» (`data-testid="kit-sheet-trigger"`) abre un `ui-sheet` con `label` «Hoja de prueba».
- Botón «Abrir confirmación» (`data-testid="kit-confirm-trigger"`) abre un `ui-confirm-dialog` con `title` «¿Confirmar la prueba?».
- F7: tras Esc, el diálogo queda cerrado y `document.activeElement` es el disparador correspondiente.
- A4 agrega después su sección `ui-image-upload` (F6) con el contrato de su propio brief.

## Textos que comparan las pruebas

«Quitar uno» · «Agregar uno» · «Cerrar» · «Confirmar» · «Cancelar» · «Deshacer» · «Escribe un monto válido.» · «Abrir hoja» · «Abrir confirmación» · «Hoja de prueba» · «¿Confirmar la prueba?»
