# Plan de implementación — Módulo administrativo de Dumish Blooms

Fecha: 2026-10-31 (America/Guatemala).

## 1. Objetivo

Que la dueña del negocio pueda operar la tienda completa desde el panel, también desde el teléfono, sin tocar código ni Supabase:

- **Pedidos**: recibir, confirmar por WhatsApp, cobrar, preparar, entregar y cancelar con un flujo guiado.
- **Catálogo**: productos, precios, inventario, fotografías, colores y tipos de flor.
- **Páginas**: todos los textos e imágenes de las páginas públicas (inicio, personalizados, carrito, confirmación, pie de página).
- **Ajustes del negocio**: contacto, WhatsApp, redes, métodos de pago, datos bancarios, entregas, mensajes predefinidos y pausa de pedidos.

Cada cambio guardado debe verse en la página pública en la siguiente carga, sin redeploy.

### Qué no será administrable (deliberadamente)

Estructura de las páginas, colores, tipografía, rutas y microcopy de controles y formularios (por ejemplo «Agregar al carrito» o los mensajes de validación). Están gobernados por `DESIGN.md` y por los criterios de accesibilidad; abrirlos permitiría romper el diseño sin querer. Todo el **contenido** sí será administrable.

---

## 2. Documentación existente

| Documento | Qué aporta |
| --- | --- |
| `.impeccable/surfaces/admin.md` | Dirección visual vigente del panel: **«Mesa de taller»**. Las pantallas nuevas la extienden; no se reabre la dirección. |
| `DESIGN.md` | Tokens, tipografía (Bodoni solo en marca y acceso; Manrope en toda la operación) y reglas: esquinas rectas, sin elevación decorativa. |
| `DEPLOYMENT.md` | Provisión de Supabase, R2 y Vercel. Se ampliará con las variables y pasos nuevos. |
| `PRODUCT.md` | Modelo de negocio: confirmación manual por WhatsApp o correo, transferencia o contraentrega, seguimiento sin cuenta. |
| `CHECKOUT_HANDOFF.md` | Decisión vigente: el checkout ofrece **solo contraentrega**. |

No existía un plan de implementación del módulo administrativo; este documento lo cubre.

---

## 3. Estado actual

### Ya implementado (v1)

- Acceso `/admin/acceso` con Supabase Auth y `adminGuard` (`src/app/core/auth/`).
- Panel único `src/app/pages/admin/dashboard/` con cuatro secciones conmutadas por señal (`?section=`):
  - **Resumen**: franja de métricas, pedidos en movimiento y stock bajo.
  - **Pedidos**: tabla con búsqueda y filtro, detalle lateral y cambio de estado mediante `<select>`.
  - **Catálogo**: lista y editor (nombre, slug, descripción, tipo, precio, inventario, estado, destacado) y carga de **una** foto a R2.
  - **Equipo**: cambio de rol entre `admin` y `manager`.
- Modo vista previa local con datos ilustrativos (`/admin?preview=1`, solo en localhost).
- Base de datos `supabase/migrations/202610030001_initial_store.sql`: productos, imágenes, pedidos, ítems, historial de estado, RLS, `create_order` y `track_order`.
- Functions `api/uploads/sign.ts` (URL firmada de 5 min) y `api/uploads/delete.ts` (sin uso desde el front).

### Brechas y defectos detectados

**Contenido no administrable**

1. Inicio (`src/app/app.component.html`): hero, mosaico de categorías, «Arreglos listos», «Una flor también basta», tiers, proceso, seguimiento y footer están escritos en el HTML.
2. «Arreglos listos» del inicio muestra tres productos fijos. Si se archiva «Lirios carmesí», sigue apareciendo.
3. Personalizados (`custom-arrangements.component.ts`): las opciones, muestras y mensajes de WhatsApp están en la constante `CHOICES`, y el número `50250746766` está hardcodeado.
4. Inconsistencias de contacto: el footer del inicio dice «datos por confirmar» y el de personalizados muestra «+502 5074 6766».
5. Los tiers se llaman distinto según la página: «Un gesto» en inicio y «Un detalle» en personalizados.
6. Las imágenes laterales del carrito vacío y de la confirmación están fijas, y `cart.component.ts` tiene el hack `checkoutImage()` que mapea IDs a plates.
7. El texto de seguimiento del inicio anuncia la orden demo `LIR-2048`, algo que no debe verse en producción.

**Catálogo**

8. El editor no tiene campos de **colores** ni **tipos de flor**: un producto nuevo no aparece en ningún filtro.
9. Las etiquetas de filtro son enums fijos en TypeScript (`COLOR_LABELS`, `FLOWER_LABELS` en `catalog.component.ts`). Un color nuevo («azul») nunca aparecería como filtro.
10. La descripción no se carga ni se muestra en el detalle público (`catalog-data.service.ts` no la selecciona).
11. Fotos: no se pueden borrar, reordenar, elegir portada ni editar su texto alternativo. Se suben a tamaño completo (hasta 10 MB) sin variantes 640/1600, lo que hace lenta la carga en móvil.

**Pedidos**

