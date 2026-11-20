// `pnpm run db:golden` — genera el SQL pgTAP de los casos dorados (PLAN.md §9.1,
// supabase/tests/fixtures/README.md). Dueño: T (paso 0-T). Prueba del catálogo: nadie más
// la edita (§7.2 regla 11).
//
// Uso: node scripts/gen-golden-sql.mjs [--check] [--fixtures <carpeta>] [--out <carpeta>]
//   (por defecto supabase/tests/fixtures → supabase/tests/generated)
//   Sin --check escribe `golden_<archivo>.sql` por cada JSON que exista (costing,
//   promotions, bouquet) y borra los `golden_*.sql` cuyo JSON ya no existe.
//   Con --check no escribe nada: sale con 1 si lo generado no coincide con lo que hay en
//   disco (CI corre `db:test` y luego revisa que `supabase/tests/generated` no cambió).
//   Sin fixtures: 0 archivos, no crea la carpeta, sale con 0.
//
// Salida determinista: mismo JSON → mismos bytes (orden del arreglo, claves en orden fijo,
// uuids derivados con sha1, sin fechas ni rutas absolutas).
//
// Por cada caso (README regla 9), dentro de un solo `begin … rollback` por archivo:
//   una función temporal `pg_temp.golden_<n>()` abre un bloque plpgsql (subtransacción) →
//   vacía las tablas que toca (`truncate … cascade`) → escribe ajustes en
//   `business_settings` → inserta el `input` como filas con los ids tal cual → llama a la
//   función SQL y guarda su fila como jsonb → lanza SQLSTATE `LG000`, que deshace todo lo
//   del caso (rollback de la subtransacción) y devuelve el jsonb → fuera del bloque, compara
//   cada campo de `expected` con pgTAP `is()` (dinero redondeado a 2; minutos y piezas
//   exactos; null solo igual a null).
//   No se usa `begin/rollback` ni `rollback to savepoint` por caso porque pgTAP guarda sus
//   resultados en la transacción: deshacerla borraría también los `ok`. Cualquier otro error
//   (función sin implementar, columna que no existe) no se atrapa y hace fallar el archivo.
//   `suggestedPrice` no tiene función SQL en §4.1 (solo TS, D-22); aquí no se compara.
//
// ESQUEMA PROVISIONAL. Las tablas y columnas de §4.1 las fija A1 (Oleada 1). Los nombres de
// abajo (`SCHEMA`) son la lectura de §4.1 hecha en la Oleada 0; T los ajusta al esquema real
// de A1 en el paso 0 de A3, cuando escribe los JSON (D-22), y antes de eso no se ejecutan
// porque no hay fixtures. Todo lo que depende del esquema está en `SCHEMA`.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argValue = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? resolve(process.argv[index + 1]) : fallback;
};
const fixturesDir = argValue('--fixtures', join(root, 'supabase/tests/fixtures'));
const outDir = argValue('--out', join(root, 'supabase/tests/generated'));
const check = process.argv.includes('--check');
const show = (path) => (relative(root, path).startsWith('..') ? path : relative(root, path));

// ---------- literales SQL ----------
class Sql {
  constructor(text) {
    this.text = text;
  }
}
const raw = (text) => new Sql(text);
const text = (value) =>
  value === null || value === undefined
    ? raw('null')
    : raw(`'${String(value).replace(/'/g, "''")}'`);
const num = (value) => {
  if (value === null || value === undefined) return raw('null');
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`número inválido: ${JSON.stringify(value)}`);
  return raw(String(value));
};
const uuid = (value) =>
  value === null || value === undefined ? raw('null::uuid') : raw(`'${value}'::uuid`);
const bool = (value) => raw(value ? 'true' : 'false');
const date = (value) => raw(`'${value}'::date`);
const timestamptz = (value) =>
  value === null || value === undefined ? raw('null::timestamptz') : raw(`'${value}'::timestamptz`);
const jsonb = (value) => raw(`'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`);
const textArray = (values) =>
  raw(
    values.length
      ? `array[${values.map((value) => text(value).text).join(', ')}]::text[]`
      : `'{}'::text[]`,
  );
