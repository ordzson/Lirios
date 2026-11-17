# Plan — Taller Dumish Blooms: costeo y producción bajo pedido + mejoras de tienda

Fecha: 2026-11-16 · Ejecución **secuencial**: un paquete a la vez, en el orden de §8, sin fechas fijas. Revisado el 2026-11-16 tras auditoría (entorno local, contrato de pruebas-primero, reglas del modelo).

Índice: 1 Contexto · 2 Decisiones · 3 Supuestos · 4 Arquitectura (4.3 Entorno local) · 5 Medios en Cloudflare R2 · 6 Impeccable · 7 Protocolo para agentes · 8 Paquetes de trabajo · 9 Catálogo de pruebas · 10 Verificación final · 11 Riesgos

## 1. Contexto

Una tienda en línea genérica se resuelve con Shopify y el jurado lo va a preguntar. Lo que ninguna plataforma genérica hace es **costear y planificar producción artesanal bajo pedido**. Ese es el proyecto; la tienda es la vitrina.

Estado actual del repo (verificado):

- Angular 21 standalone + signals, SCSS, pnpm, Vitest. Supabase (Auth, Postgres, RLS) + Vercel Functions + Cloudflare R2.
- Tienda pública hecha y aprobada visualmente: inicio, `/catalogo`, `/personalizados`, `/carrito`, `/pedido/:n`.
- Panel v1 en un solo componente (`src/app/pages/admin/dashboard/`, 327 TS / 1214 SCSS): resumen, pedidos con `<select>` de estado, catálogo básico, equipo.
- Una sola migración (`supabase/migrations/202610030001_initial_store.sql`). No existe nada de materiales, recetas, costos, capacidad, promociones, banners ni eventos.
- R2 existe a medias: `api/uploads/sign.ts` firma **una** foto por producto sin redimensionar; `api/uploads/delete.ts` no se usa; no hay tabla de medios.
- No hay tokens compartidos: cada SCSS repite colores en hexadecimal; `src/styles.scss` solo define 7 variables.
- `.git` es un directorio vacío: no hay control de versiones operativo.
- Aún no hay proyecto Supabase en la nube (el usuario lo crea en la Oleada 0). Docker, psql y Chrome están instalados.
- En esta máquina otro proyecto (`horarios`) ya ocupa los puertos 54321–54327 de Supabase; este proyecto usa puertos propios (§4.3).
- El catálogo público lee la tabla `products` directo con la clave anon (`catalog-data.service.ts`); `create_order` descuenta `products.inventory` y rechaza en 0.
- `ng test` corre sobre jsdom 28: no tiene `showModal`, `createImageBitmap` ni canvas (§4.3). `ng serve` no sirve `api/*`.
- `ADMIN_PLAN.md` (editor de páginas, avisos por correo, equipo, bitácora) queda **en pausa**. Solo se absorben los prerrequisitos de §3.

## 2. Decisiones cerradas con el usuario

| Tema | Decisión |
| --- | --- |
| Ritmo | Secuencial, un paquete a la vez, sin fechas fijas. `ADMIN_PLAN.md` fuera por ahora. |
| Dispositivo | **Mobile-first, vinculante.** Se diseña y prueba primero a 390 px; escritorio es ampliación. El panel se opera completo desde el teléfono. |
| Dirección visual | Mismo mundo de `DESIGN.md` (crema, vino, Bodoni/Manrope, esquinas rectas, sin tarjetas). «Como un juego» = armar de forma **visual** y que precio, margen y fecha **reaccionen al instante**. Sin arrastrar, sin sonidos, sin animación decorativa: solo transiciones de estado de 160–180 ms. Muy pulido. |
| Flores del ramo | Fotos reales recortadas (fondo transparente), **una por flor y color**, subidas desde el panel. El builder solo ofrece variantes que ya tienen foto. |
| Fotos | **Todas las fotos subidas viven en Cloudflare R2** (§5). |
| Costeo de materiales | **PEPS** (primero en entrar, primero en salir) por lotes. |
| Backend | Supabase local en Docker para desarrollo y pruebas; proyecto en la nube creado por el usuario en la Oleada 0 para staging/demo. |
| Pedido de ramo | Se guarda como pedido «por confirmar», aparta cupo y material 48 h, y la pantalla final abre WhatsApp o Instagram con el mensaje listo. La dueña confirma en el panel. |
| Eventos | Ambos: temporadas (14 feb, Día de la Madre, graduaciones) + servicio para eventos por volumen. |
| «Merma» | Se usa **«desperdicio»** en toda la interfaz («Diferencia contra la receta» como título de la comparación). |
| Pruebas | Las define este plan (§9) y las escribe el agente de pruebas, no quien implementa. |

## 3. Supuestos por defecto (corregir antes de la oleada que los usa)

**Motor de costos**

- `materiales = Σ cantidad × (1 + desperdicio %) × costo unitario PEPS` (se recorren las capas de lote desde la más antigua con saldo).
- `mano de obra = minutos / 60 × ganancia por hora` (ajuste del panel; es el pago del trabajo y entra al costo).
- `costo = materiales + mano de obra (+ indirectos %, por defecto 0)`.
- `precio sugerido = costo / (1 − margen meta)`, redondeado primero a centavos y luego hacia arriba al múltiplo de Q5 (ajustable). El redondeo previo a centavos evita que un error de coma flotante suba un precio exacto al siguiente múltiplo.
- `margen = (precio − costo) / precio`.
- El sistema **sugiere**, la dueña aplica con un toque (individual o «Aplicar todos»). Nunca cambia precios solo.
- Con PEPS un lote caro no afecta hasta que se agota el anterior. Cada pieza muestra **dos** márgenes: actual (PEPS) y de reposición (último lote). Estados: `ok`, `bajo` («Bajo el margen meta») y `caera` («Caerá bajo el margen cuando se acabe el lote actual; alcanza para ~N piezas»).
- «Piezas al costo actual» = el mínimo, entre los materiales cuyo último lote cuesta más que la capa vigente, de `⌊saldo de la capa vigente / cantidad por pieza con desperdicio⌋`. Si ningún material va a subir, es `null` y no se muestra.
- En un arreglo las cantidades de un mismo material **se suman entre todas sus flores antes** de recorrer las capas (5 lirios rojos piden 30 rojos de una vez, no 5 veces 6). Sus minutos = Σ minutos de las flores + envoltura + armado.
- Si la existencia no alcanza, el faltante se costea al precio del último lote (Q0 si nunca se compró) y se marca como faltante. **El faltante nunca bloquea**: el consumo real descuenta lo que hay, deja los lotes en 0, registra un movimiento de faltante y el pedido sigue. El material queda con el aviso «Usaste N más de lo registrado: registra la compra que falta». La existencia nunca es negativa.
- Costo real del pedido: al terminar se descuenta lo usado de los lotes en orden PEPS; ese costo alimenta las estadísticas.

**Productos del catálogo**

- Todo se hace **bajo pedido**. `products.track_inventory` pasa a `false` en los productos actuales y `create_order` v2 deja de descontar y de rechazar por `products.inventory` (la columna se conserva, sin uso en el panel). Lo que limita un pedido es la capacidad; el material se aparta y, si falta, sale en la lista de compras.
- Un producto apunta a su receta de arreglo (`products.recipe_id`). Con receta: minutos, material apartado y costo salen de ella. **Sin receta**: usa `products.production_minutes` (por defecto 60, editable), no aparta material y en Precios aparece «Sin receta», sin margen.
- El precio de una flor vive en el **diseño** (`flower_designs.price`, igual para todos sus colores). El costo y el margen se calculan por variante, porque cada color tiene sus lotes. El precio sugerido de un diseño es el mayor entre sus variantes activas.

**Recetas**

- Jerarquía: *diseño de flor* (lirio, gerbera…) → *variante* (diseño + color, con su foto recortada) → *arreglo* (variantes × cantidad + envoltura + extras + minutos de armado).
- Una receta de flor mezcla materiales fijos (limpiapipas verde, alambre, cinta) y **ranuras de color** («color principal» → se resuelve al limpiapipas del color elegido). Una sola receta sirve para todos los colores.
- Unidades: pieza, cm, m, hoja, g. Cada material tiene tamaño de paquete de compra y existencia mínima.
- Recetas versionadas; los pedidos guardan un snapshot de materiales y minutos al crearse.
- Precio de un ramo armado = Σ flores + envoltura + extras + armado (cuota base ajustable), luego promociones.

**Capacidad y fecha**

- Horario semanal del taller (minutos por día y **hora de cierre**, por defecto 18:00) + excepciones por fecha (cerrado, horas extra). Un solo fondo de horas.
- Ventana de trabajo para entregar en la fecha D: desde hoy hasta D − 1, ambos inclusive. **Hoy solo aporta lo que queda**: `min(minutos del día, minutos que faltan hasta la hora de cierre)`. A las 23:00 hoy aporta 0. Por eso el motor recibe el instante (`p_now`), no la fecha.
- Prueba EDF: D sirve para un pedido de W minutos si, para toda fecha D′ ≥ D, `trabajo comprometido con entrega ≤ D′ + W ≤ capacidad acumulada de hoy a D′ − 1`. La primera D que cumple es la «fecha más cercana».
- **Ocupan cupo** exactamente: pedidos `confirmed` e `in_production`, más los `received` («por confirmar») con `hold_expires_at` futuro. No ocupan: `received` vencido o sin apartado, `ready`, `out_for_delivery`, `delivered`, `cancelled`.
- Estados de un día en el calendario: `open` (se puede elegir) · `full` («Lleno»: cabría sin los pedidos que ya hay) · `soon` («Muy pronto»: no cabría ni con la agenda vacía, por anticipación o falta de horas antes) · `closed` («Cerrado»: día sin horario o cerrado por excepción).
- Días sin horario (p. ej. domingo) no admiten entrega. Anticipación mínima ajustable (por defecto 1 día). Horizonte: 60 días; si no cabe, «Escríbenos».
- **Dos pedidos a la vez**: toda RPC que crea o confirma un pedido toma `pg_advisory_xact_lock` (candado único de capacidad) antes de calcular, para que dos clientes simultáneos no ocupen el mismo cupo.
- **Confirmar un apartado vencido revalida**: si el cupo ya se ocupó, la confirmación falla con `capacity_conflict` y propone la nueva fecha más cercana; la dueña confirma con esa fecha (o agrega horas extra y reintenta).
- **Tope de apartado sin confirmar** (ajuste, por defecto 480 min): si los «por confirmar» de la web vigentes ya suman ese tope, un pedido web nuevo se guarda igual pero **sin apartar** (`hold_expires_at` nulo, no ocupa cupo ni material) y la pantalla final dice «Tu fecha se confirma por chat». Así pedidos falsos no tapan la agenda. Un pedido falso se cancela desde el panel y libera al instante. Los pedidos creados por el equipo no tienen tope.
- La fecha pública siempre se rotula **«Fecha estimada · se confirma por WhatsApp o Instagram»**.

**Existencias**: `disponible = en existencia − apartado`. **Apartan material** exactamente los mismos pedidos que ocupan cupo (arriba), y solo mientras no se haya registrado su consumo real: al consumir, el apartado de ese pedido desaparece (ya salió de la existencia). El apartado es derivado (vista), no se guarda. Lista de compras: `necesidad = apartado + mínimo − existencia`, redondeada hacia arriba al paquete, con costo estimado al precio del último lote. Copiable como texto.

**Consumo real contra receta**: el único camino de «En preparación» a «Listo» es `admin_complete_production` («¿Qué usaste?», precargado con la receta; solo se tocan los contadores que difieren, más los minutos reales); `admin_set_order_status` rechaza ese paso directo. Volver atrás solo existe como **«Reabrir»** (`ready → in_production`, solo Administración): lo ya consumido no regresa a los lotes (el libro es inmutable). Al completar de nuevo, `p_actuals` son los **totales** usados y solo se descuenta la diferencia contra lo ya consumido; si el total baja no se devuelve nada (para eso está el ajuste de existencia). Mismos totales = ningún movimiento (idempotente). Cancelar después de consumir tampoco devuelve material.

**Sugerencia de receta**: el uso real se captura por material y por pedido. Se atribuye a una receta **solo cuando en ese pedido una única receta usa ese material**; los pedidos mixtos (lirio rojo + gerbera roja comparten limpiapipas rojo) no entran al promedio de ninguna receta, pero sí al desperdicio % por material. Tras ≥3 pedidos atribuibles, si el promedio real difiere >10 % de la receta: «Tu receta dice 6, sueles usar 7 → Actualizar».