12. **Cancelar no devuelve el inventario** reservado por `create_order`.
13. `create_order` guarda `image_url`/`image_alt` tal como vienen del navegador; un cliente puede inyectar cualquier URL. Deben salir de la base.
14. RLS `orders_staff_all` permite a Operación **borrar** pedidos. Los pedidos no deberían borrarse nunca, solo cancelarse.
15. Sin costo de entrega, descuento, fecha de entrega, estado de pago, notas internas, historial visible ni pedidos manuales (los encargos personalizados llegan por WhatsApp y hoy no pueden registrarse).
16. Cambiar el estado con un `<select>` admite saltos sin sentido (de «Recibido» a «Entregado») y no deja nota.
17. La confirmación `/pedido/:n` solo funciona en el navegador que creó el pedido (`OrderService.find()` lee `localStorage`).
18. Sin aviso de pedido nuevo: hay que recargar el panel para verlo.
19. La consulta trae como máximo 200 pedidos, sin paginación ni filtro por fecha.

**Equipo y acceso**

20. No se puede invitar a una persona desde el panel ni restablecer la contraseña desde `/admin/acceso`; ambas cosas exigen entrar a Supabase.
21. Nada impide quitar el rol a la última cuenta administradora.

**Infraestructura**

22. `.git` está vacío: este workspace no tiene control de versiones operativo. Resolverlo antes de empezar (Fase 0).
23. El plan gratuito de Supabase **pausa el proyecto tras 7 días sin actividad**. En un negocio con tráfico esporádico, la tienda dejaría de recibir pedidos.

---

## 4. Principios de experiencia del panel

1. **Pensado primero para el teléfono.** Objetivos táctiles de al menos 44 px, barra de guardar fija abajo y lista y detalle como pantallas consecutivas a 360–390 px. El botón «atrás» del teléfono cierra el detalle porque cada vista tiene su propia URL.
2. **Lenguaje del negocio, no técnico.** «Dirección web» en lugar de slug; «Hecho bajo pedido» en lugar de «no controlar inventario». Los campos técnicos (slug, orden manual) van plegados en «Opciones avanzadas».
3. **El siguiente paso, no un menú de estados.** Cada pedido muestra un botón principal con la acción que toca («Confirmar pedido», «Empezar preparación», «Marcar listo», «Salió a entregar», «Entregado»). Cancelar es una acción secundaria con motivo.
4. **Ver dónde aparece.** Cada sección editable muestra una miniatura de su ubicación y un enlace «Ver en la página» que abre el ancla exacta.
5. **Imposible romper el diseño.** Los textos tienen límites de caracteres medidos sobre el layout real, con contador. Las imágenes muestran el recorte real en escritorio y móvil, con punto focal ajustable.
6. **Nada se pierde.** Aviso de cambios sin guardar al salir. Los errores conservan lo escrito. Historial de versiones con «Restaurar» en cada sección. Cada cambio de estado ofrece «Deshacer» durante 6 segundos.
7. **Confirmar solo lo destructivo.** Cancelar un pedido, borrar una foto o archivar un producto piden confirmación; el resto se guarda directamente.
8. **Estados vacíos que enseñan.** Siguen la regla de `admin.md`.

---

## 5. Arquitectura: cómo llega un cambio a la página

```
Panel (Angular) ──RPC/REST con sesión──▶ Supabase Postgres (RLS)
      │                                         ▲
      └─ fotos: redimensiona en el navegador    │ get_site_bundle() (anon)
         → URL firmada (/api/uploads/sign)      │
         → PUT directo a R2                     │
                                                │
Página pública ── al arrancar ──────────────────┘
      └─ si falla: último bundle en caché local → valores por defecto incluidos en el build
```

### 5.1 Capa de datos pública: `SiteDataService`

- Una sola RPC pública, `get_site_bundle()`, devuelve en un viaje: ajustes públicos, todas las secciones de contenido, colores, tipos de flor y productos activos con sus imágenes. Con unos 20 productos son menos de 40 KB.
- Se carga en `provideAppInitializer` (`src/app/app.config.ts`) con un límite de 2,5 s:
  1. Si Supabase responde, se usa y se guarda en `localStorage` (`lirios:site:v1`).
  2. Si tarda o falla, se usa el último bundle guardado.
  3. Si no hay ninguno, se usan los **valores por defecto** de `content-defaults.ts`.
- Expone señales tipadas: `settings()`, `section('home.hero')`, `colors()`, `flowers()` y `products()`.
- `CatalogDataService` deja de consultar por su cuenta y lee del bundle. En producción con Supabase configurado **nunca** cae al catálogo local con precios mock: si falla, muestra el estado de error ya existente.
- GitHub Pages sigue funcionando como demo: sin credenciales, todo sale de los valores por defecto.

### 5.2 Modelo de contenido: registro de esquema

`src/app/core/site/content-schema.ts` define cada sección editable una sola vez:

```ts
interface ContentSectionSchema {
  key: `${PageKey}.${string}`;     // 'home.hero'
  page: PageKey;                    // 'home' | 'custom' | 'cart' | 'confirmation' | 'footer'
  label: string;                    // 'Portada'
  where: string;                    // 'Lo primero que se ve al abrir la página'
  anchor?: string;                  // '#arreglos' para «Ver en la página»
  fields: ContentField[];
}

type ContentField =
  | { type: 'text' | 'textarea'; name: string; label: string; maxLength: number; help?: string; required?: boolean }
  | { type: 'lines'; name: string; label: string; maxLines: number; maxLengthPerLine: number }
  | { type: 'image'; name: string; label: string; crops: CropPreview[]; help?: string }
  | { type: 'list'; name: string; label: string; min: number; max: number; item: ContentField[] };
```

- **Valores por defecto** (`content-defaults.ts`) = copy e imágenes actuales del HTML. Con las tablas vacías, el sitio queda **idéntico al actual**; ese es el criterio de no regresión.
- El editor de páginas del panel se **genera** a partir del esquema. Añadir una sección nueva no requiere pantalla nueva.
- Los enlaces son fijos en el código y solo su texto es editable, para que no puedan romperse rutas.
- Todo se renderiza con interpolación de Angular (auto-escapado). Nunca `innerHTML`.

