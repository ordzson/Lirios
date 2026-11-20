---
version: 1
slug: 'admin-shell'
primary_target: 'src/app/pages/admin/shell/admin-shell.component.html'
related_targets:
  - 'src/app/pages/admin/shell/admin-shell.component.ts'
  - 'src/app/pages/admin/shell/admin-shell.component.scss'
  - 'src/app/pages/admin/shell/admin-nav.ts'
  - 'src/app/pages/admin/admin.routes.ts'
  - 'src/app/core/auth/auth.service.ts'
  - 'src/app/core/auth/admin.guard.ts'
  - '.impeccable/surfaces/admin.md'
  - '.impeccable/surfaces/ui-kit.md'
mode: 'Operate'
owner: 'A2 (Oleada 1), con el líder para admin.routes.ts'
tests: 'UI-06'
decision: 'contrato fijado por el líder en la Oleada 0 (PLAN.md §7.5); extiende «Mesa de taller» (admin.md)'
---

# Shell del panel

## THESIS

**La mesa de taller cabe en el bolsillo.** El panel deja de ser un solo componente y pasa a un marco que sostiene secciones lazy: en el teléfono, una barra inferior al alcance del pulgar con lo que se usa a diario; en escritorio, la barra lateral noche actual. Extiende la dirección «Mesa de taller» de `.impeccable/surfaces/admin.md`; no la reemplaza. Rehúsa el menú hamburguesa como navegación principal y el dashboard de tarjetas.

## OWN-WORLD

Hereda `DESIGN.md` y `admin.md`: noche para la barra lateral, crema para la mesa, vino para la sección activa y el foco, Manrope en toda la operación. Sin hexadecimales: solo tokens. La sección activa se marca con `aria-current="page"` y una regla o peso visible, no solo con color.

## STORY

La dueña abre el panel en el teléfono y cae en «Hoy». Con el pulgar pasa a Pedidos, Agenda o Taller; lo demás (catálogo, precios, promociones, estadísticas, ajustes, equipo) vive en «Más», una hoja inferior. Una persona de Operación ve el mismo marco sin las secciones que no le tocan: no aparecen ni deshabilitadas, simplemente no están. En escritorio todo está en la barra lateral, agrupado.

## FIRST VIEWPORT

- **390 px:** encabezado compacto (marca + nombre de la sección) arriba; contenido en una columna; barra inferior fija de 5 destinos (Hoy · Pedidos · Agenda · Taller · Más) con ícono y texto, ≥ 44 px de alto más `safe-area-inset-bottom`. La barra fija de acción de cada pantalla (`ui-sticky-action-bar`) se apila encima de la barra de navegación.
- **Desde `@include from(desktop)`:** barra lateral noche a la izquierda con todos los destinos; la barra inferior y «Más» no se muestran.

## FORM

- `AdminShellComponent` (standalone, OnPush) con `<router-outlet>`; las secciones son rutas hijas lazy en `admin.routes.ts`, protegidas por `adminGuard`. A2 traslada el panel v1 (resumen, pedidos, catálogo, equipo) a esas rutas **sin cambiar su comportamiento**.
- La navegación sale de un arreglo de datos (`ADMIN_NAV` en `admin-nav.ts`), no de marcado repetido; el shell lo filtra por rol una sola vez con un `computed`.
- Los destinos sin paquete todavía (Agenda, Taller, Precios, Promos, Estadísticas, Ajustes) existen desde A2 como rutas con `ui-empty-state` («Esta sección llega pronto.»), para que la navegación sea la definitiva desde el principio.
- Riesgo honesto: cinco destinos más «Más» puede esconder Catálogo, que hoy se usa mucho. Si la dueña lo pide, Catálogo cambia de lugar con Agenda en la barra; el contrato de `data-testid` no cambia.

## Contrato de prueba

Vinculante desde que T escribe UI-06: cambiar selector, `data-testid`, ids de destino o textos pasa por el líder (PLAN.md §7.5).

### Componente