**Promociones**: porcentaje o monto fijo. Alcance: toda la tienda, categoría, **grupo de productos** (tabla nueva) o productos sueltos. Con vigencia. Automáticas, sin cupones. No se acumulan: gana el mayor descuento por línea. El monto fijo se descuenta por unidad. El precio nunca baja de 0. Guarda de margen al crearla. Interruptor «aplica a Arma tu ramo»: solo lo tienen las promos de alcance «toda la tienda»; **el ramo armado cuenta como una sola línea**, así que el porcentaje se aplica al subtotal del ramo y el monto fijo se descuenta **una vez por ramo**, no por flor.

**Banners**: banda superior y popup. Vigencia, páginas, frecuencia (una vez / por sesión / diario), retardo. Popup: uno a la vez, `<dialog>` nativo, Esc y foco, nunca en `/carrito` ni `/pedido`, respeta reducción de movimiento. El enlace solo apunta a rutas internas de una lista blanca.

**Eventos (`/eventos`)**: arriba temporadas vigentes y próximas (colección, fecha límite para pedir, cuenta regresiva, disponibilidad real derivada de la capacidad). Abajo servicio por volumen: tipo de pieza × cantidad × fecha → estimado (tramos de volumen ajustables) + factibilidad → solicitud guardada + chat. En el panel: «Convertir en pedido».

**Pedidos por chat**: asistente «Nuevo pedido» (origen WhatsApp / Instagram / otro): cliente → piezas (catálogo, ramo con el mismo builder mostrando costo y margen, o línea a medida con receta rápida) → fecha → precio sugerido editable → guardar. Instagram no admite texto prellenado: «Copiar mensaje» + `ig.me/m/<usuario>`. WhatsApp usa `wa.me` con texto.

**Estadísticas** (semana / mes / año, contra el periodo anterior): ventas, costo real, **«Ganancia del negocio»** (= ventas − materiales − mano de obra pagada a la meta), **«Ganancia por hora real»** contra la meta (= (ventas − materiales) / horas trabajadas; incluye el pago del trabajo, por eso no sale de dividir la anterior entre las horas, y cada una se rotula con su fórmula), pedidos y ticket promedio, por canal, top de piezas/flores/colores, gasto en materiales, desperdicio % por material, uso de la capacidad, entregas a tiempo. Gráficas propias en SVG siguiendo la skill `dataviz`.

**Navegación**: tienda → Arreglos · Flores · **Arma tu ramo** (reemplaza «Personaliza»; `/personalizados` se conserva con enlace al builder) · **Eventos** · Seguir pedido. Panel móvil → barra inferior Hoy · Pedidos · Agenda · Taller · Más. Escritorio → barra lateral noche actual.

**Permisos**: Operación (`manager`) gestiona pedidos, producción, materiales y lotes. Solo Administración (`admin`) cambia precios, ajustes, promociones y ve estadísticas. Operación entra a Recetas y puede editar la receta, pero el botón «Usar Q …» y «Aplicar» solo se muestran a Administración (y la RPC lo rechaza).

**Prerrequisitos absorbidos de `ADMIN_PLAN.md`** (los números de sección de este párrafo son de ese documento, no de este): panel dividido en rutas lazy; estados por RPC con «siguiente paso» (`ADMIN_PLAN.md` §7.2); pedido manual (`ADMIN_PLAN.md` §7.5); fixes #12–#14 (cancelar libera, `create_order` no confía en imágenes del cliente, nadie borra pedidos); pipeline de imágenes (`ADMIN_PLAN.md` §5.3; en este plan es §5); ajustes mínimos.

**Fuera de alcance**: editor de páginas, avisos por correo, invitaciones de equipo, bitácora, cupones, pagos en línea, WhatsApp Business API.

## 4. Arquitectura

### 4.1 Datos (Supabase)

Todas las **tablas y RLS se crean en la Oleada 1** (el esquema es el contrato); cada paquete posterior agrega solo funciones y vistas en su propio archivo. La migración inicial no se modifica. Los prefijos numéricos de los archivos solo fijan el **orden de aplicación** (el mismo orden de §8); no son fechas de trabajo.

| Migración (dueño) | Contenido |
| --- | --- |
| `202611170001_core_production.sql` (A1) | `business_settings` (fila única: ganancia/hora, margen meta, indirectos, redondeo, anticipación, horas de apartado, **tope de apartado sin confirmar**, cuota de armado, WhatsApp, Instagram), `work_schedule` (minutos y **hora de cierre** por día), `work_schedule_exceptions`, `colors`, `media`, `materials` (con `family` y `color_id`, que resuelven las ranuras de color), `material_lots`, `stock_movements` (libro inmutable; tipos: compra, consumo, ajuste, **faltante**), `flower_designs` (con `price`), `flower_variants`, `addons` (envolturas y extras, con `price`), `recipes` (tipo flor / envoltura-extra / arreglo, minutos, versión), `recipe_items` (material fijo **o** ranura de color por familia, cantidad, desperdicio %), `recipe_components` (flores y envolturas de un arreglo), columnas nuevas en `products` (`recipe_id`, `production_minutes` por defecto 60; `track_inventory` pasa a `false`), en `orders` (origen, fechas pedida/estimada/confirmada, `hold_expires_at`, minutos, descuento, costo estimado/real, minutos reales, notas internas, `production_completed_at`), en `order_items` (tipo, `bouquet_spec` jsonb, minutos, descripción a medida, promo aplicada) y en `product_images` (`media_id`), `order_item_materials` (plan por pieza, receta y material; consumo real por material). |
| `202611170002_core_commerce.sql` (A1) | `product_groups`, `product_group_items`, `promotions`, `banners`, `seasons`, `event_requests`, `event_volume_tiers`. |
| `202611170003_contract.sql` (A1) | `alter default privileges … revoke execute on functions from public`; **ganchos** con implementación mínima (`effective_price` = precio base sin promo, `order_guard` = no hace nada, `storefront_products/_builder/_banners/_seasons/_settings` = vacío); `get_storefront` definitivo (solo junta los `storefront_*`); stubs «no implementado» del resto del contrato, **excepto `create_order` y `track_order`**, que siguen siendo los de hoy hasta que llegue su v2. |
| `202611200001_materials.sql` (B1) | `admin_receive_lot`, `admin_adjust_stock`, `consume_material_fifo`, vistas `material_availability`, `shopping_list`. |
| `202611200002_capacity.sql` (B3) | `delivery_estimate_at`, `get_delivery_estimate`, `admin_agenda`. |
| `202611200003_costing.sql` (B2) | `recipe_cost`, vista `costing_overview`, `admin_apply_suggested_prices`, `admin_save_recipe`. |
| `202611220001_bouquet.sql` (C0) | `bouquet_quote`, `create_bouquet_order`, `storefront_products`, `storefront_builder`, `storefront_settings`. |
| `202611230001_orders_flow.sql` (B4) | `admin_set_order_status`, `admin_create_order`, `admin_complete_production`, vista `recipe_variance`, `create_order` v2. |
| `202611240001_tracking.sql` (C1) | `track_order` v2. |
| `202611260001_promotions.sql` (C2) | `effective_price` (real), `storefront_banners`, `admin_promo_margin_preview`. |
| `202611270001_events.sql` (C3) | `storefront_seasons`, `create_event_request`, `admin_convert_event_request`. |
| `202611270002_stats.sql` (C4) | `admin_stats`, `admin_today`. |
| `202612010001_hardening.sql` (D1) | `order_guard` (real: límites anti-spam y honeypot), anon deja de leer `products` y `product_images` directo, índices, auditoría de permisos. |

**Una función, un archivo dueño.** Ninguna migración vuelve a definir (`create or replace`) una función que es de otro paquete: quien llega después implementa **su gancho**, no reescribe la función que lo llama. `create_order` v2 se escribe una sola vez (B4) y ya llama a `effective_price`, `order_guard` y `delivery_estimate_at`; C2 y D1 solo rellenan sus ganchos. `get_storefront` se escribe una sola vez (A1) y cada paquete rellena su `storefront_*`. `pnpm run verify:migrations` falla si una función aparece definida en más de dos archivos, o en dos sin que el primero sea `…0003_contract.sql`.

**Contrato de RPC** (firmas fijas desde la Oleada 1; cambiarlas requiere aprobación del líder)

| Función | Rol | Devuelve |
| --- | --- | --- |
| `get_storefront()` | anon | `jsonb`: `{ products, builder: { variants, addons, colors }, banners, seasons, settings }`. Productos activos con precio y promo, variantes activas **con foto**, addons, colores, banners vigentes, temporadas, ajustes públicos. Sin costos. Es la **única** lectura de catálogo de la tienda (desde C0 el front ya no consulta `products` directo). |
| `storefront_products()`, `storefront_builder()`, `storefront_settings()`, `storefront_banners()`, `storefront_seasons()` | interno | `jsonb` de su sección. Ganchos: nacen vacíos en A1; C0, C2 y C3 rellenan los suyos. |
| `get_delivery_estimate(p_minutes int)` | anon | `{ earliest: date\|null, days: [{ date, state: 'open'\|'full'\|'soon'\|'closed' }] }` (estados en §3) |
| `delivery_estimate_at(p_minutes int, p_now timestamptz)` | interno | Igual; `p_now` inyectable para pruebas. `get_delivery_estimate` la llama con `now()`. |
| `create_order(p_payload jsonb)` v2 | anon | Como hoy + `estimatedDate`, `holdExpiresAt` (`null` si se superó el tope de apartado). |
| `create_bouquet_order(p_payload jsonb)` | anon | `{ orderNumber, total, estimatedDate, holdExpiresAt }` (`holdExpiresAt` puede ser `null`) |
| `bouquet_quote(p_spec jsonb, p_now timestamptz)` | interno | `(subtotal, discount, total, minutes, promo_id)`. Única fuente del precio y los minutos de un ramo; la usan `create_bouquet_order` y `admin_create_order`. |
| `effective_price(p_kind text, p_id text, p_base numeric, p_now timestamptz)` | interno | `(price numeric, promo_id uuid)`. `p_kind` ∈ `product` \| `bouquet`. Gancho: en A1 devuelve `p_base` sin promo; C2 lo implementa. |
| `order_guard(p_payload jsonb)` | interno | `void`; lanza error si el pedido debe rechazarse. Gancho: en A1 no hace nada; D1 lo implementa. Lo llaman todas las RPC anon que crean algo. |
| `track_order(p_order_number text)` v2 | anon | Estado, línea de tiempo, fecha estimada, total. Sin datos personales. |
| `create_event_request(p_payload jsonb)` | anon | `{ id, estimateMin, estimateMax, feasible }` |
| `admin_receive_lot(p_material uuid, p_qty numeric, p_total_cost numeric, p_purchased_at date, p_supplier text)` | staff | `uuid` del lote |
| `admin_adjust_stock(p_material uuid, p_delta numeric, p_reason text, p_note text)` | staff | `void` |
| `consume_material_fifo(p_material uuid, p_qty numeric, p_order uuid)` | interno | `(cost numeric, shortfall numeric)`. Nunca falla por falta de existencia (§3). |
| `recipe_cost(p_recipe uuid, p_color uuid default null)` | staff | `(materials, labor, total, materials_replacement, total_replacement, pieces_at_current_cost)`; el último puede ser `null` |
| `admin_save_recipe(p_recipe jsonb, p_version int)` | staff | Nueva versión; falla si `p_version` no coincide. |
| `admin_apply_suggested_prices(p_items jsonb)` | admin | `p_items` = `[{ kind: 'product'\|'flower'\|'addon', id: text }]` (las piezas viven en `products`, con id de texto, `flower_designs` y `addons`). Devuelve la cantidad actualizada. |
| `admin_set_order_status(p_order uuid, p_status order_status, p_note text, p_date date default null)` | staff | Pedido actualizado. No admite `in_production → ready` (eso es `admin_complete_production`). Al confirmar revalida cupo; `p_date` fija la fecha confirmada. «Reabrir» (`ready → in_production`) solo admin. |
| `admin_create_order(p_payload jsonb)` | staff | Como `create_bouquet_order` + origen |
| `admin_complete_production(p_order uuid, p_actuals jsonb, p_minutes int)` | staff | `{ costActual, variance: [...], shortfalls: [...] }`; pasa el pedido a `ready`; `p_actuals` son totales por material; idempotente (§3) |
| `admin_agenda(p_from date, p_to date)` | staff | Días con capacidad, carga y pedidos |
| `admin_promo_margin_preview(p_promo jsonb)` | admin | Piezas afectadas con margen resultante |
| `admin_convert_event_request(p_id uuid)` | staff | Número de pedido |
| `admin_stats(p_from date, p_to date, p_bucket text)` | admin | Series y totales |
| `admin_today()` | staff | Resumen del día |

Reglas de datos: toda mutación sensible por RPC `security definer` con `search_path = public, pg_temp` y verificación de rol; anon solo llega por RPC; **costos y márgenes jamás salen en respuestas anon**; el servidor recalcula precio, minutos y fecha; costos unitarios `numeric(12,4)`, dinero redondeado a 2; fechas en `America/Guatemala`; consumo PEPS en una transacción con `for update` sobre los lotes; candado `pg_advisory_xact_lock` de capacidad en toda RPC que crea o confirma pedidos.