### 5.3 Imágenes

Componente compartido `SiteImageComponent` (`<app-site-image [image]="..." sizes="...">`) que renderiza `src`, `srcset` (640w y 1600w), `width`/`height`, `alt` y `object-position` según el punto focal. Lo usan todas las páginas, lo que elimina las rutas `assets/...` del HTML.

Flujo de carga (`media.service.ts` en el panel):

1. Se acepta `image/*` hasta 25 MB, lo que cubre fotos de teléfono, HEIC en iOS incluido, porque Safari lo decodifica.
2. En el navegador: `createImageBitmap(file, { imageOrientation: 'from-image' })` → canvas → variantes de **1600 px** y **640 px** de lado largo en WebP calidad 0,82.
   - Si `canvas.toBlob('image/webp')` devuelve otro tipo (Safari antiguo), se usa JPEG 0,85.
   - Recodificar en canvas **elimina el EXIF**, incluida la ubicación GPS de la foto.
3. `POST /api/uploads/sign` con `{ folder: 'products' | 'site', variants: [{ name: 'full' | '640', contentType, size }] }`. Devuelve dos URLs firmadas con claves generadas en el servidor: `site/<uuid>/full.webp` y `site/<uuid>/640.webp`.
4. `PUT` directo a R2 con barra de progreso.
5. Se inserta la fila en `media` con URLs, dimensiones, alt y punto focal.

Borrado: `POST /api/media/delete { mediaId }`. El servidor verifica que la imagen no se use en `product_images` ni en `site_content`, borra los dos objetos de R2 y luego la fila. Si está en uso, responde con un mensaje que indica dónde se usa.

Las fotos incluidas en `assets/pics/` aparecen en la biblioteca como «Fotos incluidas» para poder reutilizarlas sin subirlas de nuevo.

### 5.4 Panel: rutas y estructura

El componente único de 327 líneas TS y 1214 SCSS se divide en features con lazy loading y rutas propias (`src/app/pages/admin/admin.routes.ts`):

| Ruta | Pantalla |
| --- | --- |
| `/admin` | Inicio (resumen del día) |
| `/admin/pedidos` · `/admin/pedidos/:numero` · `/admin/pedidos/nuevo` · `/admin/pedidos/:numero/hoja` | Pedidos, detalle, pedido manual, hoja imprimible |
| `/admin/productos` · `/admin/productos/:id` · `/admin/productos/nuevo` | Catálogo y editor |
| `/admin/paginas` · `/admin/paginas/:pagina` | Páginas y editor de secciones |
| `/admin/imagenes` | Biblioteca de imágenes |
| `/admin/ajustes/:seccion` | Negocio, pedidos y pagos, entregas, mensajes, equipo |
| `/admin/acceso` · `/admin/restablecer` | Acceso y nueva contraseña |

Servicios en `src/app/pages/admin/shared/`: `orders-admin`, `products-admin`, `content-admin`, `media`, `settings-admin` y `team-admin`. Piezas compartidas: `admin-toast` (con deshacer), `confirm-dialog`, `unsaved-changes.guard.ts`, `char-counter`, `image-picker` (subir o elegir de la biblioteca, recorte y punto focal).

**Modo vista previa local mejorado**: sin credenciales y en localhost, los cambios del panel se guardan en `localStorage` mediante `preview-store.ts` y `SiteDataService` los lee. Así se puede probar el flujo completo «edito → lo veo en la página» antes de provisionar nada.

---

## 6. Modelo de datos (migración nueva)

Archivo: `supabase/migrations/202611010001_admin_cms_orders.sql`. No modifica la migración inicial, solo la extiende.

### 6.1 Tablas nuevas

```sql
-- Ajustes públicos del negocio (fila única)
create table public.site_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Dumish Blooms',
  location_line text not null default 'Floristería artesanal en línea · Quetzaltenango, Guatemala',
  whatsapp_number text not null default '' check (whatsapp_number = '' or whatsapp_number ~ '^[0-9]{8,15}$'),
  contact_email text not null default '',
  instagram_url text not null default '',
  facebook_url text not null default '',
  tiktok_url text not null default '',
  accepting_orders boolean not null default true,
  closed_message text not null default '',
  announcement text not null default '' check (char_length(announcement) <= 140),
  announcement_active boolean not null default false,
  payment_cash_on_delivery boolean not null default true,
  payment_bank_transfer boolean not null default false,
  bank_details jsonb not null default '{}',      -- { bank, accountType, accountNumber, holder, instructions }
  delivery_zones jsonb not null default '[]',    -- [{ name, fee | null }]
  municipalities text[] not null default '{Quetzaltenango}',
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  whatsapp_templates jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Ajustes privados (solo admin)
create table public.site_settings_private (
  id boolean primary key default true check (id),
  notification_emails text[] not null default '{}',
  notify_customer_by_email boolean not null default false
);

-- Contenido de páginas
create table public.site_content (
  key text primary key check (key ~ '^[a-z]+\.[a-z0-9-]+$'),
  data jsonb not null check (pg_column_size(data) < 32000),
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.site_content_revisions (
  id bigint generated always as identity primary key,
  key text not null references public.site_content(key) on delete cascade,
  data jsonb not null,
  version integer not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
-- Trigger: antes de cada update guarda la versión anterior y conserva las últimas 20 por key.

-- Biblioteca de imágenes
create table public.media (
  id uuid primary key default gen_random_uuid(),
  folder text not null check (folder in ('products', 'site')),
  base_key text not null unique,                 -- 'site/<uuid>'
  url text not null,                             -- variante 1600
  url_small text not null,                       -- variante 640
  width integer not null, height integer not null,
  alt_text text not null default '' check (char_length(alt_text) <= 180),
  focal_x numeric(4,3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(4,3) not null default 0.5 check (focal_y between 0 and 1),
  bytes integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Taxonomías del catálogo
create table public.product_colors (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null, swatch text not null check (swatch ~ '^#[0-9a-f]{6}$'),
  sort_order integer not null default 0, active boolean not null default true
);
create table public.flower_types (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null, sort_order integer not null default 0, active boolean not null default true
);
-- Seed con los valores actuales: rojo, rosado, amarillo, blanco, morado / lirio, gerbera, margarita, flor-de-cerezo.

-- Movimientos de inventario (trazabilidad)
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id text not null references public.products(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('order', 'cancel', 'reopen', 'order_edit', 'manual')),
  order_id uuid references public.orders(id) on delete set null,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Bitácora de actividad del panel
create table public.admin_activity (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  action text not null,           -- 'order.status', 'product.update', 'content.update', 'settings.update', 'team.role'…
  entity text not null, entity_id text not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);
```