const lit = (value) => (value instanceof Sql ? value.text : text(value).text);
// Producto exacto con hasta 4 decimales (evita 0.30000000000000004).
const times = (a, b) => Number((a * b).toFixed(6));
// uuid determinista para filas auxiliares que el fixture no nombra (p. ej. el diseño de una variante).
function derivedUuid(seed) {
  const hex = createHash('sha1').update(`lirios-golden:${seed}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ---------- ESQUEMA PROVISIONAL (ajustar al de A1) ----------
const SCHEMA = {
  settings: {
    table: 'public.business_settings',
    costing: (ctx) => ({ hourly_rate: num(ctx.hourlyRate), overhead_pct: num(ctx.overheadPct) }),
    bouquet: (prices) => ({
      assembly_fee: num(prices.assemblyFee),
      assembly_minutes: num(prices.assemblyMinutes),
    }),
  },
  colors: {
    table: 'public.colors',
    row: (id) => ({ id: uuid(id), name: text(`Color ${id.slice(-12)}`) }),
  },
  materials: {
    table: 'public.materials',
    row: (id, slot) => ({
      id: uuid(id),
      name: text(`Material ${id.slice(-12)}`),
      unit: text('pieza'),
      family: text(slot?.family ?? null),
      color_id: uuid(slot?.colorId ?? null),
    }),
  },
  lots: {
    table: 'public.material_lots',
    // README regla 5: cantidad comprada = saldo; costo total = saldo × costo unitario.
    row: (materialId, lot) => ({
      id: uuid(lot.lotId),
      material_id: uuid(materialId),
      purchased_at: date(lot.purchasedAt),
      quantity: num(lot.remaining),
      remaining: num(lot.remaining),
      unit_cost: num(lot.unitCost),
      total_cost: num(times(lot.remaining, lot.unitCost)),
    }),
  },
  recipes: {
    table: 'public.recipes',
    row: (recipe) => ({
      id: uuid(recipe.id),
      kind: text(recipe.kind),
      name: text(`Receta ${recipe.id.slice(-12)}`),
      minutes: num(recipe.minutes),
    }),
  },
  recipeItems: {
    table: 'public.recipe_items',
    row: (recipeId, item, index) => ({
      recipe_id: uuid(recipeId),
      material_id: uuid(item.materialId),
      slot_family: text(item.slotFamily),
      qty: num(item.qty),
      waste_pct: num(item.wastePct),
      sort_order: num(index),
    }),
  },
  recipeComponents: {
    table: 'public.recipe_components',
    row: (recipeId, component, index) => ({
      recipe_id: uuid(recipeId),
      component_recipe_id: uuid(component.recipeId),
      color_id: uuid(component.colorId),
      qty: num(component.qty),
      sort_order: num(index),
    }),
  },
  products: {
    table: 'public.products', // tabla de la migración inicial (columnas conocidas)
    row: (line) => ({
      id: text(line.id),
      slug: text(line.id),
      name: text(`Producto ${line.id}`),
      category: text(line.category ?? 'arrangement'),
      price: num(line.unitPrice),
      status: text('active'),
    }),
  },
  groups: {
    table: 'public.product_groups',
    row: (id) => ({ id: uuid(id), name: text(`Grupo ${id.slice(-12)}`) }),
  },
  groupItems: {
    table: 'public.product_group_items',
    row: (groupId, productId) => ({ group_id: uuid(groupId), product_id: text(productId) }),
  },
  promotions: {
    table: 'public.promotions',
    row: (promo) => ({
      id: uuid(promo.id),
      name: text(`Promo ${promo.id.slice(-12)}`),
      type: text(promo.type),
      value: num(promo.value),
      scope: text(promo.scope),
      category: text(promo.category),
      group_id: uuid(promo.groupId),
      product_ids: textArray(promo.productIds),
      starts_at: timestamptz(promo.startsAt),
      ends_at: timestamptz(promo.endsAt),
      active: bool(promo.active),
      applies_to_builder: bool(promo.appliesToBuilder),
    }),
  },
  // §4.1: el precio vive en flower_designs; una variante = diseño × color. Un diseño por variante.
  designs: {
    table: 'public.flower_designs',
    row: (variantId, entry) => ({
      id: uuid(derivedUuid(`design:${variantId}`)),
      name: text(`Diseño ${variantId.slice(-12)}`),
      price: num(entry.price),
      recipe_id: uuid(derivedUuid(`recipe:${variantId}`)),
    }),
  },
  variants: {
    table: 'public.flower_variants',
    row: (variantId) => ({
      id: uuid(variantId),
      design_id: uuid(derivedUuid(`design:${variantId}`)),
      color_id: uuid(derivedUuid(`color:${variantId}`)),
      active: bool(true),
    }),
  },
  addons: {
    table: 'public.addons',
    row: (addonId, entry, kind) => ({
      id: uuid(addonId),
      name: text(`Complemento ${addonId.slice(-12)}`),
      kind: text(kind),
      price: num(entry.price),
      recipe_id: uuid(derivedUuid(`recipe:${addonId}`)),
    }),
  },
  // Tablas que vacía cada tipo de caso (truncate … cascade, dentro de la subtransacción).
  truncate: {
    costing: [
      'public.recipe_components',
      'public.recipe_items',
      'public.recipes',
      'public.material_lots',
      'public.materials',
      'public.colors',
    ],
    promotions: [
      'public.promotions',
      'public.product_group_items',
      'public.product_groups',
      'public.products',
    ],
    bouquet: [
      'public.promotions',
      'public.addons',
      'public.flower_variants',
      'public.flower_designs',
      'public.recipes',
      'public.colors',
    ],
  },
};

// ---------- validación de fixtures (README) ----------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PRODUCT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CASE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?[+-]\d{2}:\d{2}$/;
function validator(where) {
  const problems = [];
  const at = (path, message) => problems.push(`${where}${path}: ${message}`);
  return {
    problems,
    id(path, value, nullable = false) {
      if (value === null && nullable) return;
      if (typeof value !== 'string' || !UUID.test(value))
        at(path, `uuid en minúsculas esperado, hay ${JSON.stringify(value)}`);
    },
    productId(path, value) {
      if (typeof value !== 'string' || !PRODUCT_ID.test(value))
        at(path, `id de producto en kebab-case esperado, hay ${JSON.stringify(value)}`);
    },
    number(path, value, nullable = false) {
      if (value === null && nullable) return;
      if (typeof value !== 'number' || !Number.isFinite(value))
        at(path, `número JSON esperado, hay ${JSON.stringify(value)}`);
    },
    oneOf(path, value, options) {
      if (!options.includes(value))
        at(path, `uno de ${options.join(' | ')} esperado, hay ${JSON.stringify(value)}`);
    },
    match(path, value, pattern, label, nullable = false) {
      if (value === null && nullable) return;
      if (typeof value !== 'string' || !pattern.test(value))
        at(path, `${label} esperado, hay ${JSON.stringify(value)}`);
    },
    keys(path, value, allowed, required = allowed) {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return at(path, 'objeto esperado');
      for (const key of required) if (!(key in value)) at(`${path}.${key}`, 'falta');
      for (const key of Object.keys(value))
        if (!allowed.includes(key)) at(`${path}.${key}`, 'campo extra (README: sin campos extra)');
    },
    array(path, value) {
      if (!Array.isArray(value)) {
        at(path, 'arreglo esperado');
        return [];
      }
      return value;
    },
  };
}
function validateRecipe(v, path, recipe) {
  v.keys(path, recipe, ['id', 'kind', 'minutes', 'items', 'components']);
  v.id(`${path}.id`, recipe?.id);
  v.oneOf(`${path}.kind`, recipe?.kind, ['flower', 'addon', 'arrangement']);
  v.number(`${path}.minutes`, recipe?.minutes);
  v.array(`${path}.items`, recipe?.items).forEach((item, index) => {
    const p = `${path}.items[${index}]`;
    v.keys(p, item, ['materialId', 'slotFamily', 'qty', 'wastePct']);
    v.id(`${p}.materialId`, item?.materialId, true);
    if ((item?.materialId === null) === (item?.slotFamily === null))
      v.problems.push(`${p}: exactamente uno de materialId o slotFamily`);
    v.number(`${p}.qty`, item?.qty);
    v.number(`${p}.wastePct`, item?.wastePct);
  });
  v.array(`${path}.components`, recipe?.components).forEach((component, index) => {
    const p = `${path}.components[${index}]`;
    v.keys(p, component, ['recipeId', 'colorId', 'qty']);
    v.id(`${p}.recipeId`, component?.recipeId);
    v.id(`${p}.colorId`, component?.colorId, true);
    v.number(`${p}.qty`, component?.qty);
  });
}
function validatePromo(v, path, promo) {
  v.keys(path, promo, [
    'id',
    'type',
    'value',
    'scope',
    'category',
    'groupId',
    'productIds',
    'startsAt',
    'endsAt',
    'active',
    'appliesToBuilder',
  ]);
  v.id(`${path}.id`, promo?.id);
  v.oneOf(`${path}.type`, promo?.type, ['percent', 'fixed']);
  v.number(`${path}.value`, promo?.value);
  v.oneOf(`${path}.scope`, promo?.scope, ['all', 'category', 'group', 'products']);
  v.oneOf(`${path}.category`, promo?.category, ['arrangement', 'single-flower', null]);
  v.id(`${path}.groupId`, promo?.groupId, true);
  v.array(`${path}.productIds`, promo?.productIds).forEach((id, index) =>
    v.productId(`${path}.productIds[${index}]`, id),
  );
  v.match(`${path}.startsAt`, promo?.startsAt, INSTANT, 'ISO 8601 con desfase');
  v.match(`${path}.endsAt`, promo?.endsAt, INSTANT, 'ISO 8601 con desfase', true);
  v.oneOf(`${path}.active`, promo?.active, [true, false]);
  v.oneOf(`${path}.appliesToBuilder`, promo?.appliesToBuilder, [true, false]);
}
const VALIDATE = {
  costing(v, { input, expected }) {
    v.keys('.input', input, ['recipe', 'ctx', 'pricing'], ['recipe', 'ctx']);
    validateRecipe(v, '.input.recipe', input?.recipe);
    const ctx = input?.ctx;
    v.keys('.input.ctx', ctx, [
      'colorId',
      'lots',
      'slotMaterials',
      'recipes',
      'hourlyRate',
      'overheadPct',
    ]);
    v.id('.input.ctx.colorId', ctx?.colorId, true);
    for (const [materialId, layers] of Object.entries(ctx?.lots ?? {})) {
      v.id(`.input.ctx.lots[${materialId}]`, materialId);
      v.array(`.input.ctx.lots[${materialId}]`, layers).forEach((lot, index) => {
        const p = `.input.ctx.lots[${materialId}][${index}]`;
        v.keys(p, lot, ['lotId', 'purchasedAt', 'remaining', 'unitCost']);
        v.id(`${p}.lotId`, lot?.lotId);
        v.match(`${p}.purchasedAt`, lot?.purchasedAt, DAY, "'YYYY-MM-DD'");
        v.number(`${p}.remaining`, lot?.remaining);
        v.number(`${p}.unitCost`, lot?.unitCost);
      });
    }
    for (const [family, byColor] of Object.entries(ctx?.slotMaterials ?? {})) {
      for (const [colorId, materialId] of Object.entries(byColor ?? {})) {
        v.id(`.input.ctx.slotMaterials.${family}[color]`, colorId);
        v.id(`.input.ctx.slotMaterials.${family}[${colorId}]`, materialId);
      }
    }
    for (const [id, recipe] of Object.entries(ctx?.recipes ?? {})) {
      validateRecipe(v, `.input.ctx.recipes[${id}]`, recipe);
      if (recipe?.id !== id)
        v.problems.push(`.input.ctx.recipes[${id}]: la clave debe ser el id de la receta`);
    }
    v.number('.input.ctx.hourlyRate', ctx?.hourlyRate);
    v.number('.input.ctx.overheadPct', ctx?.overheadPct);
    if (input?.pricing !== undefined) {
      v.keys('.input.pricing', input.pricing, ['marginTarget', 'roundTo']);
      v.number('.input.pricing.marginTarget', input.pricing?.marginTarget);
      v.number('.input.pricing.roundTo', input.pricing?.roundTo);
    }
    const fields = [
      'materials',
      'labor',
      'total',
      'materialsReplacement',
      'totalReplacement',
      'piecesAtCurrentCost',
    ];
    v.keys(
      '.expected',
      expected,
      input?.pricing !== undefined ? [...fields, 'suggestedPrice'] : fields,
    );
    for (const field of fields)
      v.number(`.expected.${field}`, expected?.[field], field === 'piecesAtCurrentCost');
    if (input?.pricing !== undefined)
      v.number('.expected.suggestedPrice', expected?.suggestedPrice);
  },
  promotions(v, { input, expected }) {
    v.keys('.input', input, ['line', 'promos', 'now']);
    const line = input?.line;
    v.keys('.input.line', line, ['kind', 'id', 'category', 'groupIds', 'unitPrice']);
    v.oneOf('.input.line.kind', line?.kind, ['product', 'bouquet']);
    if (line?.kind === 'product') v.productId('.input.line.id', line?.id);
    else if (line?.id !== null) v.problems.push('.input.line.id: null esperado para un ramo');
    v.oneOf('.input.line.category', line?.category, ['arrangement', 'single-flower', null]);
    v.array('.input.line.groupIds', line?.groupIds).forEach((id, index) =>
      v.id(`.input.line.groupIds[${index}]`, id),
    );
    v.number('.input.line.unitPrice', line?.unitPrice);
    v.array('.input.promos', input?.promos).forEach((promo, index) =>
      validatePromo(v, `.input.promos[${index}]`, promo),
    );
    v.match('.input.now', input?.now, INSTANT, 'ISO 8601 con desfase');
    v.keys('.expected', expected, ['price', 'promoId']);
    v.number('.expected.price', expected?.price);
    v.id('.expected.promoId', expected?.promoId, true);
  },
  bouquet(v, { input, expected }) {
    v.keys('.input', input, ['spec', 'prices', 'promos', 'now']);
    const spec = input?.spec;
    v.keys('.input.spec', spec, ['flowers', 'wrapId', 'extras']);
    v.array('.input.spec.flowers', spec?.flowers).forEach((flower, index) => {
      v.keys(`.input.spec.flowers[${index}]`, flower, ['variantId', 'qty']);
      v.id(`.input.spec.flowers[${index}].variantId`, flower?.variantId);
      v.number(`.input.spec.flowers[${index}].qty`, flower?.qty);
    });
    v.id('.input.spec.wrapId', spec?.wrapId, true);
    v.array('.input.spec.extras', spec?.extras).forEach((extra, index) => {
      v.keys(`.input.spec.extras[${index}]`, extra, ['addonId', 'qty']);
      v.id(`.input.spec.extras[${index}].addonId`, extra?.addonId);
      v.number(`.input.spec.extras[${index}].qty`, extra?.qty);
    });
    const prices = input?.prices;
    v.keys('.input.prices', prices, ['variants', 'addons', 'assemblyFee', 'assemblyMinutes']);
    for (const group of ['variants', 'addons']) {
      for (const [id, entry] of Object.entries(prices?.[group] ?? {})) {
        v.id(`.input.prices.${group}[${id}]`, id);
        v.keys(`.input.prices.${group}[${id}]`, entry, ['price', 'minutes']);
        v.number(`.input.prices.${group}[${id}].price`, entry?.price);
        v.number(`.input.prices.${group}[${id}].minutes`, entry?.minutes);
      }
    }
    v.number('.input.prices.assemblyFee', prices?.assemblyFee);
    v.number('.input.prices.assemblyMinutes', prices?.assemblyMinutes);
    v.array('.input.promos', input?.promos).forEach((promo, index) =>
      validatePromo(v, `.input.promos[${index}]`, promo),
    );
    v.match('.input.now', input?.now, INSTANT, 'ISO 8601 con desfase');
    v.keys('.expected', expected, ['subtotal', 'discount', 'total', 'minutes']);
    for (const field of ['subtotal', 'discount', 'total', 'minutes'])
      v.number(`.expected.${field}`, expected?.[field]);
  },
};

// ---------- SQL por caso ----------
function insert(spec, rows) {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  const values = rows.map((row) => `  (${columns.map((column) => lit(row[column])).join(', ')})`);
  return [`insert into ${spec.table} (${columns.join(', ')}) values\n${values.join(',\n')};`];
}
function update(table, values) {
  return [
    `update ${table} set ${Object.entries(values)
      .map(([column, value]) => `${column} = ${lit(value)}`)
      .join(', ')} where true;`,
  ];
}
const truncate = (tables) => [`truncate table ${tables.join(', ')} cascade;`];
const field = (column) => `(select r ->> '${column}' from golden_result)`;
const money = (column) => `round(${field(column)}::numeric, 2)`;
const exact = (column) => `${field(column)}::numeric`;
const expectNumber = (value, decimals) =>
  value === null
    ? 'null::numeric'
    : `${decimals === undefined ? value : value.toFixed(decimals)}::numeric`;
function is(actual, expected, label) {
  return `select is(${actual}, ${expected}, ${text(label).text});`;
}
const uniqueSorted = (values) => [...new Set(values)].sort();

function promoRows(promos) {
  const groups = uniqueSorted(promos.map((promo) => promo.groupId).filter(Boolean));
  return { groups, rows: promos.map((promo) => SCHEMA.promotions.row(promo)) };
}

const BUILD = {
  costing({ id, input, expected }) {
    const { recipe, ctx } = input;
    const recipes = [
      recipe,
      ...Object.keys(ctx.recipes)
        .sort()
        .map((key) => ctx.recipes[key]),
    ].filter((entry, index, all) => all.findIndex((other) => other.id === entry.id) === index);
    const slotOf = new Map();
    for (const family of Object.keys(ctx.slotMaterials).sort()) {
      for (const colorId of Object.keys(ctx.slotMaterials[family]).sort()) {
        slotOf.set(ctx.slotMaterials[family][colorId], { family, colorId });
      }
    }
    const materialIds = uniqueSorted([
      ...Object.keys(ctx.lots),
      ...slotOf.keys(),
      ...recipes.flatMap((entry) => entry.items.map((item) => item.materialId).filter(Boolean)),
    ]);
    const colorIds = uniqueSorted(
      [
        ctx.colorId,
        ...[...slotOf.values()].map((slot) => slot.colorId),
        ...recipes.flatMap((entry) => entry.components.map((c) => c.colorId)),
      ].filter(Boolean),
    );
    const lots = Object.keys(ctx.lots)
      .sort()
      .flatMap((materialId) => ctx.lots[materialId].map((lot) => SCHEMA.lots.row(materialId, lot)));
    const label = (field) => `${id} · ${field}`;
    return {
      setup: [
        ...truncate(SCHEMA.truncate.costing),
        ...update(SCHEMA.settings.table, SCHEMA.settings.costing(ctx)),
        ...insert(
          SCHEMA.colors,
          colorIds.map((colorId) => SCHEMA.colors.row(colorId)),
        ),
        ...insert(
          SCHEMA.materials,
          materialIds.map((materialId) => SCHEMA.materials.row(materialId, slotOf.get(materialId))),
        ),
        ...insert(SCHEMA.lots, lots),
        ...insert(
          SCHEMA.recipes,
          recipes.map((entry) => SCHEMA.recipes.row(entry)),
        ),
        ...insert(
          SCHEMA.recipeItems,
          recipes.flatMap((entry) =>
            entry.items.map((item, index) => SCHEMA.recipeItems.row(entry.id, item, index)),
          ),
        ),
        ...insert(
          SCHEMA.recipeComponents,
          recipes.flatMap((entry) =>
            entry.components.map((component, index) =>
              SCHEMA.recipeComponents.row(entry.id, component, index),
            ),
          ),
        ),
      ],
      call: `select * from public.recipe_cost(${uuid(recipe.id).text}, ${uuid(ctx.colorId).text})`,
      checks: [
        is(money('materials'), expectNumber(expected.materials, 2), label('materials')),
        is(money('labor'), expectNumber(expected.labor, 2), label('labor')),
        is(money('total'), expectNumber(expected.total, 2), label('total')),
        is(
          money('materials_replacement'),
          expectNumber(expected.materialsReplacement, 2),
          label('materialsReplacement'),
        ),
        is(
          money('total_replacement'),
          expectNumber(expected.totalReplacement, 2),
          label('totalReplacement'),
        ),
        is(
          exact('pieces_at_current_cost'),
          expectNumber(expected.piecesAtCurrentCost),
          label('piecesAtCurrentCost'),
        ),
      ],
    };
  },
  promotions({ id, input, expected }) {
    const { line, promos, now } = input;
    const { groups: promoGroups, rows } = promoRows(promos);
    const groups = uniqueSorted([...promoGroups, ...line.groupIds]);
    const productIds = uniqueSorted(
      promos.flatMap((promo) => promo.productIds).filter((productId) => productId !== line.id),
    );
    const products = [
      ...(line.kind === 'product' ? [SCHEMA.products.row(line)] : []),
      ...productIds.map((productId) =>
        SCHEMA.products.row({ id: productId, category: 'arrangement', unitPrice: 0 }),
      ),
    ];
    const label = (field) => `${id} · ${field}`;
    return {
      setup: [
        ...truncate(SCHEMA.truncate.promotions),
        ...insert(SCHEMA.products, products),
        ...insert(
          SCHEMA.groups,
          groups.map((groupId) => SCHEMA.groups.row(groupId)),
        ),
        ...insert(
          SCHEMA.groupItems,
          line.kind === 'product'
            ? [...line.groupIds].sort().map((groupId) => SCHEMA.groupItems.row(groupId, line.id))
            : [],
        ),
        ...insert(SCHEMA.promotions, rows),
      ],
      call: `select * from public.effective_price(${text(line.kind).text}, ${text(line.id).text}, ${num(line.unitPrice).text}, ${timestamptz(now).text})`,
      checks: [
        is(money('price'), expectNumber(expected.price, 2), label('price')),
        is(`${field('promo_id')}::uuid`, uuid(expected.promoId).text, label('promoId')),
      ],
    };
  },
  bouquet({ id, input, expected }) {
    const { spec, prices, promos, now } = input;
    const { groups, rows } = promoRows(promos);
    const variantIds = Object.keys(prices.variants).sort();
    const addonIds = Object.keys(prices.addons).sort();
    const recipes = [
      ...variantIds.map((variantId) => ({
        id: derivedUuid(`recipe:${variantId}`),
        kind: 'flower',
        minutes: prices.variants[variantId].minutes,
      })),
      ...addonIds.map((addonId) => ({
        id: derivedUuid(`recipe:${addonId}`),
        kind: 'addon',
        minutes: prices.addons[addonId].minutes,
      })),
    ];
    const label = (field) => `${id} · ${field}`;
    return {
      setup: [
        ...truncate([...SCHEMA.truncate.bouquet, ...(groups.length ? [SCHEMA.groups.table] : [])]),
        ...update(SCHEMA.settings.table, SCHEMA.settings.bouquet(prices)),
        ...insert(
          SCHEMA.colors,
          variantIds.map((variantId) => SCHEMA.colors.row(derivedUuid(`color:${variantId}`))),
        ),
        ...insert(
          SCHEMA.recipes,
          recipes.map((recipe) => SCHEMA.recipes.row(recipe)),
        ),
        ...insert(
          SCHEMA.designs,
          variantIds.map((variantId) => SCHEMA.designs.row(variantId, prices.variants[variantId])),
        ),
        ...insert(
          SCHEMA.variants,
          variantIds.map((variantId) => SCHEMA.variants.row(variantId)),
        ),
        ...insert(
          SCHEMA.addons,
          addonIds.map((addonId) =>
            SCHEMA.addons.row(
              addonId,
              prices.addons[addonId],
              addonId === spec.wrapId ? 'wrap' : 'extra',
            ),
          ),
        ),
        ...insert(
          SCHEMA.groups,
          groups.map((groupId) => SCHEMA.groups.row(groupId)),
        ),
        ...insert(SCHEMA.promotions, rows),
      ],
      call: `select * from public.bouquet_quote(${jsonb(spec).text}, ${timestamptz(now).text})`,
      checks: [
        is(money('subtotal'), expectNumber(expected.subtotal, 2), label('subtotal')),
        is(money('discount'), expectNumber(expected.discount, 2), label('discount')),
        is(money('total'), expectNumber(expected.total, 2), label('total')),
        is(exact('minutes'), expectNumber(expected.minutes), label('minutes')),
      ],
    };
  },
};

// ---------- principal ----------
const KINDS = ['costing', 'promotions', 'bouquet'];
const problems = [];
const outputs = new Map(); // nombre → contenido
const caseIds = new Map();

for (const kind of KINDS) {
  const source = join(fixturesDir, `${kind}.json`);
  if (!existsSync(source)) continue;
  let cases;
  try {
    cases = JSON.parse(readFileSync(source, 'utf8'));
  } catch (error) {
    problems.push(`${show(source)}: JSON inválido (${error.message})`);
    continue;
  }
  if (!Array.isArray(cases)) {
    problems.push(`${show(source)}: debe ser un arreglo de casos`);
    continue;
  }
  const blocks = [];
  let tests = 0;
  cases.forEach((entry, index) => {
    const where = `${kind}.json[${index}]`;
    const v = validator(where);
    v.keys('', entry, ['id', 'description', 'input', 'expected'], ['id', 'input', 'expected']);
    v.match('.id', entry?.id, CASE_ID, 'id en kebab-case');
    if (entry?.description !== undefined && typeof entry.description !== 'string')
      v.problems.push(`${where}.description: texto esperado`);
    if (typeof entry?.id === 'string') {
      if (caseIds.has(entry.id))
        v.problems.push(
          `${where}.id: «${entry.id}» repetido (ya está en ${caseIds.get(entry.id)})`,
        );
      caseIds.set(entry.id, where);
    }
    if (!v.problems.length) VALIDATE[kind](v, entry);
    if (v.problems.length) {
      problems.push(
        ...v.problems.map((problem) => (problem.startsWith('.') ? `${where}${problem}` : problem)),
      );
      return;
    }
    const { setup, call, checks } = BUILD[kind](entry);
    tests += checks.length;
    const fn = `pg_temp.golden_${index + 1}`;
    blocks.push(
      [
        `-- ${entry.id}${entry.description ? `: ${entry.description.replace(/\s*\n\s*/g, ' ')}` : ''}`,
        `create function ${fn}() returns jsonb language plpgsql as $golden$`,
        'declare result jsonb;',
        'begin',
        ...setup.map((statement) => statement.replace(/^/gm, '  ')),
        `  select to_jsonb(golden_row) into result from (${call}) golden_row;`,
        "  raise sqlstate 'LG000';",
        "exception when sqlstate 'LG000' then",
        '  return result;',
        'end $golden$;',
        `create temp table golden_result as select ${fn}() as r;`,
        ...checks,
        'drop table golden_result;',
      ].join('\n'),
    );
  });
  if (!blocks.length) continue;
  outputs.set(
    `golden_${kind}.sql`,
    [
      `-- GENERADO por scripts/gen-golden-sql.mjs desde supabase/tests/fixtures/${kind}.json. No editar a mano:`,
      '-- cambiar el JSON (solo T) y correr `pnpm run db:golden`. PLAN.md §9.1.',
      'begin;',
      'create extension if not exists pgtap with schema extensions;',
      `select plan(${tests});`,
      '',
      blocks.join('\n\n'),
      '',
      'select * from finish();',
      'rollback;',
      '',
    ].join('\n'),
  );
}

if (problems.length) {
  console.error(
    `db:golden FALLA: ${problems.length} problema(s) en los fixtures (supabase/tests/fixtures/README.md):`,
  );
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

const existing = existsSync(outDir)
  ? readdirSync(outDir).filter((name) => /^golden_.*\.sql$/.test(name))
  : [];
const stale = existing.filter((name) => !outputs.has(name));
const changed = [...outputs].filter(
  ([name, content]) =>
    !existing.includes(name) || readFileSync(join(outDir, name), 'utf8') !== content,
);

if (check) {
  if (stale.length || changed.length) {
    console.error(
      'db:golden --check FALLA: lo generado no coincide con lo que está en disco; corre `pnpm run db:golden`.',
    );
    for (const [name] of changed) console.error(`  desactualizado: ${show(join(outDir, name))}`);
    for (const name of stale) console.error(`  sobra: ${show(join(outDir, name))}`);
    process.exit(1);
  }
  console.log(`db:golden --check OK: ${outputs.size} archivo(s) al día.`);
  process.exit(0);
}

if (outputs.size) mkdirSync(outDir, { recursive: true });
for (const [name, content] of changed) writeFileSync(join(outDir, name), content);
for (const name of stale) rmSync(join(outDir, name));
const totalCases = caseIds.size;
console.log(
  `db:golden OK: ${totalCases} caso(s) → ${outputs.size} archivo(s) en ${show(outDir)}` +
    (changed.length || stale.length
      ? ` (${changed.length} escrito(s), ${stale.length} borrado(s))`
      : outputs.size
        ? ' (sin cambios)'
        : '') +
    '.',
);