**Permisos de ejecución desde el primer día** (no se dejan para D1): cada archivo que crea una función incluye, en el mismo archivo, su `revoke all on function … from public` y sus `grant execute` explícitos. Las funciones «interno» no se conceden a nadie: solo las llaman otras funciones `security definer`. Lista blanca de lo que puede ejecutar `anon`: `get_storefront`, `get_delivery_estimate`, `create_order`, `create_bouquet_order`, `track_order`, `create_event_request` (más `is_staff` e `is_admin`, que las políticas RLS de la migración inicial evalúan). La prueba DB-52 lo vigila desde la Oleada 1; D1 solo audita.

### 4.2 Frontend

```
src/styles/            _tokens.scss (colores, tipografía, espacios, movimiento, z-index desde DESIGN.md)
                       _mixins.scss (breakpoints mobile-first, foco, hairline, área táctil 44px)
src/app/ui/            Kit compartido (standalone, OnPush, inputs por señal)
src/app/core/domain/   Lógica pura: types, money, costing, pricing, promotions, bouquet, whatsapp, dates
src/app/core/media/    media.service.ts (redimensionar, validar, subir a R2)
src/app/core/data/     database.types.ts (generado) + repositorios por agregado
src/app/pages/admin/   admin.routes.ts + shell + features lazy: hoy, pedidos, agenda, materiales, recetas, precios, promos, estadisticas, ajustes
src/app/pages/builder/ /arma-tu-ramo
src/app/pages/events/  /eventos
src/app/shared/        popup-host, announcement-bar (más lo existente)
```

**Tipos del dominio** (`src/app/core/domain/types.ts`). El líder los escribe en la Oleada 0, **antes** de cualquier prueba, copiando este bloque; es su único dueño. Los fixtures dorados usan exactamente estas formas.

```ts
export type Id = string;                       // uuid; los productos usan su id de texto
export interface LotLayer { lotId: Id; purchasedAt: string; remaining: number; unitCost: number }
                                               // purchasedAt 'YYYY-MM-DD'; orden PEPS = purchasedAt y luego lotId; fifoCost ordena por su cuenta
export interface RecipeItem { materialId: Id | null; slotFamily: string | null; qty: number; wastePct: number }
                                               // exactamente uno: material fijo, o ranura de color por familia ('limpiapipas'); wastePct 0.10 = 10 %
export interface RecipeComponent { recipeId: Id; colorId: Id | null; qty: number }
export interface Recipe {
  id: Id; kind: 'flower' | 'addon' | 'arrangement';
  minutes: number;                             // propios: hacer la flor, poner la envoltura, o armar el arreglo
  items: RecipeItem[]; components: RecipeComponent[];   // components solo en 'arrangement'
}
export interface CostContext {
  colorId: Id | null;                          // color con que se resuelven las ranuras de esta receta
  lots: Record<Id, LotLayer[]>;                // por material
  slotMaterials: Record<string, Record<Id, Id>>;   // familia → color → material
  recipes: Record<Id, Recipe>;                 // para resolver components
  hourlyRate: number; overheadPct: number;
}
export type Category = 'arrangement' | 'single-flower';
export interface PriceLine { kind: 'product' | 'bouquet'; id: Id | null; category: Category | null; groupIds: Id[]; unitPrice: number }
export interface Promotion {
  id: Id; type: 'percent' | 'fixed'; value: number;      // percent: 15 = 15 %
  scope: 'all' | 'category' | 'group' | 'products';
  category: Category | null; groupId: Id | null; productIds: Id[];
  startsAt: string; endsAt: string | null; active: boolean;
  appliesToBuilder: boolean;                   // solo válido con scope 'all'
}
export interface BouquetSpec { flowers: { variantId: Id; qty: number }[]; wrapId: Id | null; extras: { addonId: Id; qty: number }[] }
export interface PriceList {
  variants: Record<Id, { price: number; minutes: number }>;
  addons: Record<Id, { price: number; minutes: number }>;    // envolturas y extras
  assemblyFee: number; assemblyMinutes: number;
}
export type DayState = 'open' | 'full' | 'soon' | 'closed';
```

**Contrato del dominio** (`src/app/core/domain/`, firmas fijas)

```ts
fifoCost(lots: LotLayer[], qty: number): { cost: number; shortfall: number; layers: { lotId: string; qty: number; unitCost: number }[] }
recipeCost(recipe: Recipe, ctx: CostContext): { materials: number; labor: number; total: number; materialsReplacement: number; totalReplacement: number; piecesAtCurrentCost: number | null }
suggestPrice(cost: number, marginTarget: number, roundTo: number): number
margin(price: number, cost: number): number
marginStatus(price: number, cost: number, costReplacement: number, target: number): 'ok' | 'bajo' | 'caera'
applyPromotions(line: PriceLine, promos: Promotion[], now: Date): { price: number; promoId: string | null }
bouquetQuote(spec: BouquetSpec, prices: PriceList, promos: Promotion[], now: Date): { subtotal: number; discount: number; total: number; minutes: number }
layoutBouquet(n: number): { x: number; y: number; scale: number; rotate: number; z: number }[]
roundUpTo(value: number, step: number): number
formatGTQ(value: number | null): string            // 'Q 145.00' · null → 'Precio por confirmar'
normalizePhoneGT(raw: string): string | null       // '5555 0182' → '50255550182'
whatsappUrl(phone: string, message: string): string
instagramUrl(handle: string): string
```

`bouquetQuote` arma una `PriceLine` de tipo `bouquet` con el subtotal y llama a `applyPromotions`: al ramo solo le aplican promos con `appliesToBuilder` (§3). El precio en el builder y en la Mesa de receta se muestra siempre con `formatGTQ` («Q 25.00»).

- **Kit UI** (`src/app/ui/`): button, icon, field, text-input, money-input, number-stepper, select, chip-group, segmented, switch, tabs, sheet (hoja inferior en móvil / panel lateral en escritorio, sobre `<dialog>`), confirm-dialog, toast con deshacer, list-detail, empty-state, skeleton, meter, stat, status-dot, photo, sticky-action-bar (con safe-area), bar-chart, line-chart. Ruta `/admin/_kit` solo en desarrollo como muestrario. Lo construye A2; **después de la Oleada 1 el dueño del kit y de los tokens es el líder**. Cuatro piezas del kit las construye otro paquete, cada una en su carpeta: `ui/image-upload` (A4), `ui/capacity-calendar` (B3), `ui/composer` (B2), `ui/bouquet-builder` (C0).
- **Compositor compartido** (`ui/composer`, dueño B2): paleta + lienzo + barra de resumen. Lo usan la **Mesa de receta** (materiales → receta → costo y margen) y el constructor de ramo. Se construye **después** de la ronda de conceptos (§8, paso «Conceptos»), que cubre las dos superficies de una vez.
- **Constructor de ramo** (`ui/bouquet-builder`, dueño C0): componente sin página (paleta de flores, vista del ramo, resumen), sobre `ui/composer`. Lo usan el asistente «Nuevo pedido» del panel (B4, mostrando además costo y margen) y la página `/arma-tu-ramo` (C1). Por eso C0 va antes que B4 y C1.
- **Vista del ramo**: fotos recortadas en capas sobre `layoutBouquet(n)`; envoltura como capa frontal. Tocar una flor de la paleta la agrega; tocar una del ramo la quita o cambia de color.
- **Mesa de receta**: paleta de materiales por tipo con su color real; filas con contador; barra apilada en vivo (materiales / mano de obra / ganancia) contra el precio; medidor de margen; botón «Usar Q …».
- TypeScript da la vista previa instantánea; SQL es la autoridad. Ambos pasan los **mismos casos dorados** (§9.1).
- Sin Supabase (GitHub Pages) la tienda usa un fixture de demostración rotulado como ilustrativo.
- Se reutiliza: `CartService`, `OrderService` (se amplía), `SupabaseService`, `AuthService`, `adminGuard`, `BrandComponent`, `SiteHeaderComponent`, `server/supabase-admin.ts` (`requireStaff`), `server/r2.ts`, `server/http.ts`, `scripts/verify-navigation.mjs`, `scripts/capture-page.mjs`.
- El SCSS público ya aprobado **no se reescribe** hasta D3, con diff visual.

### 4.3 Entorno local y de pruebas

Comprobado en esta máquina el 2026-11-16. Todo lo de esta sección se monta en la Oleada 0.

**Supabase local.** `supabase/config.toml` con `project_id = "lirios"` y puertos propios, porque `horarios` ocupa 54321–54327: API **55321**, base **55322**, sombra 55320, Studio 55323, correo 55324, analítica 55327, pooler 55329. `.env.example` y `public/config.js` local apuntan a `http://127.0.0.1:55321`. Hay **una sola** base local: como el trabajo es secuencial, solo el agente activo corre `db:reset` (no hay worktrees en paralelo).

**S3 local: SeaweedFS** (`chrislusf/seaweedfs`), no MinIO (sus imágenes ya no se publican en Docker Hub ni en Quay). `docker-compose.dev.yml` levanta `server -s3 -s3.config=/etc/seaweedfs/s3.json` en `127.0.0.1:58333`, con una identidad `dev` (llave y secreto de desarrollo) y la identidad `anonymous` con permiso `Read` (lectura pública, como el dominio público de R2). `scripts/dev-s3-init.mjs` crea el bucket `lirios-dev` con el SDK. Valores locales: `R2_ENDPOINT=http://127.0.0.1:58333`, `R2_BUCKET_NAME=lirios-dev`, `R2_PUBLIC_URL=http://127.0.0.1:58333/lirios-dev`. Probado con el SDK instalado (3.1146): `PUT` firmado correcto → 200; otro `Content-Type` → 403; otro tamaño → 403; sin `Cache-Control` → 403; `GET` anónimo devuelve tipo y `cache-control`; tras borrar → 404; el preflight CORS de `PUT` responde bien.

**Functions en local.** `ng serve` no sirve `api/*`. `scripts/dev-api.mjs` (se corre con `tsx`, dependencia de desarrollo nueva, porque los handlers importan `.js` que son `.ts`) monta cada `api/**/*.ts` (ya exportan `{ fetch(request) }` estándar) en `http://127.0.0.1:4310` leyendo `.env.local`. `proxy.conf.json` envía `/api` a ese puerto y se conecta en `angular.json` (`serve.options.proxyConfig`). Scripts: `dev:api`, `stack:up` (Supabase + S3 + bucket), `dev` (`dev:api` + `ng serve`). Las pruebas `test:api` no necesitan servidor: llaman a `handler.fetch(new Request(...))`.

**Pruebas de componentes (jsdom 28).** No hay `HTMLDialogElement.showModal`, `createImageBitmap` ni canvas, y no se cambia de runner. Regla:

- La lógica va en **funciones puras** probadas en jsdom: redimensionar (`fitWithin`), detectar borde transparente y recortar margen (sobre un arreglo de píxeles `{ data, width, height }`), reglas del popup (`shouldShowPopup(banner, ruta, memoria, ahora)`).
- Lo que toca el navegador entra por un **adaptador inyectable** (`ImageCodec`: decodificar, dibujar, codificar) que las pruebas sustituyen por uno falso.
- `src/test-setup.ts` agrega un sustituto mínimo de `showModal`/`close` (cambia `open` y emite `close`) solo para que los componentes monten.
- Lo que solo un navegador real demuestra (Esc cierra, el foco vuelve al disparador, el códec real produce WebP con transparencia) se prueba en `verify:flows` con Chrome (F4, F6, F7).

**Flujos E2E (`verify:flows`).** Necesitan `stack:up` y `dev` arriba. Como los flujos cambian datos, el script corre `db:reset` **antes de cada viewport**; así «la existencia baja a 90» vale en las tres pasadas.

**CI.** `validate.yml` se dispara también en `feat/**` (no solo `main`) y agrega `db:test`, `test:api`, `verify:tokens`, `verify:migrations` y `verify:flows` (con Supabase CLI, SeaweedFS como servicio y Chrome del runner).

## 5. Medios en Cloudflare R2

Toda foto subida desde el panel (productos, variantes de flor recortadas, envolturas y extras, grupos, banners, temporadas) se guarda en R2 y se sirve desde el dominio público del bucket. Las fotos incluidas en `assets/` siguen funcionando como legado.

**Estructura del bucket** (claves generadas solo en el servidor, nunca con el nombre de archivo del cliente):

```
<carpeta>/<ownerId>/<uuid>/full.<ext>
<carpeta>/<ownerId>/<uuid>/small.<ext>
carpeta ∈ products | variants | addons | groups | banners | seasons
```