### 6.2 Cambios en tablas existentes

```sql
create type public.payment_status as enum ('pending', 'paid', 'refunded');
create type public.order_source as enum ('web', 'whatsapp', 'instagram', 'facebook', 'phone', 'other');

alter table public.orders
  add column payment_status public.payment_status not null default 'pending',
  add column paid_at timestamptz,
  add column payment_reference text not null default '',
  add column source public.order_source not null default 'web',
  add column delivery_zone text not null default '',
  add column requested_date date,               -- fecha que sugiere el cliente
  add column delivery_date date,                -- fecha confirmada
  add column delivery_window text not null default '',
  add column discount numeric(10,2) not null default 0 check (discount >= 0),
  add column internal_notes text not null default '',
  add column cancel_reason text not null default '';

alter table public.order_items
  add column custom_description text not null default '';  -- líneas personalizadas sin producto

alter table public.product_images
  add column media_id uuid references public.media(id) on delete restrict,
  add column url_small text not null default '',
  add column width integer, add column height integer,
  add column focal_x numeric(4,3) not null default 0.5,
  add column focal_y numeric(4,3) not null default 0.5;
```

Índices nuevos: `orders(delivery_date)`, `orders(payment_status, status)`, `orders(customer_phone)`, `inventory_movements(product_id, created_at desc)`, `admin_activity(created_at desc)`.

### 6.3 Funciones (todas `security definer`, `set search_path = public, pg_temp`, con verificación explícita de rol)

| Función | Quién | Qué hace |
| --- | --- | --- |
| `get_site_bundle()` | anon | Ajustes públicos, contenido, taxonomías activas y productos activos con imágenes, en un solo JSON. |
| `create_order(p_payload)` *(v2)* | anon | Rechaza si `accepting_orders = false`. Valida el método de pago contra los ajustes, el municipio contra la lista y la zona (asigna la tarifa si es fija). **Ignora la imagen del cliente** y la toma de `product_images`. Guarda la fecha deseada. Anti-spam: máximo 5 pedidos por teléfono por hora. Registra `inventory_movements`. |
| `track_order(p_number)` *(v2)* | anon | Número, estado, línea de tiempo (estado y fecha, **sin notas ni datos personales**), fecha de entrega, productos, total y método de pago. Lo usa también la confirmación en otro dispositivo. |
| `admin_set_order_status(p_order, p_status, p_note)` | staff | Valida la transición (tabla 7.2). Al cancelar **devuelve el inventario**; al reabrir lo vuelve a reservar o falla con mensaje claro si no alcanza. Inserta el historial con nota. Sustituye al `update` directo; el trigger actual queda solo para INSERT. |
| `admin_update_order(p_order, p_patch)` | staff | Zona, costo de entrega, descuento, fechas, franja, estado de pago y referencia, notas internas. Recalcula `total = subtotal + coalesce(delivery_fee, 0) − discount`. |
| `admin_create_order(p_payload)` | staff | Pedido manual con `source`, productos del catálogo y/o líneas personalizadas (descripción + precio), con opción de descontar inventario. |
| `admin_update_order_items(p_order, p_items)` | staff | Solo en `received`/`confirmed`. Agrega, quita o cambia cantidades y pone precio a líneas «por confirmar»; ajusta el inventario por diferencia. |
| `admin_adjust_inventory(p_product, p_delta, p_note)` | staff | Ajuste manual con motivo. |
| `admin_reorder_products(p_ids text[])` | staff | Reescribe `sort_order` en una transacción. |
| `admin_dashboard(p_from, p_to)` | staff | Conteos por estado, entregas por día, ventas entregadas, pendientes de cobro y top de productos. |
| `admin_save_content(p_key, p_data, p_version)` | admin | Guarda con **control de concurrencia optimista**: si otra persona guardó antes, responde conflicto y el panel ofrece recargar. |

Trigger nuevo: `profiles` no permite dejar el sistema sin ninguna cuenta `admin`.

### 6.4 RLS y permisos