- Selector `app-admin-shell` · `src/app/pages/admin/shell/admin-shell.component.ts` · sin inputs ni outputs.
- Lee el rol **solo** de `AuthService` (`src/app/core/auth/auth.service.ts`): `isAdmin: Signal<boolean>`, `profile: Signal<StaffProfile | null>` (nombre en el encabezado) y `signOut(): Promise<void>`. Las pruebas sustituyen `AuthService` por un objeto con esas tres propiedades y `isStaff: Signal<boolean>`.
- Un destino con `adminOnly: true` **no se renderiza** (`@if`/filtro), ni en la barra lateral, ni en la barra inferior, ni en «Más». Ocultarlo con CSS no cumple.
- Los dos menús (barra lateral y barra inferior + hoja «Más») están siempre en el DOM; el CSS decide cuál se ve según el ancho (jsdom no evalúa media queries). Los enlaces de «Más» están dentro de su `<dialog>` aunque esté cerrado.

### Destinos (`ADMIN_NAV`)

| id | Texto | Ruta | `adminOnly` | Barra inferior (móvil) |
| --- | --- | --- | --- | --- |
| `hoy` | Hoy | `/admin` | no | sí |
| `pedidos` | Pedidos | `/admin/pedidos` | no | sí |
| `agenda` | Agenda | `/admin/agenda` | no | sí |
| `taller` | Taller | `/admin/taller` | no | sí (Materiales y Recetas) |
| `catalogo` | Catálogo | `/admin/catalogo` | no | en «Más» |
| `precios` | Precios | `/admin/precios` | **sí** | en «Más» |
| `promos` | Promos | `/admin/promos` | **sí** | en «Más» |
| `estadisticas` | Estadísticas | `/admin/estadisticas` | **sí** | en «Más» |
| `ajustes` | Ajustes | `/admin/ajustes` | **sí** | en «Más» |
| `equipo` | Equipo | `/admin/equipo` | **sí** | en «Más» |

```ts
export interface AdminNavItem {
  id: 'hoy' | 'pedidos' | 'agenda' | 'taller' | 'catalogo' | 'precios' | 'promos' | 'estadisticas' | 'ajustes' | 'equipo';
  label: string;
  path: string;
  adminOnly: boolean;
  primary: boolean;   // true = barra inferior en móvil; false = hoja «Más»
}
export const ADMIN_NAV: readonly AdminNavItem[];
```

`/admin/taller` muestra dos enlaces, «Materiales» (`/admin/materiales`) y «Recetas» (`/admin/recetas`); en escritorio la barra lateral muestra «Taller» como encabezado de grupo con esos dos enlaces. `/admin/_kit` (muestrario, solo `isDevMode()`) no está en `ADMIN_NAV`.

### `data-testid`

| `data-testid` | Elemento |
| --- | --- |
| `admin-shell-sidebar` | `<nav aria-label="Panel">` de escritorio |
| `admin-shell-sidebar-<id>` | cada enlace de la barra lateral (`<id>` de la tabla) |
| `admin-shell-tabbar` | `<nav aria-label="Secciones">` inferior de móvil |
| `admin-shell-tabbar-<id>` | cada enlace de la barra inferior (`hoy`, `pedidos`, `agenda`, `taller`) |
| `admin-shell-more-trigger` | botón «Más» de la barra inferior (abre un `ui-sheet` con `label` «Más secciones») |
| `admin-shell-more-sheet` | el `ui-sheet` de «Más» |
| `admin-shell-more-<id>` | cada enlace dentro de «Más» |
| `admin-shell-title` | nombre de la sección actual en el encabezado |
| `admin-shell-content` | `<main>` que contiene el `<router-outlet>` |
| `admin-shell-signout` | botón «Cerrar sesión» |

### UI-06, qué se compara

- Como `manager` (`isAdmin()` = `false`): no existe ningún elemento `admin-shell-*-precios`, `-promos`, `-estadisticas`, `-ajustes` ni `-equipo`, ni enlace con nombre accesible «Precios», «Promos», «Estadísticas», «Ajustes» o «Equipo». Sí existen Hoy, Pedidos, Agenda, Taller y Catálogo.
- Como `admin`: existen los diez destinos en `admin-shell-sidebar` y los seis no primarios en «Más».
- El enlace de la ruta activa lleva `aria-current="page"`.

## Textos que comparan las pruebas

«Hoy» · «Pedidos» · «Agenda» · «Taller» · «Catálogo» · «Precios» · «Promos» · «Estadísticas» · «Ajustes» · «Equipo» · «Más» · «Más secciones» · «Materiales» · «Recetas» · «Cerrar sesión» · «Esta sección llega pronto.» · `aria-label` «Panel» y «Secciones».