| Carpeta | `full` (lado largo) | `small` | Transparencia |
| --- | --- | --- | --- |
| `products`, `groups`, `banners`, `seasons` | 1600 px | 640 px | No |
| `variants`, `addons` | 640 px | 320 px | **Obligatoria en `variants`** |

**Tabla `media`**: `id`, `folder`, `base_key` (único), `url`, `url_small`, `width`, `height`, `has_alpha`, `alt_text` (≤180), `bytes`, `created_by`, `created_at`. La referencian `flower_variants`, `addons`, `product_groups`, `banners`, `seasons` y `product_images` mediante `media_id` (`on delete restrict`).

**Flujo de subida** (`src/app/core/media/media.service.ts` + `ui/image-upload`):

1. Acepta `image/*` hasta 25 MB (fotos de teléfono).
2. En el navegador: `createImageBitmap(file, { imageOrientation: 'from-image' })` → canvas → variantes `full` y `small` en WebP 0.82. Recodificar elimina EXIF y GPS. Estas llamadas viven detrás del adaptador `ImageCodec`; el cálculo de tamaños, el recorte y la detección de transparencia son funciones puras (§4.3).
3. Recortadas (`variants`, `addons`): se recorta el margen transparente al contorno de la flor con 4 % de aire, para que todas queden a la misma escala. En `variants`, si la imagen no tiene píxeles transparentes en el borde se rechaza con «Esta foto no tiene fondo transparente. Recórtala en tu teléfono o en Canva y vuelve a subirla.»
4. Si el navegador no codifica WebP: PNG para las recortadas, JPEG 0.85 para las opacas.
5. `POST /api/uploads/sign` → dos URL firmadas → `PUT` directo a R2 con progreso, enviando **tal cual** las cabeceras que devuelve la firma (`Content-Type` y `Cache-Control`) → fila en `media` → se asigna `media_id` al dueño.
6. Si falla un paso, se conserva lo escrito y se ofrece reintentar; no quedan filas `media` sin objetos.

**Functions** (`api/`, reutilizan `requireStaff`, `createR2Client`, `publicR2Url`, `json`, `errorResponse`):

- `POST /api/uploads/sign` (v2, reemplaza el actual). Cuerpo: `{ folder, ownerId, variants: [{ name: 'full'|'small', contentType, size }] }`. Valida sesión y rol, carpeta en lista blanca, `contentType ∈ image/webp|image/png|image/jpeg`, `size ≤ 3 MB` por variante, exactamente `full` y `small`. Firma `PutObjectCommand` con `ContentType`, `ContentLength` y `CacheControl: public, max-age=31536000, immutable`, vigencia 300 s. Responde `{ baseKey, uploads: [{ name, key, uploadUrl, publicUrl, headers }], expiresIn }`, donde `headers` son las cabeceras exactas que el cliente debe enviar en el `PUT`.
  - **La firma debe atar tipo, tamaño y caché.** Por defecto el SDK solo firma `content-length;host`: el cliente podría subir `text/html` y `Cache-Control` se perdería. Se firma con `getSignedUrl(client, command, { expiresIn: 300, signableHeaders: new Set(['content-type', 'cache-control']) })`; el resultado lleva `X-Amz-SignedHeaders=cache-control;content-length;content-type;host` (probado). Un `PUT` con otro tipo, otro tamaño o sin `Cache-Control` recibe 403.
  - **Sin checksum automático.** `createR2Client` usa `requestChecksumCalculation: 'WHEN_REQUIRED'` y `responseChecksumValidation: 'WHEN_REQUIRED'`; sin eso el SDK mete en la URL `x-amz-checksum-crc32` del cuerpo vacío (probado que así desaparece). Que R2 rechace el `PUT` cuando ese parámetro va no está probado: se confirma en el despliegue esqueleto (§8).
- `POST /api/media/delete` (reemplaza `api/uploads/delete.ts`). Cuerpo `{ mediaId }`. Si la foto está en uso responde 409 indicando dónde; si no, borra los dos objetos y luego la fila.
- `GET /api/health` sin cambios (ya informa si R2 está configurado).

**Configuración**:

- Variables existentes: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Nueva y opcional: `R2_ENDPOINT` (si existe, `server/r2.ts` la usa con `forcePathStyle` y no pide `R2_ACCOUNT_ID`), para apuntar al S3 local en desarrollo.
- `cloudflare/r2-cors.json`: orígenes de producción, preview y `http://localhost:4200`; método `PUT`; cabeceras `Content-Type` y `Cache-Control`.
- Desarrollo local: `docker-compose.dev.yml` con SeaweedFS y creación del bucket (§4.3); `.env.example` documenta los valores locales. Así los agentes prueban subir, leer y borrar sin credenciales reales.
- `vercel.json`: CSP con `img-src` limitado a `'self'`, `data:`, `blob:` y el dominio público de R2; `connect-src` a Supabase y al endpoint de R2. Angular inyecta etiquetas `<style>`, así que `style-src` probablemente necesite `'unsafe-inline'` (los scripts sí van estrictos). No está probado: la CSP entra en modo `Content-Security-Policy-Report-Only` en el despliegue esqueleto y D1 la vuelve obligatoria.
- `DEPLOYMENT.md`: pasos de bucket, dominio público, CORS y credenciales S3 con permiso solo sobre ese bucket.

## 6. Uso de `/impeccable`

Reglas para todo agente que toque UI: `impeccable context --target <archivo>` **una vez por sesión**; leer `reference/craft-floor.md` justo antes de editar UI; verificar en pasadas acotadas (una ronda 390 + 1440, corregir en lote, una ronda de confirmación, parar).

| Momento | Comando | Superficies |
| --- | --- | --- |
| Oleada 1 | `extract` | Tokens y kit desde el código actual. Enmienda a `DESIGN.md`: sección «Superficies interactivas» (compositor, fotos recortadas, colores de datos, mobile-first). |
| Antes de construir | `shape` → brief en `.impeccable/surfaces/` | Una por superficie nueva. Cada brief incluye su contrato de prueba de interfaz (§7.5). **Ronda de conceptos con elección del usuario solo en dos**, juntas en el paso «Conceptos» de §8: Arma tu ramo y Mesa de receta. El resto extiende «Mesa de taller» (panel) y «El escaparate sereno» (tienda). |
| Al construir | flujo new-work + craft-floor | Cada paquete con UI. |
| Fin de cada oleada | `audit` + `harden` + `adapt` | Lo tocado en la oleada. |
| Oleada 4 | `critique` (ramo, receta, Hoy) · `clarify` (textos del panel en lenguaje de la dueña) · `optimize` · `polish` · finish reviewer + documenter | Cierre; `DESIGN.md` y sidecar al día. |

No se usan `animate`, `delight`, `overdrive` ni `bolder`.

## 7. Protocolo para agentes

### 7.1 Roles

| Rol | Hace | Es dueño de |
| --- | --- | --- |
| **Líder / integrador** | Oleada 0, conecta rutas, resuelve dudas de contrato, corre la verificación de oleada. Tras la Oleada 1 es además el dueño del kit y de los tokens. | `app.routes.ts`, `admin.routes.ts`, `site-header`, `core/domain/types.ts` (único dueño; A1 no lo toca), `database.types.ts` (se regenera con `db:types`), `PLAN.md`, `CLAUDE.md`; desde el cierre de la Oleada 1: `src/styles/**` y `src/app/ui/**` salvo las carpetas de A4, B3, B2 y C0 |
| **Agente de pruebas (T)** | En la Oleada 0 (paso 0-T) escribe la infraestructura de verificación. Antes de **cada** paquete escribe todas las pruebas del catálogo §9 de ese paquete, del tipo que sean (D, DB, M, UI, F, MOB, SEC). | `**/*.catalog.spec.ts`, `supabase/tests/**`, `api/**/*.catalog.test.ts`, `scripts/verify-*.mjs`, `scripts/gen-golden-sql.mjs`, `supabase/tests/fixtures/**` |
| **Agentes de paquete** | Implementan un paquete de §8 hasta poner en verde sus pruebas. | Los archivos listados en su paquete |

El trabajo es **secuencial**: un paquete a la vez, en el orden de §8, sobre la rama `feat/taller` (un commit de cierre por paquete). Cada paquete son dos sesiones distintas: primero T escribe sus pruebas, después otro agente lo implementa. Quien implementa nunca escribe ni edita las pruebas del catálogo.

### 7.2 Reglas que valen para todos

1. Solo `pnpm`. Nunca `npm` ni `npx`.
2. **Mobile-first**: se escribe el CSS para 390 px y se amplía con `@include from(...)`. Nada de scroll horizontal a 360 px. Objetivos táctiles ≥ 44 px. Acción principal al alcance del pulgar (barra fija inferior).
3. Código nuevo sin hexadecimales: solo tokens de `src/styles/_tokens.scss`. Si falta un token, se pide al dueño del kit (A2 durante la Oleada 1; después, el líder).
4. Antes de crear un componente se busca en `src/app/ui/`. Si algo se repite dos veces, va al kit (lo agrega el dueño del kit).
5. Componentes standalone, `ChangeDetectionStrategy.OnPush`, inputs y estado con señales, rutas lazy.
6. Nunca `innerHTML`. Textos en español de Guatemala, lenguaje de la dueña (sin «slug», «SKU», «BOM»).
7. Nada de datos inventados sin rotular: lo de la semilla se marca «demostración».
8. Dinero: `formatGTQ`. Fechas: zona `America/Guatemala`. Nunca aritmética de dinero con flotantes sin redondear a 2.
9. Ningún secreto en el repo ni en `public/config.js`. No leer `private/`.
10. No tocar archivos de otro dueño. Si hace falta, se pide al líder en la nota de entrega o se detiene.
11. **Las pruebas del catálogo no se modifican.** Si una parece equivocada, se detiene y se reporta al líder con el caso concreto. Se pueden agregar pruebas propias en archivos `*.spec.ts` normales.
12. No cambiar firmas de §4 sin aprobación del líder.
13. Una función SQL, un archivo dueño (§4.1). Toda función nueva trae su `revoke` y sus `grant` en el mismo archivo.

### 7.3 Ciclo de un paquete

0. **Antes del paquete** (en este orden): (a) si el paquete tiene pantalla, su brief `shape` en `.impeccable/surfaces/`, que **incluye el contrato de prueba de interfaz** (§7.5); (b) T escribe las pruebas del paquete con los valores de §9 y ese contrato, y deja una nota en `docs/entregas/<paquete>-pruebas.md` con los IDs escritos y cuáles **se espera que pasen de entrada** (p. ej. DB-01 o DB-52, que vigilan algo que ya se cumple).
1. **Arranque**: leer `PLAN.md` (§2, §3, §4, su paquete en §8 y sus pruebas en §9), `DESIGN.md`, `PRODUCT.md`, el brief en `.impeccable/surfaces/` y los archivos de «Leer primero». Correr `pnpm install`, `pnpm run stack:up`, `pnpm run db:reset`, y sus pruebas del catálogo: deben **fallar** por falta de implementación, salvo las que la nota de T marca como «pasan de entrada». Si no existen, o pasa alguna que no debía, detenerse y avisar.
2. **Construcción**: primero datos y lógica hasta poner en verde las pruebas de base y de dominio; después UI a 390 px; después ampliación a 1440 px; al final estados de carga, vacío y error.
3. **Autoverificación**: `pnpm test`, `pnpm run test:api`, `pnpm run db:test`, `pnpm run typecheck:api`, `pnpm run build`, `pnpm run verify:public-build`, `pnpm run verify:tokens`, `pnpm run verify:migrations`, y el flujo E2E de su paquete. Capturas 390×844 y 1440×900 de cada pantalla nueva en `.impeccable/review/<paquete>/`.
4. **Entrega** (`docs/entregas/<paquete>.md`): qué se hizo; IDs de pruebas en verde; capturas; decisiones tomadas; pendientes; cambios que necesita de otro dueño.

### 7.4 Definición de terminado

- Todas las pruebas del catálogo asignadas al paquete en verde, sin haberlas modificado.
- Cada pantalla tiene estados de carga, vacío y error, y se opera completa con teclado.
- Capturas a 390 y 1440 revisadas; sin scroll horizontal a 360.
- Sin hexadecimales nuevos; sin `any` nuevo; presupuesto de estilos por componente (20 kB) respetado.
- Nota de entrega escrita.

### 7.5 Contrato de prueba de interfaz

Las pruebas UI-* y F-* se escriben antes que la pantalla, así que necesitan saber cómo encontrar las cosas. Ese contrato se fija **en el brief `shape`** de cada superficie (sección «Contrato de prueba»), antes de que T escriba, y quien implementa lo respeta igual que una firma de §4:

- **Componentes del kit y compartidos**: selector (`ui-<nombre>`), inputs y outputs con su tipo. Ejemplo: `ui-number-stepper` · `value: model<number>` · `min`, `max`, `step: input<number>` · `label: input<string>`.
- **Pantallas**: la lista de `data-testid` que la prueba necesita, con el formato `<superficie>-<elemento>[-<id>]` en kebab-case (`builder-total`, `builder-flower-<variantId>`, `recipe-row-<materialId>`, `orders-next-step`). Las pruebas buscan primero por rol y nombre accesible; el `data-testid` es para lo que no tiene un rol estable (totales, filas, celdas del calendario).
- **Textos que la prueba compara** se toman de §3 y §9 tal cual (p. ej. «Lleno», «Muy pronto», «Fecha estimada · se confirma por WhatsApp o Instagram»).
- Los briefs del kit y del shell (UI-01..06) los escribe el líder en la Oleada 0, porque A2 es el primer paquete con interfaz.

Cambiar un selector, input o `data-testid` del contrato después de escritas las pruebas pasa por el líder.

## 8. Paquetes de trabajo

Orden único de ejecución, de arriba abajo. No hay fechas: un paquete empieza cuando el anterior cerró con su nota de entrega. Antes de **cada** paquete corre el paso 0 de §7.3 (brief si hay pantalla → T escribe sus pruebas).

```
Oleada 0 → A1 → A3 → A2 → A4 → despliegue esqueleto
         → B1 → B3 → Conceptos → B2 → C0 → B4
         → C1 → C2 → C3 → C4
         → D1 → D2 → D3 → D4
```

### Oleada 0 — Preparación (líder + usuario)

1. Restaurar Git: `git init`, agregar remoto `ordzson/Lirios`, `fetch`, comparar con la carpeta local y **pedir confirmación al usuario** antes de decidir cuál manda. Rama `feat/taller`.
2. Supabase local: `pnpm dlx supabase init`, fijar `project_id` y puertos de §4.3 en `supabase/config.toml`, y `start`. Scripts nuevos en `package.json`: `stack:up`, `db:reset`, `db:golden` (genera el SQL de los casos dorados, §9.1), `db:test` (corre `db:golden` y luego pgTAP), `db:types`, `test:api` (Vitest en entorno node con `vitest.api.config.ts`), `verify:tokens` (falla si hay hexadecimales fuera de `src/styles/` en carpetas nuevas), `verify:migrations` (§4.1), `verify:flows`. El líder solo **registra** estos scripts: los archivos a los que apuntan (`scripts/gen-golden-sql.mjs`, `scripts/verify-*.mjs`, `supabase/tests/**`) son de T y se escriben en el paso 0-T. Hasta entonces no se corren.
3. S3 local: `docker-compose.dev.yml` con SeaweedFS, su `s3.json` de desarrollo y `scripts/dev-s3-init.mjs`; `.env.example` actualizado con los valores locales de §4.3.
4. Functions en local: `tsx` como dependencia de desarrollo, `scripts/dev-api.mjs`, `proxy.conf.json` conectado en `angular.json`, scripts `dev:api` y `dev`.
5. `src/test-setup.ts` con el sustituto de `showModal`/`close`, conectado en la configuración de pruebas.
6. **Contratos que las pruebas necesitan antes de existir**: `src/app/core/domain/types.ts` copiado de §4.2; `supabase/tests/fixtures/README.md` con el formato de un caso dorado (§9.1); briefs con contrato de prueba de interfaz (§7.5) para el kit y el shell del panel.
0-T. **Infraestructura de verificación (sesión de T).** Va después del paso 6 y antes del paso 9. Son scripts de verificación, no pruebas de un paquete, así que no caben en el paso 0 de §7.3. T escribe:
   - `scripts/verify-tokens.mjs` y `scripts/verify-migrations.mjs` completos, con las reglas del paso 2, §4.1 y §7.2. No dependen de ningún paquete.
   - `scripts/gen-golden-sql.mjs` completo según §9.1. Sin fixtures genera 0 archivos y sale en 0. Los JSON dorados los escribe T en el paso 0 de A3 (D-22).
   - `scripts/verify-flows.mjs` como base: arranca Chrome, recorre los viewports de §9.6, corre `db:reset` antes de cada viewport y tiene un registro de flujos vacío. Cada flujo se agrega en el paso 0 de su paquete (F7 antes de A2, F6 antes de A4…).
   - `supabase/tests/00_smoke.sql`: una prueba pgTAP mínima para que `db:test` tenga algo que correr.
   - Nota `docs/entregas/oleada0-T.md` con lo escrito y la salida de cada script.
7. Copiar este plan al repo como `PLAN.md`; crear `CLAUDE.md` del proyecto con §7.2; nota de pausa al inicio de `ADMIN_PLAN.md`; carpeta `docs/entregas/`.
8. Capturas base de todas las páginas públicas (390 y 1440) en `.impeccable/review/base/`.
9. CI (`.github/workflows/validate.yml`): disparar también en `feat/**`; agregar `db:test`, `test:api`, `verify:tokens`, `verify:migrations` y `verify:flows` (§4.3).

Cierre de la Oleada 0: `pnpm run stack:up` levanta todo sin chocar con `horarios`; `pnpm run dev` sirve la tienda en `:4200` y `GET /api/health` responde por el proxy; `pnpm test` sigue en verde; `pnpm run db:test`, `pnpm run test:api`, `pnpm run verify:tokens`, `pnpm run verify:migrations` y `pnpm run verify:flows` corren y salen en verde (todavía casi vacíos), en local y en CI.

Usuario, mientras tanto: crear el proyecto Supabase y el bucket R2 con dominio público; empezar las fotos recortadas; reunir datos reales (materiales, compras, minutos por flor, ganancia por hora, margen meta, horario y hora de cierre, usuario de Instagram, fechas de temporada).

### Oleada 1 — Cimientos

**A1 · Esquema y contratos**
- Leer primero: migración inicial, §4.1, §5 (tabla `media`).
- Pasos: (1) las dos migraciones núcleo con RLS y permisos; (2) `…0003_contract.sql`: privilegios por defecto, ganchos, `get_storefront` y stubs «no implementado» de las demás RPC del contrato (**sin tocar `create_order` ni `track_order`**: el checkout actual debe seguir funcionando); (3) semilla de demostración `supabase/seed.sql` = datos dorados de §9.1 + catálogo actual, con `track_inventory = false` y «Lirios carmesí» enlazado a su receta; (4) `pnpm run db:types` → `core/data/database.types.ts`.
- Archivos: `supabase/migrations/2026111700*`, `supabase/seed.sql`, `core/data/database.types.ts`. No toca `core/domain/types.ts` (es del líder).
- Pruebas: DB-01..05, DB-52. Además: hacer un pedido desde `/carrito` sigue funcionando igual que antes.

**A3 · Dominio puro**
- Implementar §4.2 en `src/app/core/domain/**` (todo menos `types.ts`).
- Pruebas: D-01..23.

**A2 · Sistema de diseño, kit y shell del panel**
- Leer primero: `DESIGN.md`, `.impeccable/surfaces/admin.md`, `admin-dashboard.component.*`, `src/styles.scss`, briefs del kit.
- Pasos: (1) `impeccable extract` → `_tokens.scss`, `_mixins.scss`; (2) kit UI de §4.2 con muestrario `/admin/_kit`; (3) enmienda a `DESIGN.md`; (4) dividir el panel en rutas lazy con shell (barra inferior en móvil, lateral en escritorio) **sin cambiar comportamiento**; (5) briefs `shape` para las pantallas del panel de la Oleada 2, cada uno con su contrato de prueba (§7.5).
- Archivos: `src/styles/**`, `src/app/ui/**` (salvo `image-upload`, `capacity-calendar`, `composer`, `bouquet-builder`), `pages/admin/shell/**`, `admin.routes.ts` (junto al líder), `DESIGN.md`.
- Pruebas: UI-01..06, F7.

**A4 · Medios R2**
- Leer primero: `api/uploads/*`, `server/*`, `admin-data.service.ts` (`uploadProductImage`), §4.3, §5.
- Pasos: (1) `server/r2.ts` con `R2_ENDPOINT` y sin checksum automático; (2) `api/uploads/sign.ts` v2 con cabeceras firmadas; (3) `api/media/delete.ts` y borrar `api/uploads/delete.ts`; (4) `core/media/`: funciones puras, `ImageCodec` y `media.service.ts`; (5) `ui/image-upload` (elegir foto, vista previa, progreso, reintento, texto alternativo), visible en el muestrario; (6) CORS, CSP en modo solo-informe y `DEPLOYMENT.md`.
- Archivos: `api/**`, `server/**`, `core/media/**`, `ui/image-upload/**`, `cloudflare/**`, `vercel.json`.
- Pruebas: M-01..12, F6.

**Verificación de oleada** (líder): todo en verde, muestrario revisado a 390, panel v1 intacto en rutas nuevas, checkout actual intacto, una foto sube al S3 local desde `pnpm run dev` y se ve.

**Despliegue esqueleto** (líder + usuario, antes de seguir): aplicar las migraciones al proyecto Supabase de la nube, configurar el bucket R2 real con su CORS, desplegar en Vercel y comprobar desde un teléfono: la tienda carga, `GET /api/health` informa R2 configurado, **una foto sube a R2 real con la firma de §5** (aquí se confirma lo del checksum), y la consola no muestra violaciones de la CSP en modo solo-informe. Lo que falle aquí se arregla ahora, no al final.

### Oleada 2 — Taller

**B1 · Materiales y existencias** · depende de A1, A2
- Pantallas (`/admin/materiales`): lista agrupada por tipo con muestra de color, disponible/apartado y medidor contra el mínimo; detalle con lotes (capas PEPS visibles, la más antigua primero) e historial; hoja «Registrar compra» (material, cantidad, total pagado → muestra el costo unitario); ajuste con motivo; aviso «Usaste N más de lo registrado» cuando hay faltante; pestaña «Lista de compras» con botón Copiar.
- Móvil: lista de una columna, detalle como pantalla siguiente, «Registrar compra» en hoja inferior con teclado numérico.
- Pruebas: DB-06..12.

**B3 · Capacidad y agenda** · depende de A1, A2
- Pantallas: `/admin/agenda` (tira de días con barra carga/capacidad; al tocar un día: pedidos, «Cerrar fecha», «Agregar horas»); horario semanal, hora de cierre, tope de apartado y excepciones en `/admin/ajustes`; `ui/capacity-calendar` (lo reutilizan C0, C1, C3 y B4; su único dueño es B3 y después el líder).
- Pruebas: DB-19..25, DB-53, UI-10.

**Conceptos** (líder + usuario) · una sola ronda `impeccable` para las dos superficies que comparten compositor: **Mesa de receta** y **Arma tu ramo**. El usuario elige; quedan los dos briefs con su contrato de prueba. Nada del compositor se construye antes de esta elección.

**B2 · Recetas, costos y precios** · depende de A1, A2, A3, A4, B1, Conceptos
- Construye `ui/composer` y, sobre él, la **Mesa de receta**.
- Pantallas: `/admin/recetas` (flores, arreglos, envolturas y extras); variantes de color de cada flor con `ui/image-upload` (carpeta `variants`); enlazar un producto del catálogo con su receta de arreglo; `/admin/precios` con lista de piezas (productos, flores por variante, envolturas y extras; «Sin receta» donde falte), margen actual y de reposición, estado `ok/bajo/caera`, precio sugerido y «Aplicar»; `/admin/ajustes` con ganancia por hora, margen meta, redondeo y cuota de armado.
- «Usar Q …» y «Aplicar» solo se muestran a Administración.
- Móvil: lienzo de receta arriba, paleta en hoja inferior, barra fija con costo, margen y Guardar.
- Archivos: `ui/composer/**`, `pages/admin/recetas/**`, `pages/admin/precios/**`, la parte de costos de `pages/admin/ajustes/**`.
- Pruebas: DB-13..18, DB-54, UI-07..09.

**C0 · Núcleo del ramo** · depende de A3, A4, B2, B3
- Lo que comparten el panel y la tienda, sin página pública todavía: `ui/bouquet-builder` (paleta de flores con foto, vista del ramo, resumen con precio y minutos); `bouquet_quote`, `create_bouquet_order` y los `storefront_*` de productos, builder y ajustes; `OrderService` y un `StorefrontService` que leen de `get_storefront`; **el catálogo deja de consultar `products` directo** (`catalog-data.service.ts` pasa a `get_storefront`); fixture de demostración para Pages con la misma forma.
- Archivos: `ui/bouquet-builder/**`, `supabase/migrations/202611220001_bouquet.sql`, `core/data/storefront*`, `pages/catalog/catalog-data.service.ts`, `shared/orders/**`.
- Pruebas: DB-34..38, DB-51, UI-12..14. Además: catálogo y detalle se ven igual que en las capturas base.