| Tabla | anon | Operación (`manager`) | Administración (`admin`) |
| --- | --- | --- | --- |
| `site_settings`, `site_content`, taxonomías | lectura (vía bundle) | lectura | lectura y escritura |
| `site_settings_private`, `admin_activity` | — | — | lectura y escritura |
| `site_content_revisions` | — | lectura | lectura (restaurar = `admin_save_content`) |
| `media` | — | lectura e inserción | todo |
| `products`, `product_images` | lectura de activos | lectura y escritura | todo, incluido borrar |
| `orders`, `order_items`, historial | — | **solo lectura directa**; mutaciones por RPC | igual |
| `inventory_movements` | — | lectura | lectura |

- Se revocan `insert/update/delete` directos sobre `orders` y `order_items` para `authenticated`. Toda mutación pasa por RPC, lo que garantiza inventario e historial coherentes. **Nadie borra pedidos.**
- Realtime: se agrega `orders` a la publicación `supabase_realtime`. Realtime respeta RLS, así que solo staff recibe eventos.

---

## 7. Módulo de pedidos

### 7.1 Lista

- **Pestañas con contador** en lugar del `<select>`: *Nuevos* (received) · *Confirmados* · *En preparación* · *Listos y en camino* · *Entregados* · *Cancelados* · *Todos*.
- Filtros rápidos: «Entregas de hoy», «Mañana», «Esta semana» y «Por cobrar» (entregado y no pagado).
- Búsqueda por número, cliente, receptor o teléfono. Paginación de 50 en 50.
- Cada fila muestra número, antigüedad («hace 3 h», resaltada si un pedido nuevo supera las 12 h sin confirmar), cliente, fecha de entrega, estado, estado de pago y total.
- **Pedido nuevo en vivo**: suscripción Realtime a INSERT en `orders` → aviso «Nuevo pedido de María López», sonido suave (desactivable) y contador en el título de la pestaña: `(2) Pedidos · Dumish`.
- Botón «Exportar» a CSV del rango filtrado, para contabilidad.

### 7.2 Flujo de estados

| Desde | Acción principal | Otras transiciones permitidas |
| --- | --- | --- |
| Recibido | **Confirmar pedido** | Cancelar |
| Confirmado | **Empezar preparación** | Volver a recibido · Cancelar |
| En preparación | **Marcar listo** | Volver a confirmado · Cancelar |
| Listo | **Salió a entregar** | Entregado directo · Cancelar |
| En camino | **Entregado** | Volver a listo |
| Entregado | — | Reabrir (con confirmación) |
| Cancelado | — | Reabrir (vuelve a reservar inventario) |

Toda transición admite nota opcional, queda en el historial con persona y hora, y muestra «Deshacer» durante 6 segundos.

### 7.3 Detalle del pedido

Secciones en orden de uso:

1. **Encabezado**: número, fecha, origen (web, WhatsApp…), estado y botón de siguiente paso.
2. **Contactar**: botones grandes *WhatsApp*, *Llamar* y *Correo*.
3. **Piezas**: líneas con foto, cantidad y precio. Las líneas sin precio se editan inline. «Editar piezas» se habilita solo en recibido o confirmado.
4. **Totales**: subtotal, zona y costo de entrega, descuento y total.
5. **Entrega**: receptor, dirección, referencias, fecha deseada → **fecha confirmada** y franja horaria.
6. **Pago**: método, estado (pendiente, pagado, reembolsado), referencia de transferencia y botón «Marcar como pagado».
7. **Notas**: nota del cliente (solo lectura) y **notas internas** (no las ve el cliente).
8. **Historial**: línea de tiempo de estados con notas y persona.
9. Acciones secundarias: *Imprimir hoja*, *Cancelar pedido* (con motivo obligatorio).

### 7.4 Confirmar por WhatsApp (núcleo del negocio)

Al pulsar «Confirmar pedido» se abre un panel breve:

1. Zona o costo de entrega, fecha y franja (precargados con lo que pidió el cliente).
2. Vista previa del mensaje generado con la plantilla «Confirmación».
3. **«Confirmar y abrir WhatsApp»**: guarda el estado y abre `wa.me/<teléfono del cliente>?text=…`. También existe «Solo confirmar».

Las plantillas son editables en *Ajustes → Mensajes*, con variables insertables mediante botones:

`{cliente}` `{receptor}` `{pedido}` `{productos}` `{subtotal}` `{envio}` `{total}` `{fecha_entrega}` `{franja}` `{metodo_pago}` `{datos_bancarios}` `{enlace_seguimiento}` `{negocio}`

Plantillas iniciales: *Confirmación*, *Datos para transferencia*, *En preparación*, *Va en camino*, *Entregado y gracias* y *Cancelación*. El teléfono del cliente se normaliza: se agrega `502` si son 8 dígitos.

### 7.5 Pedido manual

`/admin/pedidos/nuevo` sirve para los pedidos que llegan por WhatsApp, Instagram o teléfono, y en especial los **arreglos personalizados**:

- Origen, cliente (con autocompletado por teléfono a partir de pedidos anteriores), receptor y entrega.
- Productos del catálogo (buscador con foto) y/o **línea personalizada** (descripción + precio + foto de referencia opcional).
- «Descontar del inventario» activado por defecto para productos del catálogo.
- Genera número `LIR-…` igual que la web, de modo que el cliente puede seguirlo.

### 7.6 Hoja imprimible

`/admin/pedidos/:numero/hoja`: vista en CSS de impresión, A5 o media carta, con número, piezas, receptor, dirección, referencias, franja, total a cobrar si es contraentrega y notas. Sirve para el taller y para quien entrega.

### 7.7 Lado del cliente