**B4 · Pedidos y producción** · depende de B1, B2, B3, C0
- Pantallas: `/admin/pedidos` con pestañas por estado y contador («Apartado vencido» y «Sin apartar» visibles en los por confirmar); detalle con botón de **siguiente paso**, contacto (WhatsApp, llamar, Instagram), piezas, fecha, costo y margen del pedido (solo admin); al confirmar con cupo ocupado, la hoja propone la nueva fecha; asistente `/admin/pedidos/nuevo` (usa `ui/bouquet-builder` con costo y margen); hoja «¿Qué usaste?»; «Reabrir» (solo admin); aviso de sugerencias de receta.
- `create_order` v2: bajo pedido (sin `inventory`), precio por `effective_price`, guarda por `order_guard`, fecha y apartado, imagen tomada de la base.
- Móvil: lista → detalle como pantallas consecutivas con URL propia; siguiente paso en barra fija.
- Pruebas: DB-26..33, DB-49, DB-50, UI-11, F2.

**Verificación de oleada**: flujo F2 completo desde un teléfono; checkout del carrito con fecha estimada; `audit` + `harden` + `adapt` sobre el panel.

### Oleada 3 — Vitrina

**C1 · Arma tu ramo (página)** · depende de C0, B4
- Pasos de `/arma-tu-ramo`, sobre `ui/bouquet-builder`: (1) flores y color; (2) envoltura y extras; (3) fecha estimada y datos de contacto/entrega; (4) pedido guardado + «Confirmar por WhatsApp» / «Confirmar por Instagram» (o «Tu fecha se confirma por chat» si el pedido quedó sin apartar).
- Móvil: vista del ramo fija arriba (~45 % del alto), pestañas debajo, barra inferior con precio, fecha estimada y Continuar.
- También: fecha estimada en `/carrito` y en el detalle de producto; enlaces en header, inicio y `/personalizados`; `track_order` v2 y su pantalla.
- Pruebas: DB-39, UI-18, F1.

**C2 · Promociones y banners** · depende de A1, A3, A4, C0
- Panel `/admin/promos`: grupos de productos, promociones con vista previa de margen (el interruptor «aplica a Arma tu ramo» solo aparece con alcance «toda la tienda»), banners (banda y popup) con foto en R2.
- SQL: implementa los ganchos `effective_price` y `storefront_banners`. **No redefine** `create_order`, `bouquet_quote` ni `get_storefront`: ya llaman a los ganchos.
- Tienda: precio tachado y etiqueta en catálogo, detalle, carrito y builder; `shared/announcement-bar`; `shared/popup-host` (reglas en función pura).
- Pruebas: DB-40..43, UI-15..16, F3, F4.

**C3 · Eventos** · depende de B3, B4, C2
- `/eventos` según §3; panel: temporadas (con foto en R2) y solicitudes con «Convertir en pedido». SQL: `storefront_seasons` y las dos RPC de eventos.
- Pruebas: DB-44..45, F5.

**C4 · Estadísticas y Hoy** · depende de B4
- `/admin/estadisticas` (segmentado semana/mes/año, comparación, gráficas SVG; «Ganancia del negocio» y «Ganancia por hora real» rotuladas con su fórmula) y `/admin` (Hoy: por confirmar, entregas de hoy y mañana, taller del día, material por agotarse o con faltante, alertas de margen).
- Pruebas: DB-46..48, UI-17.

### Oleada 4 — Endurecimiento y pulido

| Paquete | Entrega |
| --- | --- |
| **D1 Seguridad** | `/security-review`; SEC-01..06; gancho `order_guard` real (límite por teléfono **y por IP** de `request.headers`, porque el teléfono lo elige quien ataca; honeypot); anon deja de leer `products` y `product_images` directo; CSP obligatoria y cabeceras en `vercel.json`; `pnpm audit`; migración de endurecimiento. |
| **D2 Rendimiento y accesibilidad** | `impeccable optimize` + `audit`; Lighthouse móvil (rendimiento ≥ 90, accesibilidad ≥ 95) en inicio, catálogo, builder y Hoy; presupuestos de bundle; índices; MOB-01..03. |
| **D3 Pulido** | `critique`, `clarify`, `polish`; SCSS público a tokens con diff visual; finish reviewer + documenter. |
| **D4 Lanzamiento y demo** | Migraciones nuevas a la nube, semilla de demostración, despliegue final en Vercel, `DEPLOYMENT.md` y `README.md`, guion del jurado (lote caro → alerta → precio sugerido → ramo en la web → agenda → «¿Qué usaste?» → estadísticas). |

## 9. Catálogo de pruebas

Las escribe el agente de pruebas con estos valores exactos, antes de cada paquete (§7.3, paso 0). Los agentes de paquete las ponen en verde sin modificarlas. Son ~120: las necesarias para que nadie termine a ciegas.

### 9.1 Datos dorados (semilla y fixtures comparten estos valores)

La semilla base (`supabase/seed.sql`) contiene solo ajustes, horario, colores, materiales, lotes, recetas, variantes, envolturas y productos: **ningún pedido**. Cada prueba de base crea su propio escenario (pedidos, excepciones, promociones) dentro de una transacción y hace rollback; las de capacidad usan `delivery_estimate_at` con el instante indicado. Los pedidos para la demostración del jurado van aparte, en `supabase/seed-demo.sql`.

**Casos dorados compartidos TS ↔ SQL.** La fuente son `supabase/tests/fixtures/costing.json`, `promotions.json` y `bouquet.json`. Cada caso es `{ id, input, expected }`, con `input` en los tipos de §4.2 y **autocontenido** (trae sus lotes, recetas, ajustes y promos; no depende de la semilla). Vitest los lee directo (D-22). Para SQL, `scripts/gen-golden-sql.mjs` (`pnpm run db:golden`) genera `supabase/tests/generated/golden_*.sql`: por cada caso abre una transacción, vacía las tablas que toca, inserta el `input` como filas (los ids del fixture son uuid y se usan tal cual), llama a `recipe_cost`, `effective_price` o `bouquet_quote`, compara con `expected` usando pgTAP y hace rollback. `db:test` regenera antes de correr, y CI falla si lo generado no coincide con lo que está en el repo.

**Ajustes**: ganancia por hora Q30.00 · margen meta 30 % · indirectos 0 % · redondeo Q5 · anticipación 1 día · apartado 48 h · tope de apartado sin confirmar 480 min · cuota de armado Q10 (10 min) · minutos de un producto sin receta 60.

**Horario**: lunes a viernes 240 min · sábado 120 · domingo 0 · hora de cierre 18:00. «Ahora» de referencia: **lunes 2026-11-16 a las 08:00** (hora de Guatemala), salvo que el caso diga otra cosa.

**Materiales y lotes**

| Material | Unidad | Mínimo | Paquete | Lotes (fecha · cantidad · costo unitario · saldo) |
| --- | --- | --- | --- | --- |
| Limpiapipas rojo | pieza | 100 | 100 | L1 2026-10-01 · 100 · Q0.50 · **10** — L2 2026-11-01 · 100 · Q0.80 · **100** |
| Limpiapipas amarillo | pieza | 50 | 100 | L3 · 50 · Q0.50 · 50 |
| Limpiapipas verde | pieza | 50 | 100 | L4 · 200 · Q0.40 · 200 |
| Alambre | cm | 200 | 1000 | L5 · 1000 · Q0.02 · 1000 |
| Cinta floral | cm | 100 | 500 | L6 · 500 · Q0.05 · 500 |
| Papel de envoltura | hoja | 5 | 20 | L7 · 20 · Q3.00 · 20 |

**Receta «Lirio»** (20 min): 6 × color principal (ranura de la familia «limpiapipas») · 2 × verde · 30 cm alambre · 10 cm cinta. Precio del diseño Q25.
**Envoltura «Papel clásico»** (5 min): 1 hoja. Precio Q15.
**Producto «Lirios carmesí»**: Q145, categoría arreglos, con receta de arreglo: 5 × lirio rojo + 1 × papel clásico + 10 min de armado. Los demás productos del catálogo actual quedan **sin receta** (60 min).

**Valores esperados**

| Caso | Resultado |
| --- | --- |
| Lirio rojo, materiales PEPS | 6×0.50 + 2×0.40 + 30×0.02 + 10×0.05 = **Q4.90** |
| Lirio rojo, mano de obra | 20/60 × 30 = **Q10.00** |
| Lirio rojo, costo | **Q14.90** |
| Lirio rojo, costo de reposición | 6×0.80 + 0.80 + 0.60 + 0.50 + 10.00 = **Q16.70** |
| Lirio rojo, precio sugerido | 14.90 / 0.70 = 21.29 → **Q25** |
| Lirio rojo, piezas al costo actual | ⌊10 / 6⌋ = **1** |
| Margen a Q25 | (25 − 14.90) / 25 = **40.4 %** → `ok` |
| Estado a Q22 | PEPS 32.27 % ≥ 30, reposición 24.09 % < 30 → **`caera`** |
| Estado a Q20 | PEPS 25.5 % < 30 → **`bajo`** |
| `fifoCost` rojo × 18 | 10×0.50 + 8×0.80 = **Q11.40**, faltante 0, 2 capas |
| `fifoCost` rojo × 120 | 5.00 + 80.00 + 10×0.80 = **Q93.00**, faltante **10** |
| Lirio rojo con 10 % de desperdicio en el color | 6.6×0.50 = 3.30 → materiales **Q5.20** |
| Lirio amarillo | materiales **Q4.90**, reposición igual, piezas al costo actual **`null`** (nada va a subir) |
| Lirios carmesí, materiales PEPS | rojo 30 = 10×0.50 + 20×0.80 = 21.00 · verde 10×0.40 = 4.00 · alambre 150×0.02 = 3.00 · cinta 50×0.05 = 2.50 · papel 3.00 → **Q33.50** |
| Lirios carmesí, minutos y mano de obra | 5×20 + 5 + 10 = **115 min** → 115/60 × 30 = **Q57.50** |
| Lirios carmesí, costo y reposición | **Q91.00** · reposición (rojo 30×0.80 = 24.00) **Q94.00** |
| Lirios carmesí, precio sugerido | 91 / 0.70 = 130.00 → **Q130** (no Q135: primero se redondea a centavos) |
| Lirios carmesí, margen a Q145 | (145 − 91) / 145 = **37.2 %** → `ok` |
| Ramo R1: 3 lirios rojos + 2 amarillos + papel clásico | 5×25 + 15 + 10 = **Q150.00** · 5×20 + 5 + 10 = **115 min** |
| R1 con promo 15 % que aplica al builder | **Q127.50** |
| R1 con promo fija de Q20 que aplica al builder | una vez por ramo → **Q130.00** |
| R1 con ambas (15 % y Q20) | gana 15 % (22.50 > 20) → **Q127.50** |
| Lirios carmesí con «Q20 en arreglos», vista previa de margen | Q125 → (125 − 91) / 125 = **27.2 %** → bajo el margen meta |
| Lirios carmesí con promo fija de Q60 | Q85 < Q91 → **bajo el costo** |
| Lirios carmesí con «10 % toda la tienda» y «Q20 en arreglos» | gana Q20 → **Q125.00** |
| Lirios carmesí con promo fija de Q200 | **Q0.00** |

**Capacidad** (pedido nuevo W = 115 min, ahora = lunes 2026-11-16 08:00)

| Caso | Situación | Fecha más cercana |
| --- | --- | --- |
| CAP-A | Sin pedidos | **martes 17** |
| CAP-B | Pedido confirmado de 400 min para el miércoles 18 | **jueves 19** (martes y miércoles `full`) |
| CAP-C | Igual que B, pero el pedido está «por confirmar» con apartado vencido | **martes 17** |
| CAP-D | Sin pedidos, excepción: lunes 16 cerrado | **miércoles 18** (martes `soon`, no `full`) |
| CAP-E | Ahora = sábado 2026-11-21 08:00, sin pedidos | domingo 22 `closed` → **lunes 23** |
| CAP-F | W = 100 000 min | `earliest = null` |
| CAP-G | Ahora = lunes 16 a las **17:00**, sin pedidos | hoy solo aporta 60 min → martes `soon` → **miércoles 18** |
| CAP-H | Ya hay 400 min de «por confirmar» web vigentes y entra otro pedido web de 115 min | 515 > 480 → se guarda **sin apartar** (`hold_expires_at` nulo) y no ocupa cupo ni material |
| CAP-I | Como CAP-C, pero después otro pedido confirmado de 480 min para el miércoles 18 ocupó el cupo; se intenta confirmar el vencido (400 min, miércoles 18) | 880 min no caben antes del viernes → falla con `capacity_conflict` y propone **viernes 20**; con `p_date` = viernes 20 confirma |

**Existencias** (rojo: existencia 110): pedido confirmado necesita 18 · «por confirmar» vigente necesita 12 · «por confirmar» vencido necesita 30 · «por confirmar» sin apartar necesita 9 · pedido `ready` con consumo ya registrado tenía plan de 18 → apartado **30**, disponible **80** (solo cuentan los dos primeros). Lista de compras: 30 + 100 − 110 = 20 → **1 paquete (100)**, costo estimado **Q80.00**.

**Producción real**: pedido con plan 18 rojos y uso real 20 → L1 queda en **0**, L2 en **90**, 2 movimientos, costo real del rojo **Q13.00**, diferencia **+2 (11.1 %)**. Reabrir y completar con total 23 → solo se descuentan 3 más (L2 en **87**). Completar con total 20 otra vez → ningún movimiento.

**Faltante**: consumir 120 rojos con existencia 110 → costo **Q93.00**, faltante **10**, L1 y L2 en **0**, un movimiento de tipo faltante por 10, el pedido pasa a «Listo» y el material queda con el aviso de compra por registrar.

**Sugerencia de receta**: tres pedidos de solo lirios rojos con uso real de 7, 7 y 6.5 por flor contra 6 de receta → promedio 6.83 (+13.9 %) → sugerir **7**. Un cuarto pedido que mezcla lirio rojo y gerbera roja (comparten limpiapipas rojo) con uso de 12 por flor **no** cambia el promedio ni la sugerencia.

**Estadísticas** (semana del 16 al 22 de noviembre): pedido A entregado, web, Q150, materiales reales Q30, 120 min · pedido B entregado, WhatsApp, Q145, materiales reales Q25, 90 min → ventas **Q295** · materiales **Q55** · horas **3.5** · mano de obra a la meta **Q105** · «Ganancia del negocio» 295 − 55 − 105 = **Q135** · «Ganancia por hora real» (295 − 55) / 3.5 = **Q68.57** contra la meta de Q30 · por canal web 1 / WhatsApp 1 · ticket promedio **Q147.50**.

### 9.2 Dominio — Vitest (`src/app/core/domain/*.catalog.spec.ts`) · dueño de implementación: A3

| ID | Prueba |
| --- | --- |
| D-01 | `fifoCost` rojo × 6 = 3.00, una capa (L1). |
| D-02 | `fifoCost` rojo × 18 = 11.40, dos capas en orden de fecha. |
| D-03 | `fifoCost` rojo × 120 = 93.00 con `shortfall` 10. |
| D-04 | `fifoCost` con cantidad 0 = 0 y sin capas; sin lotes devuelve costo 0 y `shortfall` = cantidad. |
| D-05 | `recipeCost` lirio rojo: materiales 4.90, mano de obra 10.00, total 14.90, reposición 16.70, piezas al costo actual 1. |
| D-06 | `recipeCost` resuelve la ranura de color: lirio amarillo usa L3 (materiales 4.90) y `piecesAtCurrentCost` es `null`. |
| D-07 | `recipeCost` con 10 % de desperdicio en el color: materiales 5.20. |
| D-08 | `suggestPrice(14.90, 0.30, 5)` = 25; `suggestPrice(17.50, 0.30, 5)` = 25; `suggestPrice(0, 0.30, 5)` = 0; margen meta 0 devuelve el costo redondeado. |
| D-09 | `roundUpTo`: 21.29→25, 25→25, 25.01→30, con paso 1: 21.29→22. |
| D-10 | `marginStatus` a Q25 `ok`, a Q22 `caera`, a Q20 `bajo`. |
| D-11 | `margin` con precio 0 devuelve 0 (sin dividir entre cero). |
| D-12 | `applyPromotions`: 10 % sobre Q145 = 130.50. |
| D-13 | `applyPromotions`: entre 10 % global y Q20 en arreglos gana Q20 → 125.00 y devuelve su `promoId`. |
| D-14 | `applyPromotions`: fija de Q200 → 0.00, nunca negativo. |
| D-15 | `applyPromotions`: ignora promos vencidas, futuras, inactivas y de un grupo al que la pieza no pertenece. |
| D-16 | `bouquetQuote` R1 = subtotal 150.00, descuento 0, total 150.00, 115 min. |
| D-17 | `bouquetQuote` R1 con promo 15 % de builder = total 127.50; con promo que no aplica al builder = 150.00; con fija de Q20 de builder = 130.00 (una vez por ramo); con ambas = 127.50. |
| D-18 | `layoutBouquet(n)` para n = 1..30: devuelve n posiciones, todas con x,y en [0,1], determinista (misma entrada, misma salida) y sin dos centros a menos de 0.04. |
| D-19 | `formatGTQ(145)` = 'Q 145.00'; `formatGTQ(1250.5)` = 'Q 1,250.50'; `formatGTQ(null)` = 'Precio por confirmar'. |
| D-20 | `normalizePhoneGT`: '5555 0182' → '50255550182'; '+502 5555-0182' → igual; '123' → null. |
| D-21 | `whatsappUrl` codifica saltos de línea y acentos e incluye el número de pedido del mensaje; `instagramUrl('dumish')` = 'https://ig.me/m/dumish'. |
| D-22 | Casos dorados: cada entrada de `supabase/tests/fixtures/costing.json`, `promotions.json` y `bouquet.json` da el resultado registrado. |
| D-23 | `recipeCost` del arreglo «Lirios carmesí»: suma el rojo de las 5 flores antes de recorrer capas → materiales 33.50, mano de obra 57.50, total 91.00, reposición 94.00; `suggestPrice(91, 0.30, 5)` = 130. |

### 9.3 Base de datos — pgTAP (`supabase/tests/*.sql`)

| ID | Dueño | Prueba |
| --- | --- | --- |
| DB-01 | A1 | `db:reset` aplica todas las migraciones y la semilla sin errores. |
| DB-02 | A1 | Todas las tablas nuevas tienen RLS activa. |
| DB-03 | A1 | anon no puede leer ni escribir ninguna tabla nueva (se recorre la lista). |
| DB-04 | A1 | Un usuario sin rol no lee nada; `manager` lee materiales y pedidos; `admin` lee todo. |
| DB-05 | A1 | `stock_movements` no admite `update` ni `delete` para ningún rol. |
| DB-06 | B1 | `admin_receive_lot` crea el lote, calcula el costo unitario con 4 decimales y registra el movimiento. |
| DB-07 | B1 | `consume_material_fifo(rojo, 18)` devuelve costo 11.40 y faltante 0, deja L1 en 0 y L2 en 92. |
| DB-08 | B1 | Consumir 120 rojos con existencia 110 **no falla**: costo 93.00, faltante 10, L1 y L2 en 0, un movimiento de faltante por 10; la existencia queda en 0, nunca negativa. |
| DB-09 | B1 | `material_availability` para rojo: existencia 110, apartado 30, disponible 80. |
| DB-10 | B1 | El apartado cuenta solo `confirmed`, `in_production` sin consumo registrado y `received` con apartado vigente; ignora `received` vencido o sin apartar, `ready` (ya consumido), `out_for_delivery`, `delivered` y `cancelled` (escenario de §9.1 → 30). |
| DB-11 | B1 | `shopping_list` para rojo: 1 paquete de 100, Q80.00; un material sobrado no aparece. |
| DB-12 | B1 | `admin_adjust_stock` exige motivo, registra movimiento y nunca deja saldo negativo. |
| DB-13 | B2 | `recipe_cost` del lirio rojo coincide con D-05. |
| DB-14 | B2 | Casos dorados de `costing.json` (SQL generado por `db:golden`): SQL = TS en todos. |
| DB-15 | B2 | Con el lirio a Q22: el rojo ya está `caera` (la semilla trae L2 caro) y el **amarillo** está `ok`; registrar un lote amarillo a Q0.80 pasa el amarillo a `caera` (reposición 16.70 → 24.09 %). |
| DB-16 | B2 | `admin_save_recipe` con versión desactualizada falla con conflicto y no guarda. |
| DB-17 | B2 | `admin_apply_suggested_prices` con `[{kind:'product', id:'arrangement-crimson-lilies'}, {kind:'flower', id:<lirio>}]` actualiza solo esas dos piezas (quedan en 130 y 25) y devuelve 2; un `kind` desconocido falla; `manager` recibe error de permiso. |
| DB-18 | B2 | Cambiar la ganancia por hora recalcula `costing_overview` (30 → 60 sube el lirio a Q24.90). |
| DB-19 | B3 | CAP-A → martes 17. |
| DB-20 | B3 | CAP-B → jueves 19, con martes y miércoles `full`. |
| DB-21 | B3 | CAP-C → martes 17. |
| DB-22 | B3 | CAP-D → miércoles 18; el martes 17 sale `soon`, no `full`. |
| DB-23 | B3 | CAP-E → domingo `closed`, lunes 23. |
| DB-24 | B3 | CAP-F → `earliest` null. |
| DB-25 | B3 | `get_delivery_estimate` responde a anon y no incluye pedidos, nombres ni minutos por día. |
| DB-26 | B4 | Transiciones válidas pasan (recibido→confirmado→en preparación; →listo por `admin_complete_production`; listo→en camino→entregado). |
| DB-27 | B4 | Transiciones inválidas fallan: recibido→entregado; en preparación→listo por `admin_set_order_status`; entregado→en preparación; «Reabrir» (listo→en preparación) por un `manager`. Un `admin` sí puede reabrir. |
| DB-28 | B4 | Cancelar un pedido confirmado libera su apartado de material y su cupo de capacidad. |
| DB-29 | B4 | `admin_complete_production` con uso real 20: L1 0, L2 90, 2 movimientos, costo real 13.00, diferencia +2; el pedido queda `ready` y deja de apartar material. Con un uso que supera la existencia completa igual y devuelve el faltante. |
| DB-30 | B4 | Llamar dos veces a `admin_complete_production` con los mismos totales no descuenta dos veces. Tras reabrir, completar con total 23 descuenta solo 3 (L2 87); con total 18 no devuelve nada. |
| DB-31 | B4 | `recipe_variance` sugiere 7 para el caso de 7, 7 y 6.5; el pedido mixto de §9.1 no cambia la sugerencia; con solo 2 pedidos atribuibles no sugiere nada. |
| DB-32 | B4 | `admin_create_order` con origen Instagram guarda origen, snapshot de receta, minutos y aparta material. |
| DB-33 | B4 | `authenticated` no puede hacer `update` ni `delete` directo sobre `orders`; `create_order` v2 toma la imagen de la base y no del payload, y acepta un producto con `inventory` 0 (bajo pedido): «Lirios carmesí» suma 115 min y aparta 30 rojos; un producto sin receta suma 60 min y no aparta material. |
| DB-34 | C0 | `get_storefront` devuelve solo variantes activas **con** foto y productos activos. |
| DB-35 | C0 | `get_storefront`: recorriendo todas las claves del JSON y partiendo cada una en palabras (por `_` y por mayúsculas de camelCase), ninguna palabra es `cost`, `costs`, `margin`, `labor`, `lot`, `lots` ni `supplier`. (`unitCost` falla; `slot` no.) |
| DB-36 | C0 | `create_bouquet_order` con R1 y `total: 1` en el payload guarda total 150.00 y 115 min. |
| DB-37 | C0 | `create_bouquet_order` fija `hold_expires_at` a 48 h y `estimated_date` igual a `delivery_estimate_at`, y toma el candado de capacidad (hay un candado consultivo de la transacción en `pg_locks` después de llamarla). |
| DB-38 | C0 | Rechaza variante inactiva o sin foto, 0 flores, más de 30 flores y fecha anterior a la más cercana. |
| DB-39 | C1 | `track_order` v2 no devuelve teléfono, dirección ni nombre. |
| DB-40 | C2 | `effective_price` coincide con D-12..D-15 (casos dorados de `promotions.json`). |
| DB-41 | C2 | `create_order` cobra el precio con promoción vigente y guarda el descuento y el id de la promo. |
| DB-42 | C2 | `admin_promo_margin_preview`: «Q20 en arreglos» deja «Lirios carmesí» en Q125 con margen 27.2 % → marcada bajo el margen meta; una fija de Q60 la deja en Q85 → marcada bajo el costo; los productos sin receta salen como «Sin receta», sin marca. |
| DB-43 | C2 | Un banner con enlace fuera de la lista blanca de rutas es rechazado; banners vencidos no salen en `get_storefront`. |
| DB-44 | C3 | `create_event_request` de 30 piezas calcula el estimado con el tramo de volumen y la factibilidad con `delivery_estimate_at`. |
| DB-45 | C3 | `admin_convert_event_request` crea el pedido, toma el candado de capacidad y marca la solicitud como convertida; no se puede convertir dos veces. |
| DB-46 | C4 | `admin_stats` semanal coincide con §9.1 (295 / 55 / 3.5 / 135 / 68.57 / 147.50). |
| DB-47 | C4 | `admin_stats` por canal: web 1, WhatsApp 1; solo cuenta entregados; `manager` recibe error de permiso. |
| DB-48 | C4 | `admin_today` cuenta por confirmar, entregas de hoy y materiales bajo el mínimo según la semilla. |
| DB-49 | B4 | `create_order` v2, `admin_create_order` y `admin_set_order_status` (al confirmar) toman el candado de capacidad: tras llamarlas hay un candado consultivo de la transacción en `pg_locks`. |
| DB-50 | B4 | CAP-I: confirmar un «por confirmar» vencido cuyo cupo ya se ocupó falla con `capacity_conflict` e informa viernes 20; con `p_date` = viernes 20 confirma. Si el cupo sigue libre, confirma sin más. |
| DB-51 | C0 | CAP-H: con 400 min de «por confirmar» web vigentes, `create_bouquet_order` de R1 guarda el pedido con `hold_expires_at` nulo y responde `holdExpiresAt: null`; ese pedido no ocupa cupo ni aparta material. |
| DB-52 | A1 | Ninguna función de `public` es ejecutable por `PUBLIC`, y las ejecutables por `anon` son exactamente la lista blanca de §4.1. Vigila cada migración nueva (corre siempre). |
| DB-53 | B3 | CAP-G → a las 17:00 el martes sale `soon` y la fecha más cercana es miércoles 18; a las 23:00 hoy aporta 0. |
| DB-54 | B2 | `recipe_cost` del arreglo «Lirios carmesí» coincide con D-23 (33.50 / 57.50 / 91.00 / 94.00); `costing_overview` le sugiere Q130, y muestra «Sin receta» y ningún margen para un producto sin receta. |