- `/pedido/:numero` en otro dispositivo usa `track_order` v2 y muestra estado, línea de tiempo, piezas y total, sin dirección ni teléfono.
- El seguimiento del inicio muestra la línea de tiempo y la fecha de entrega confirmada.
- El checkout lee los ajustes:
  - métodos de pago habilitados (si se activa transferencia, la confirmación muestra los datos bancarios);
  - municipios y zonas de la lista;
  - «Fecha deseada» opcional;
  - si los pedidos están pausados, el carrito muestra el mensaje de cierre y bloquea el envío.

### 7.8 Avisos por correo (recomendado, requiere Resend)

- Database Webhook de Supabase en INSERT de `orders` → `POST /api/notify/new-order` con encabezado secreto (comparación en tiempo constante) → correo a `notification_emails` con resumen y enlace al pedido.
- Opcional: correo de acuse al cliente si dejó su email.
- WhatsApp automático **no** se incluye: requiere WhatsApp Business API, de pago y con aprobación de Meta. El flujo manual de 7.4 cubre el modelo actual.

---

## 8. Módulo de catálogo

- **Lista** con foto, nombre, precio, inventario y estado. Controles **− / +** de inventario directamente en la fila (registran un movimiento manual). Arrastrar para reordenar (con alternativa de botones ↑/↓ por accesibilidad). Filtros: publicados, borradores, archivados, stock bajo.
- **Editor** en pasos visibles en una sola página:
  1. *Fotos*: varias, arrastrar para ordenar (la primera es la portada), punto focal, texto alternativo sugerido a partir del nombre y los colores, borrar con confirmación.
  2. *Datos*: nombre, tipo, descripción (visible en el detalle público), precio (vacío = «Precio por confirmar»).
  3. *Filtros*: colores y tipos de flor como chips; «+ Nuevo color» o «+ Nueva flor» los crea en línea.
  4. *Disponibilidad*: «Tengo N en existencia» o «Hecho bajo pedido».
  5. *Publicación*: borrador, publicado o archivado; «Mostrar en la portada» (destacado).
  6. *Opciones avanzadas* (plegado): dirección web y orden manual.
- Barra fija con «Guardar», «Ver en la tienda» y «Duplicar».
- Para publicar se exige al menos una foto, y el panel lo explica.
- Borrar definitivamente es solo para admin y solo si el producto no tiene pedidos; si los tiene, se ofrece archivar.
- **Lado público**:
  - filtros desde `product_colors`/`flower_types`;
  - detalle con descripción y galería de fotos;
  - «Arreglos listos» del inicio = primeros tres productos **destacados y publicados** (con respaldo a los primeros publicados si no hay destacados);
  - el carrito usa la foto real del producto (se elimina `checkoutImage()`).

---

## 9. Mapa de contenido administrable

Límites orientativos; se ajustan midiendo el layout real a 390 px y a 1440 px durante la Fase 4.

| Página | Sección (`key`) | Campos |
| --- | --- | --- |
| Inicio | `home.hero` | Titular (2 líneas × 24 car.), texto del botón, foto (vertical 3:4) |
| | `home.categories` | 3 mosaicos: etiqueta + foto (enlaces fijos) |
| | `home.collection` | Título, texto introductorio, texto del enlace, nota opcional (productos automáticos desde destacados) |
| | `home.stems` | Foto, título, texto, texto del enlace |
| | `home.custom` | Título, texto escritorio, texto móvil, texto del enlace (los tiers salen de `custom.tiers`) |
| | `home.process` | Título + 3 pasos (título, texto) |
| | `home.tracking` | Título, texto (sin mencionar `LIR-2048` en producción) |
| Personalizados | `custom.hero` | Titular, texto, botón, frase de confianza, foto, pie de foto |
| | `custom.guide` | Título, texto |
| | `custom.tiers` | Lista de 3: nombre, adjetivo corto (inicio), frase corta (inicio), promesa, descripción, «Ideal para», mensaje de WhatsApp, «Desde Q» opcional, 1–4 muestras (nombre + foto) |
| | `custom.process` | Título, texto + 3 pasos |
| | `custom.closing` | Título, textos de los enlaces |
| Carrito | `cart.empty` | Título, texto, foto |
| Confirmación | `confirmation.next-steps` | Título, 3 pasos (el paso de pago se adapta al método), foto del estado «no encontrado» |
| Global | `footer` | Descripción, lema (contacto y redes salen de Ajustes) |
| | `seo` | Título y descripción por página (`Title`/`Meta` de Angular) |

Ajustes globales que también se reflejan en las páginas: número de WhatsApp (todos los botones), correo, redes, banda de anuncio en el encabezado y pausa de pedidos.

**Vista previa antes de publicar**: el botón «Vista previa» guarda el borrador en `localStorage` (mismo origen) y abre la página con `?vista-previa=1`. `SiteDataService` aplica el borrador solo si hay sesión de staff. Una barra superior indica «Vista previa — no publicado» con los botones «Publicar» y «Seguir editando».

---

## 10. Ajustes del negocio

| Sección | Contenido |
| --- | --- |
| **Negocio y contacto** | Nombre, línea de ubicación, WhatsApp (con prueba: «Abrir chat de prueba»), correo, Instagram, Facebook, TikTok |
| **Pedidos y pagos** | Recibir pedidos sí/no + mensaje de cierre, banda de anuncio, contraentrega sí/no, transferencia sí/no + datos bancarios, umbral de stock bajo |
| **Entregas** | Municipios atendidos, zonas con tarifa fija o «por confirmar» |
| **Mensajes** | Plantillas de WhatsApp con variables y vista previa |
| **Avisos** *(admin)* | Correos que reciben pedidos nuevos, acuse al cliente sí/no |
| **Equipo** *(admin)* | Ver sección 11 |
| **Actividad** *(admin)* | Bitácora: quién cambió qué y cuándo |