### 9.4 Medios R2 (`api/**/*.catalog.test.ts`, `core/media/*.catalog.spec.ts`) · dueño: A4

| ID | Prueba |
| --- | --- |
| M-01 | `sign`: método distinto de POST → 405 con cabecera `allow`. |
| M-02 | `sign`: sin token → 401; con token de usuario sin rol → 403. |
| M-03 | `sign`: carpeta fuera de la lista blanca → 400. |
| M-04 | `sign`: `image/svg+xml` o `text/html` → 400. |
| M-05 | `sign`: variante de más de 3 MB → 400; falta `full` o `small` → 400. |
| M-06 | `sign`: respuesta válida con dos subidas cuyas claves cumplen `^variants/[a-z0-9-]+/[0-9a-f-]{36}/(full\|small)\.(webp\|png\|jpg)$` y `expiresIn` 300. Cada `uploadUrl` trae `X-Amz-SignedHeaders=cache-control;content-length;content-type;host` y **ningún** parámetro `x-amz-checksum-*`; cada subida trae `headers` con `Content-Type` y `Cache-Control`. |
| M-07 | `sign`: un `ownerId` con `../` o un nombre de archivo malicioso nunca aparece en la clave. |
| M-08 | `delete`: foto en uso → 409 con el lugar de uso y **ninguna** llamada a R2. |
| M-09 | `delete`: foto libre → dos `DeleteObject` (full y small) y luego se borra la fila. |
| M-10 | `core/media` (funciones puras + `ImageCodec` falso): de una imagen de 4000×3000 pide `full` de 1600×1200 y `small` de 640×480; una de 800×600 no se agranda. |
| M-11 | `core/media` (píxeles sintéticos + `ImageCodec` falso): en carpeta `variants` rechaza una imagen sin píxeles transparentes en el borde con el mensaje de §5 y no llama a `sign`; con borde transparente recorta al contorno con 4 % de aire. |
| M-12 | Integración con el S3 local (se salta si no hay `R2_ENDPOINT`): firmar → `PUT` con las `headers` devueltas → 200 → `GET` devuelve los mismos bytes, `content-type` y `cache-control` → borrar → `GET` da 404. Con la misma firma: `PUT` con `Content-Type: text/html` → 403; con un cuerpo de otro tamaño → 403; sin `Cache-Control` → 403. |

### 9.5 Componentes — Vitest (`*.catalog.spec.ts` junto a cada componente)

| ID | Dueño | Prueba |
| --- | --- | --- |
| UI-01 | A2 | `number-stepper`: respeta mínimo y máximo, funciona con flechas del teclado y anuncia el valor (`aria-valuenow`). |
| UI-02 | A2 | `sheet`: renderiza un `<dialog>`, abrir llama a `showModal`, el evento `close` pone `open` en falso y emite el cierre. (Esc y regreso del foco se prueban en navegador real: F7.) |
| UI-03 | A2 | `toast` con deshacer: ejecuta la acción de deshacer y se anuncia en `aria-live`. |
| UI-04 | A2 | `money-input`: acepta '145', '145.5' y '145,50'; rechaza negativos; emite número con 2 decimales. |
| UI-05 | A2 | `chip-group`: selección única y múltiple; el estado activo no depende solo del color (`aria-pressed`). |
| UI-06 | A2 | Shell del panel: `manager` no ve Precios, Promos, Estadísticas ni Ajustes; `admin` sí. |
| UI-07 | B2 | Mesa de receta: subir un material de 6 a 7 actualiza el costo mostrado al instante (4.90 → 5.40 en materiales). |
| UI-08 | B2 | Mesa de receta (como `admin`): «Usar Q 25.00» pone el precio en 25 y el estado en `ok`. Como `manager` el botón no existe. |
| UI-09 | B2 | Precios: una pieza `caera` muestra «alcanza para ~1 pieza» y el margen de reposición. |
| UI-10 | B3 | `capacity-calendar`: los días `full`, `soon` y `closed` no se pueden elegir (`aria-disabled`) y dicen «Lleno» / «Muy pronto» / «Cerrado» en texto; el día más cercano viene preseleccionado. |
| UI-11 | B4 | «¿Qué usaste?»: llega precargado con la receta; cambiar 18 → 20 muestra «+2 de desperdicio» y envía solo las diferencias y los minutos. |
| UI-12 | C0 | Builder: tocar 3 lirios rojos, 2 amarillos y papel clásico muestra Q 150.00. |
| UI-13 | C0 | Builder: sin flores, Continuar está deshabilitado; al llegar a 30 flores la paleta deja de agregar y lo explica. |
| UI-14 | C0 | Builder: solo se ofrecen variantes con foto. |
| UI-15 | C2 | `shouldShowPopup` (función pura): falso en `/carrito` y `/pedido/*`; con frecuencia «una vez» falso tras cerrarlo; «por sesión» y «diario» según la memoria y la hora; fuera de vigencia, falso. (Esc lo cierra: F4.) |
| UI-16 | C2 | Precio con promoción: muestra el precio anterior tachado con texto accesible («Antes Q 145.00, ahora Q 125.00»). |
| UI-17 | C4 | Estadísticas: cambiar entre semana, mes y año pide el rango correcto; las gráficas tienen tabla alternativa accesible. |
| UI-18 | C1 | `/arma-tu-ramo`, paso de fecha: lleva el rótulo «Fecha estimada · se confirma por WhatsApp o Instagram»; si la respuesta trae `holdExpiresAt: null`, la pantalla final dice «Tu fecha se confirma por chat». |

### 9.6 Flujos de punta a punta (`scripts/verify-flows.mjs`, con Chrome real contra el entorno local de §4.3; se corren a 390×844, 768×1024 y 1440×900, con `db:reset` antes de cada viewport)

| ID | Dueño | Flujo |
| --- | --- | --- |
| F1 | C1 | `/arma-tu-ramo` → armar R1 → ver Q 150.00 → elegir la fecha más cercana → datos → guardar → la pantalla final muestra número de pedido y un enlace `wa.me` cuyo texto contiene ese número → en el panel el pedido aparece «por confirmar» con 115 min. |
| F2 | B4 | Panel → Nuevo pedido (Instagram) → ramo → guardar → Confirmar → Empezar preparación → Marcar listo → «¿Qué usaste?» con 20 rojos → la existencia de rojo baja a 90 y el pedido muestra su costo real. |
| F3 | C2 | Crear promo «Q20 en arreglos» → el catálogo muestra Q 125.00 con precio anterior tachado → el pedido creado desde el carrito guarda Q125.00. |
| F4 | C2 | Activar popup → aparece en inicio tras su retardo → Esc lo cierra y el foco vuelve a la página → recargar → no reaparece. |
| F5 | C3 | `/eventos` → 30 piezas para una fecha → ver estimado y factibilidad → enviar → aparece en el panel → Convertir en pedido. |
| F6 | A4 | Muestrario `/admin/_kit` → subir un PNG recortado de prueba en carpeta `variants` → progreso → la foto se ve servida desde el S3 local, en WebP y con transparencia; subir un JPEG opaco en `variants` muestra el mensaje de rechazo de §5. (Ejercita el `ImageCodec` real, la firma y el proxy de `/api`.) |
| F7 | A2 | Muestrario `/admin/_kit` → abrir la hoja (`sheet`) → Esc la cierra → el foco vuelve al botón que la abrió; lo mismo con `confirm-dialog`. |

### 9.7 Móvil y seguridad (Oleada 4)

| ID | Dueño | Prueba |
| --- | --- | --- |
| MOB-01 | D2 | A 360 px, ninguna ruta nueva tiene scroll horizontal (`scrollWidth ≤ clientWidth`). |
| MOB-02 | D2 | A 390 px, todo botón, enlace y control de las rutas nuevas mide al menos 44×44 px. |
| MOB-03 | D2 | En builder, Mesa de receta y detalle de pedido, la acción principal queda dentro del viewport sin desplazarse. |
| SEC-01 | D1 | Con la clave anon, `select` directo a cada tabla devuelve 0 filas o error (lista completa de tablas). |
| SEC-02 | D1 | Un sexto pedido del mismo teléfono en una hora es rechazado; también el sexto desde la misma IP con teléfonos distintos. |
| SEC-03 | D1 | El honeypot relleno hace que el pedido no se guarde y la respuesta no lo revele. |
| SEC-04 | D1 | `manager` no puede ejecutar ninguna RPC marcada como admin en §4.1. |
| SEC-05 | D1 | El build de producción no contiene `SERVICE_ROLE`, claves de R2 ni rutas `private/` (gitleaks + búsqueda). |
| SEC-06 | D1 | Las respuestas del sitio incluyen CSP, `X-Content-Type-Options`, `Referrer-Policy` y `frame-ancestors 'none'`. |

## 10. Verificación final

- `pnpm test`, `pnpm run test:api`, `pnpm run db:test`, `pnpm run typecheck:api`, `pnpm run build`, `pnpm run verify:public-build`, `pnpm run verify:tokens`, `pnpm run verify:migrations`, `pnpm run verify:flows` en verde, en local y en CI (el CI corre en `feat/**` y en `main`).
- Diff visual contra las capturas de la Oleada 0 en las páginas públicas ya aprobadas: sin cambios no intencionados.
- Lighthouse móvil en inicio, catálogo, builder y Hoy.
- Recorrido completo en staging desde un teléfono real con el guion del jurado, incluyendo subir una foto recortada a R2 y verla en el builder.

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Alcance grande | Orden de recorte si hace falta: servicio de eventos por volumen → estadística anual → popup (queda la banda) → paso a tokens del SCSS público. El núcleo (recetas, costos, capacidad, ramo, existencias) no se recorta. |
| Fotos recortadas tarde o disparejas | El builder es dirigido por datos: solo muestra variantes con foto. El recorte automático de margen iguala la escala. La demo necesita 12 fotos. |
| Motor duplicado TS/SQL diverge | Casos dorados compartidos (D-22, DB-14, DB-40) generados desde los mismos JSON (`db:golden`) y en CI; SQL es la autoridad. |
| Agentes terminan a ciegas | Pruebas escritas antes por otro agente, con valores exactos y contra contratos ya fijados (tipos de §4.2, firmas de §4.1, contrato de interfaz de §7.5); no se pueden modificar. |
| Git sin historial | Oleada 0 lo resuelve antes de tocar código, con confirmación del usuario. |
| Un paquete rompe lo del anterior | Trabajo secuencial; esquema, firmas y tipos fijos desde las Oleadas 0–1; una función SQL = un archivo dueño, con ganchos (`verify:migrations`); propiedad de archivos disjunta. |
| R2 sin credenciales durante el desarrollo | SeaweedFS local con `R2_ENDPOINT` (§4.3, probado); las pruebas M-01..11 no necesitan red. |
| La nube se comporta distinto que lo local (R2, CSP, Functions) | Despliegue esqueleto al cerrar la Oleada 1, no al final. Sin probar todavía: si R2 rechaza el parámetro de checksum y si la CSP necesita `'unsafe-inline'` en estilos. |
| El proyecto gratis de Supabase se pausa tras unos 7 días sin uso | Reanudarlo desde el panel de Supabase antes de cada sesión en la nube y la víspera de la demo. |
| Pedidos falsos tapan la agenda | Tope de apartado sin confirmar (§3), cancelar libera al instante, `order_guard` por teléfono e IP en D1. |
| Regresiones en lo ya aprobado | No se reescribe SCSS público hasta D3 y con diff visual. |