---

## 11. Equipo y acceso

- **Invitar** por correo desde el panel: `POST /api/team/invite` (solo admin) → `auth.admin.inviteUserByEmail` con rol preasignado. La persona recibe el enlace y define su contraseña en `/admin/restablecer`.
- **«¿Olvidaste tu contraseña?»** en `/admin/acceso` → `resetPasswordForEmail` con redirección a `/admin/restablecer`.
- Cambiar rol y **quitar acceso** (rol `null`). No se puede quitar el acceso a la propia cuenta ni a la última administradora; lo protegen el panel y el trigger.
- Matriz de permisos por defecto:

| Capacidad | Operación | Administración |
| --- | --- | --- |
| Pedidos (todo el flujo, manuales, exportar) | ✓ | ✓ |
| Catálogo, inventario, fotos de productos | ✓ | ✓ |
| Borrar productos | — | ✓ |
| Páginas e imágenes del sitio | — | ✓ |
| Ajustes, avisos, equipo, actividad | — | ✓ |

---

## 12. Seguridad

1. Mutaciones sensibles solo por RPC `security definer` con verificación de rol y `search_path` fijo; sin `update` directos en pedidos.
2. Sin borrado de pedidos; cancelar con motivo.
3. `create_order` toma precios e imágenes de la base, nunca del cliente; aplica anti-spam por teléfono y un campo honeypot en el checkout. Cloudflare Turnstile queda como opción si aparece spam real.
4. Imágenes: claves generadas en el servidor, lista blanca de tipos, tamaño verificado, URL firmada de 5 min, EXIF eliminado por recodificación.
5. Contenido siempre interpolado (sin `innerHTML`); URLs de redes validadas (`https://` y dominio esperado); número de WhatsApp solo con dígitos.
6. `track_order` no expone datos personales.
7. Webhook de avisos con secreto compartido; Functions con `requireStaff`/`requireAdmin` según la ruta.
8. Protección de la última administradora; bitácora de actividad.
9. Secretos nuevos (`RESEND_API_KEY`, `NOTIFY_WEBHOOK_SECRET`, `CRON_SECRET`) solo en Vercel; nunca en `public/config.js`.

---

## 13. Fases de implementación

Cada fase termina con `pnpm test`, `pnpm run typecheck:api`, `pnpm run build` y `pnpm run verify:public-build` en verde, más su checklist de aceptación. Tamaño orientativo: S ≈ 1 día, M ≈ 2–3, L ≈ 4–5.

### Fase 0 — Preparación (S)

- Restaurar el repositorio Git (clonar `ordzson/Lirios` o reinicializar y enlazar el remoto) y trabajar en rama `feat/admin`.
- Crear un **segundo proyecto Supabase de staging** para los Preview de Vercel.
- Cerrar las decisiones de la sección 15.
- Capturas base de todas las páginas públicas (1440 y 390) con `scripts/capture-page.mjs` para el diff de no regresión.

### Fase 1 — Cimientos (L)

- Migración `202611010001_admin_cms_orders.sql` completa (tablas, columnas, funciones, RLS, seeds de taxonomía).
- `SiteDataService` + `get_site_bundle` + `content-schema.ts` + `content-defaults.ts` + `SiteImageComponent`.
- Migrar las páginas públicas a contenido y ajustes **sin cambio visual** (inicio, personalizados, carrito, confirmación, footer, header con banda de anuncio). `CatalogDataService` lee del bundle.
- Pipeline de imágenes: `media.service.ts`, `api/uploads/sign.ts` v2 y `api/media/delete.ts` (reemplaza `api/uploads/delete.ts`).
- Panel dividido en rutas y features (refactor sin cambio de comportamiento) + `preview-store.ts`.
- Pantalla **Ajustes → Negocio y contacto** (los botones de WhatsApp dependen de ella).
- Cron de keepalive (`api/cron/keepalive.ts` + `crons` en `vercel.json`), salvo que se contrate Supabase Pro.

**Aceptación**: con las tablas vacías, el diff visual contra las capturas base no muestra cambios. Cambiar el WhatsApp en Ajustes actualiza todos los botones del sitio en la siguiente carga.

### Fase 2 — Pedidos (L)

- RPC de estado, actualización, pedido manual y edición de piezas; inventario coherente (cancelar devuelve y reabrir reserva).
- Lista con pestañas, filtros por fecha, paginación y Realtime con sonido.
- Detalle según 7.3, confirmación con WhatsApp (7.4), plantillas en *Ajustes → Mensajes*, estado de pago.
- Pedido manual (7.5) y hoja imprimible (7.6), exportación CSV.
- Lado cliente: `track_order` v2, confirmación en cualquier dispositivo, checkout con métodos, zonas y pausa desde Ajustes.
- *Ajustes → Pedidos y pagos* y *Entregas*.

**Aceptación**: un pedido web recorre recibido → entregado desde el teléfono, con mensaje de WhatsApp correcto; cancelar devuelve el inventario; Operación no puede borrar ni editar pedidos por REST directo; el cliente ve la línea de tiempo desde otro dispositivo.

### Fase 3 — Catálogo (M)

- Editor según sección 8 (fotos múltiples, colores y flores, disponibilidad, avanzado).
- Inventario inline, reordenar y duplicar.
- Lado público: filtros dinámicos, descripción y galería, destacados en el inicio, eliminar `checkoutImage()`.

**Aceptación**: crear un producto con dos fotos desde el teléfono en menos de 3 minutos; aparece en el filtro de su color nuevo; archivarlo lo retira del inicio y del catálogo.

### Fase 4 — Páginas e imágenes (L)

- Editor de páginas generado desde el esquema, con contador de caracteres, recortes y punto focal.
- Biblioteca de imágenes (incluye las fotos incluidas en el build) con uso visible y borrado seguro.
- Historial y «Restaurar versión», vista previa antes de publicar, guardia de cambios sin guardar, control de concurrencia.
- Unificar el nombre de los tiers (decisión de la sección 15).
- Medir los límites de cada campo con textos al máximo en 390 y 1440 px.

**Aceptación**: cambiar la foto del hero y su punto focal en menos de 1 minuto; textos al límite no rompen el layout; restaurar la versión anterior funciona.

### Fase 5 — Equipo, avisos y bitácora (M)

- Invitación, restablecer contraseña, quitar acceso, protección de la última admin.
- Avisos por correo (Resend) y webhook.
- Bitácora de actividad.

**Aceptación**: invitar a una persona como Operación, que entre, procese un pedido y no vea Páginas ni Ajustes; llega el correo de pedido nuevo.

### Fase 6 — Pulido y lanzamiento (M)

- Inicio del panel: «Hoy» (nuevos sin confirmar, entregas de hoy y mañana, por cobrar, stock bajo) + resumen semanal y mensual de ventas y top de productos, en la franja existente, sin tarjetas decorativas.
- PWA del panel (manifest + íconos) para «Agregar a pantalla de inicio» en el teléfono.
- Opcional: vista *Clientes* derivada de pedidos (por teléfono), con historial y total.
- `GUIA_ADMIN.md` (en lenguaje de la dueña) + enlace «Ayuda» en el panel.
- Actualizar `DEPLOYMENT.md`, `README.md` y `.impeccable/surfaces/admin.md`.
- Revisión visual (`finish review` de Impeccable si se desea) y QA completo (sección 14).
- Sustituir los precios mock por los reales y quitar las notas «provisionales».

---

## 14. Verificación

- **Unitarias (Vitest)**: `SiteDataService` (bundle, caché, defaults y borrador de vista previa), validación del esquema, plantillas de WhatsApp y normalización de teléfono, cálculo de totales, `media.service` (con canvas simulado y respaldo a JPEG), guards y servicios admin con Supabase simulado.
- **Base de datos** (`supabase/tests/*.sql`, ejecutables en staging o con `supabase test db`):
  - anon no lee pedidos ni ajustes privados;
  - Operación no edita ajustes ni contenido y no borra pedidos;
  - transiciones inválidas fallan;
  - cancelar y reabrir mueven el inventario;
  - `create_order` respeta la pausa, los métodos y el anti-spam;
  - no se puede eliminar la última admin.
- **Navegación**: extender `scripts/verify-navigation.mjs` con el panel en modo vista previa (editar el hero → se ve en `/`; pedido de punta a punta) en teléfono, tableta y escritorio.
- **No regresión visual**: diff contra las capturas base de la Fase 0.
- **Accesibilidad**: teclado completo en el panel, foco visible, `aria-live` en avisos, contraste y reducción de movimiento.
- **Prueba con la dueña**: tres tareas sin ayuda desde su teléfono (publicar producto, cambiar foto de portada, confirmar y entregar un pedido). Lo que cueste se corrige antes de cerrar.

---

## 15. Decisiones abiertas (con recomendación por defecto)

| # | Decisión | Recomendación |
| --- | --- | --- |
| 1 | ¿Activar pago por transferencia? (`PRODUCT.md` lo menciona; `CHECKOUT_HANDOFF.md` fijó solo contraentrega) | Implementar el interruptor y dejarlo **apagado** hasta que lo pida la dueña. |
| 2 | ¿Quién edita páginas y ajustes? | Solo Administración; Operación gestiona pedidos y catálogo. |
| 3 | Costo de entrega | Zonas opcionales; por defecto «por confirmar» (comportamiento actual). |
| 4 | Avisos por correo | Sí, con Resend (gratis hasta 3 000 correos al mes; requiere verificar un dominio). |
| 5 | Nombre de los tiers: «Un gesto» o «Un detalle» | Elegir uno; el CMS los unifica en una sola fuente. |
| 6 | Fecha de entrega | El cliente sugiere una fecha opcional y la dueña la confirma. |
| 7 | Publicación | Inmediata, con vista previa y historial (sin flujo de aprobación). |
| 8 | Supabase gratis o Pro | Gratis + cron de keepalive al inicio; Pro (US$25 al mes) cuando haya volumen o se necesiten backups diarios. |
| 9 | Hosting de producción | Vercel con dominio propio; GitHub Pages queda como demo sin backend. |

---

## 16. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Sin Git local: cambios grandes sin historial | Fase 0 lo resuelve antes de tocar código. |
| Textos largos o fotos mal recortadas rompen el diseño | Límites medidos, recortes en vivo, punto focal, vista previa. |
| Supabase pausado por inactividad | Cron de keepalive o plan Pro; el sitio cae a la caché o los defaults, y el checkout muestra un error claro en vez de perder el pedido. |
| Primera carga más lenta por esperar el bundle | Un solo viaje, límite de 2,5 s, caché local; las fotos van servidas desde R2 con caché inmutable. |
| Dos personas editan lo mismo | Control de versión optimista en contenido; los pedidos usan RPC atómicas. |
| Fotos huérfanas en R2 | Borrado controlado por `media`; script de limpieza opcional que compara el bucket con la tabla. |
