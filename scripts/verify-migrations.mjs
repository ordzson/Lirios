// `pnpm run verify:migrations` — reglas de migraciones de PLAN.md §4.1 y §7.2 regla 13.
// Dueño: T (paso 0-T). Es una prueba del catálogo: nadie más la edita (§7.2 regla 11).
//
// Uso: node scripts/verify-migrations.mjs [--dir <carpeta>]   (por defecto supabase/migrations)
//
// Reglas (cada error cita su número):
//   M1  Nombre `<12 dígitos>_<minúsculas_y_guiones_bajos>.sql`; prefijos únicos.
//   M2  La migración inicial existe y no se modifica (sha256 congelado; CRLF se normaliza).
//   M3  Los archivos que nombra §4.1 respetan el orden de §4.1 (el prefijo fija el orden de
//       aplicación). Un archivo que §4.1 no nombra solo da aviso.
//   M4  «El esquema es el contrato»: `create table`, `drop table` y `alter table … add/drop
//       column` solo en la inicial y en los dos archivos de esquema de A1
//       (`*_core_production.sql`, `*_core_commerce.sql`).
//   M5  Una función, un archivo dueño: una función (por esquema y nombre, sin importar los
//       argumentos) aparece definida en un solo archivo, o en dos si el primero es
//       `…0003_contract.sql` (gancho o stub + implementación). Las funciones de la inicial no
//       se redefinen, salvo las v2 de §4.1: `create_order` en `*_orders_flow.sql` (B4) y
//       `track_order` en `*_tracking.sql` (C1), una sola vez.
//   M6  Las funciones del contrato de §4.1 solo se implementan en el archivo de su paquete
//       (tabla CONTRACT abajo). Si existe `*_contract.sql`, trae el stub/gancho de todas las
//       del contrato menos `create_order` y `track_order`.
//   M7  Una vista, un archivo: cada vista se define en un solo archivo, y las de §4.1 en el
//       de su paquete.
//   M8  Toda función definida fuera de la inicial trae en el mismo archivo, después de
//       crearla, su `revoke … on function <nombre>(…) from public` (vale también
//       `revoke … on all functions in schema <esquema> from public` posterior).
//   M9  Permisos de ejecución (§4.1): las funciones anon de la lista blanca traen su
//       `grant execute … to anon`; las de staff y admin, su `grant execute … to
//       authenticated` (nunca a anon); las «interno» no se conceden a nadie. En ningún
//       archivo: `grant … to public`, `grant` a anon de una función fuera de la lista blanca,
//       `grant … on all functions …` a public/anon/authenticated, ni `alter default
//       privileges … grant … on functions` a esos roles.
//   M10 Toda función `security definer` fija `set search_path = public, pg_temp`.
//
// El SQL se lee con un analizador léxico mínimo: quita comentarios, cadenas y cuerpos
// `$tag$…$tag$` y parte en sentencias por `;`. No ejecuta nada ni necesita la base.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirArg = process.argv.indexOf('--dir');
const migrationsDir =
  dirArg >= 0 ? resolve(process.argv[dirArg + 1]) : join(root, 'supabase/migrations');

const INITIAL = {
  file: '202610030001_initial_store.sql',
  sha256: '72e3d0b608e931845a2dcb306c4702b14ac2a50347144cbad7f975c75f0be9a8',
};
const SCHEMA_FILES = ['initial_store', 'core_production', 'core_commerce'];
const CONTRACT_FILE = 'contract';
// §4.1, en orden de aplicación (sufijo sin prefijo → paquete).
const PLANNED = [
  ['initial_store', 'inicial'],
  ['core_production', 'A1'],
  ['core_commerce', 'A1'],
  ['contract', 'A1'],
  ['materials', 'B1'],
  ['capacity', 'B3'],
  ['costing', 'B2'],
  ['bouquet', 'C0'],
  ['orders_flow', 'B4'],
  ['tracking', 'C1'],
  ['promotions', 'C2'],
  ['events', 'C3'],
  ['stats', 'C4'],
  ['hardening', 'D1'],
];
// Contrato de RPC de §4.1: función → [rol, archivo dueño de la implementación].
const CONTRACT = {
  get_storefront: ['anon', 'contract'],
  storefront_products: ['internal', 'bouquet'],
  storefront_builder: ['internal', 'bouquet'],
  storefront_settings: ['internal', 'bouquet'],
  storefront_banners: ['internal', 'promotions'],
  storefront_seasons: ['internal', 'events'],
  get_delivery_estimate: ['anon', 'capacity'],
  delivery_estimate_at: ['internal', 'capacity'],
  create_order: ['anon', 'orders_flow'],
  create_bouquet_order: ['anon', 'bouquet'],
  bouquet_quote: ['internal', 'bouquet'],
  effective_price: ['internal', 'promotions'],
  order_guard: ['internal', 'hardening'],
  track_order: ['anon', 'tracking'],
  create_event_request: ['anon', 'events'],
  admin_receive_lot: ['staff', 'materials'],
  admin_adjust_stock: ['staff', 'materials'],
  consume_material_fifo: ['internal', 'materials'],
  recipe_cost: ['staff', 'costing'],
  admin_save_recipe: ['staff', 'costing'],
  admin_apply_suggested_prices: ['admin', 'costing'],
  admin_set_order_status: ['staff', 'orders_flow'],
  admin_create_order: ['staff', 'orders_flow'],
  admin_complete_production: ['staff', 'orders_flow'],
  admin_agenda: ['staff', 'capacity'],
  admin_promo_margin_preview: ['admin', 'promotions'],
  admin_convert_event_request: ['staff', 'events'],
  admin_stats: ['admin', 'stats'],
  admin_today: ['staff', 'stats'],
};
const NO_CONTRACT_STUB = new Set(['create_order', 'track_order']);
const INITIAL_V2 = { 'public.create_order': 'orders_flow', 'public.track_order': 'tracking' };
// Lo que anon puede ejecutar (§4.1): la lista blanca + is_staff/is_admin (RLS de la inicial).
const ANON_ALLOWED = new Set(
  [
    ...Object.entries(CONTRACT)
      .filter(([, [role]]) => role === 'anon')
      .map(([name]) => name),
    'is_staff',
    'is_admin',
  ].map((name) => `public.${name}`),
);
const VIEWS = {
  material_availability: 'materials',
  shopping_list: 'materials',
  costing_overview: 'costing',
  recipe_variance: 'orders_flow',
};

const errors = [];
const warnings = [];
const fail = (rule, where, message) => errors.push(`${rule} ${where}: ${message}`);
const suffixOf = (file) => file.replace(/^\d+_/, '').replace(/\.sql$/, '');

// ---------- analizador léxico ----------
function statements(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
    } else if (c === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < sql.length && depth) {
        if (sql[i] === '/' && sql[i + 1] === '*') ((depth += 1), (i += 2));
        else if (sql[i] === '*' && sql[i + 1] === '/') ((depth -= 1), (i += 2));
        else {
          if (sql[i] === '\n') out += '\n';
          i += 1;
        }
      }
      out += ' ';
    } else if (c === "'") {
      const escapes = /[eE]/.test(sql[i - 1] ?? '') && !/\w/.test(sql[i - 2] ?? '');
      i += 1;
      while (i < sql.length) {
        if (escapes && sql[i] === '\\') i += 2;
        else if (sql[i] === "'" && sql[i + 1] === "'") i += 2;
        else if (sql[i] === "'") break;
        else {
          if (sql[i] === '\n') out += '\n';
          i += 1;
        }
      }
      i += 1;
      out += "''";
    } else if (c === '"') {
      const end = sql.indexOf('"', i + 1);
      const stop = end < 0 ? sql.length : end + 1;
      out += sql.slice(i, stop);
      i = stop;
    } else if (c === '$' && !/\w/.test(sql[i - 1] ?? '')) {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (!tag) {
        out += c;
        i += 1;
        continue;
      }
      const end = sql.indexOf(tag[0], i + tag[0].length);
      const stop = end < 0 ? sql.length : end + tag[0].length;
      out += `$$${'\n'.repeat((sql.slice(i, stop).match(/\n/g) ?? []).length)}`;
      i = stop;
    } else {
      out += c;
      i += 1;
    }
  }
  const result = [];
  let line = 1;
  for (const chunk of out.split(';')) {
    const lead = chunk.match(/^\s*/)[0];
    const startLine = line + (lead.match(/\n/g) ?? []).length;
    line += (chunk.match(/\n/g) ?? []).length;
    const text = chunk.replace(/\s+/g, ' ').trim().toLowerCase();
    if (text) result.push({ text, line: startLine });
  }
  return result;
}

const IDENT = String.raw`(?:"[^"]+"|[a-z_][a-z0-9_$]*)`;
const QUALIFIED = String.raw`(?:${IDENT}\s*\.\s*)?${IDENT}`;
const unquote = (name) => name.replace(/"/g, '').replace(/\s+/g, '');
const qualify = (raw) => {
  const name = unquote(raw);
  return name.includes('.') ? name : `public.${name}`;
};
function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
const roleList = (text) =>
  splitTopLevel(text.replace(/\b(cascade|restrict|with grant option|granted by \S+)\b/g, ''))
    .map((role) => unquote(role))
    .filter(Boolean);
const functionNames = (list) =>
  splitTopLevel(list).map((item) => qualify(item.replace(/\(.*$/, '').trim()));

// ---------- archivos ----------
if (!existsSync(migrationsDir)) {
  console.error(`verify:migrations FALLA: no existe ${migrationsDir}`);
  process.exit(1);
}
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const inRepo = !relative(root, migrationsDir).startsWith('..');
const shown = (file) => (inRepo ? relative(root, join(migrationsDir, file)) : file);

const prefixes = new Map();
for (const file of files) {
  if (!/^\d{12}_[a-z0-9_]+\.sql$/.test(file))
    fail('M1', file, 'el nombre debe ser <12 dígitos>_<minúsculas_y_guiones_bajos>.sql');
  const prefix = file.slice(0, 12);
  if (prefixes.has(prefix)) fail('M1', file, `prefijo repetido con ${prefixes.get(prefix)}`);
  prefixes.set(prefix, file);
}

if (!files.includes(INITIAL.file)) fail('M2', INITIAL.file, 'falta la migración inicial');
else {
  const content = readFileSync(join(migrationsDir, INITIAL.file), 'utf8').replace(/\r\n/g, '\n');
  const hash = createHash('sha256').update(content).digest('hex');
  if (hash !== INITIAL.sha256)
    fail('M2', INITIAL.file, `la migración inicial cambió (sha256 ${hash}); no se modifica (§4.1)`);
}

const plannedIndex = new Map(PLANNED.map(([suffix], index) => [suffix, index]));
let lastPlanned = -1;
let lastFile = '';
for (const file of files) {
  const index = plannedIndex.get(suffixOf(file));
  if (index === undefined) {
    warnings.push(
      `M3 ${file}: §4.1 no nombra este archivo; avisar al líder (una función, un archivo dueño)`,
    );
    continue;
  }
  if (index < lastPlanned)
    fail('M3', file, `debe aplicarse después de ${lastFile} según el orden de §4.1`);
  lastPlanned = Math.max(lastPlanned, index);
  lastFile = file;
}

// ---------- sentencias ----------
const functionDefs = new Map(); // nombre → [{ file, line }]
const viewDefs = new Map();
const perFile = [];

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  const info = { file, suffix: suffixOf(file), created: [], revokes: [], grants: [] };
  perFile.push(info);
  statements(sql).forEach(({ text, line }, position) => {
    const where = `${shown(file)}:${line}`;
    let match;
    if (
      (match = new RegExp(
        String.raw`^create (?:or replace )?(?:function|procedure) (${QUALIFIED}) ?\(`,
      ).exec(text))
    ) {
      const name = qualify(match[1]);
      info.created.push({ name, line, position });
      if (!functionDefs.has(name)) functionDefs.set(name, []);
      const defs = functionDefs.get(name);
      if (!defs.some((def) => def.file === file)) defs.push({ file, line });
      if (/\bsecurity definer\b/.test(text)) {
        const path =
          /\bset search_path (?:=|to) ([^$]*?)(?= as\b| language\b| security\b| returns\b| immutable\b| stable\b| volatile\b|$)/.exec(
            text,
          );
        const value = path?.[1].replace(/\s+/g, '').replace(/"/g, '');
        if (value !== 'public,pg_temp')
          fail(
            'M10',
            where,
            `${name} es security definer y debe fijar set search_path = public, pg_temp`,
          );
      }
      return;
    }
    if (
      (match = new RegExp(
        String.raw`^create (?:or replace )?(?:materialized )?view (?:if not exists )?(${QUALIFIED})`,
      ).exec(text))
    ) {
      const name = qualify(match[1]);
      if (!viewDefs.has(name)) viewDefs.set(name, []);
      viewDefs.get(name).push({ file, line });
      return;
    }
    const schemaChange =
      /^create (?:(?:global |local )?(?:temp|temporary) |unlogged )?table\b/.test(text)
        ? 'create table'
        : /^drop table\b/.test(text)
          ? 'drop table'
          : /^alter table\b/.test(text) &&
              / (?:add|drop) (?:column\b|(?!constraint\b|primary\b|unique\b|foreign\b|check\b|exclude\b|default\b)(?:if (?:not )?exists )?[a-z_"])/.test(
                text,
              )
            ? 'alter table … add/drop column'
            : null;
    if (
      schemaChange &&
      !/^create (?:global |local )?(?:temp|temporary) table/.test(text) &&
      !SCHEMA_FILES.includes(info.suffix)
    ) {
      fail(
        'M4',
        where,
        `${schemaChange} solo va en los archivos de esquema de A1 (§4.1: el esquema es el contrato)`,
      );
    }
    if (
      (match =
        /^revoke (?:grant option for )?.+? on (?:function|routine|procedure)s? (.+) from (.+)$/.exec(
          text,
        ))
    ) {
      info.revokes.push({ names: functionNames(match[1]), roles: roleList(match[2]), position });
      return;
    }
    if (
      (match = new RegExp(
        String.raw`^revoke .+? on all (?:functions|routines|procedures) in schema (${IDENT}) from (.+)$`,
      ).exec(text))
    ) {
      info.revokes.push({ schema: unquote(match[1]), roles: roleList(match[2]), position });
      return;
    }
    if ((match = /^grant (.+?) on (?:function|routine|procedure)s? (.+) to (.+)$/.exec(text))) {
      const names = functionNames(match[2]);
      const roles = roleList(match[3]);
      info.grants.push({ names, roles, position, line });
      for (const name of names) {
        if (roles.includes('public')) fail('M9', where, `grant a public de ${name}`);
        if (roles.includes('anon') && !ANON_ALLOWED.has(name))
          fail('M9', where, `${name} no está en la lista blanca de anon (§4.1)`);
      }
      return;
    }
    if (
      (match = /^grant .+? on all (?:functions|routines|procedures) in schema \S+ to (.+)$/.exec(
        text,
      ))
    ) {
      const bad = roleList(match[1]).filter((role) =>
        ['public', 'anon', 'authenticated'].includes(role),
      );
      if (bad.length)
        fail('M9', where, `grant en bloque sobre todas las funciones a ${bad.join(', ')}`);
      return;
    }
    if (
      (match = /^alter default privileges .*\bgrant .+? on (?:functions|routines) to (.+)$/.exec(
        text,
      ))
    ) {
      const bad = roleList(match[1]).filter((role) =>
        ['public', 'anon', 'authenticated'].includes(role),
      );
      if (bad.length)
        fail('M9', where, `alter default privileges concede funciones a ${bad.join(', ')}`);
    }
  });
}

// ---------- M5 / M6: un dueño por función ----------
const order = new Map(files.map((file, index) => [file, index]));
for (const [name, defs] of functionDefs) {
  defs.sort((a, b) => order.get(a.file) - order.get(b.file));
  const list = defs.map((def) => `${shown(def.file)}:${def.line}`).join(', ');
  const later = defs.filter((def) => def.file !== INITIAL.file);
  if (defs.some((def) => def.file === INITIAL.file)) {
    const allowed = INITIAL_V2[name];
    for (const def of later) {
      if (suffixOf(def.file) !== allowed) {
        fail(
          'M5',
          `${shown(def.file)}:${def.line}`,
          `${name} es de la migración inicial y no se redefine aquí${allowed ? ` (su v2 va en *_${allowed}.sql)` : ''}`,
        );
      }
    }
    if (later.length > 1) fail('M5', name, `la v2 se escribe una sola vez; definida en ${list}`);
    continue;
  }
  if (defs.length > 2) fail('M5', name, `definida en más de dos archivos: ${list}`);
  else if (defs.length === 2 && suffixOf(defs[0].file) !== CONTRACT_FILE) {
    fail('M5', name, `definida en dos archivos sin que el primero sea *_contract.sql: ${list}`);
  }
  const contract = CONTRACT[name.replace(/^public\./, '')];
  if (contract && name.startsWith('public.')) {
    for (const def of defs) {
      const suffix = suffixOf(def.file);
      if (suffix !== CONTRACT_FILE && suffix !== contract[1]) {
        fail(
          'M6',
          `${shown(def.file)}:${def.line}`,
          `${name} es del archivo *_${contract[1]}.sql (§4.1); aquí solo se rellena el gancho propio`,
        );
      }
    }
  }
}
const contractFile = files.find((file) => suffixOf(file) === CONTRACT_FILE);
if (contractFile) {
  for (const name of Object.keys(CONTRACT)) {
    if (NO_CONTRACT_STUB.has(name)) continue;
    const defs = functionDefs.get(`public.${name}`) ?? [];
    if (!defs.some((def) => def.file === contractFile))
      fail('M6', shown(contractFile), `falta el gancho o stub de public.${name}`);
  }
}

// ---------- M7: una vista, un archivo ----------
for (const [name, defs] of viewDefs) {
  const owners = [...new Set(defs.map((def) => def.file))];
  if (owners.length > 1)
    fail('M7', name, `vista definida en varios archivos: ${owners.map(shown).join(', ')}`);
  const owner = VIEWS[name.replace(/^public\./, '')];
  if (owner && name.startsWith('public.')) {
    for (const file of owners)
      if (suffixOf(file) !== owner) fail('M7', shown(file), `${name} es de *_${owner}.sql (§4.1)`);
  }
}

// ---------- M8 / M9: revoke y grant en el mismo archivo ----------
for (const info of perFile) {
  if (info.file === INITIAL.file) continue; // heredada: no se modifica (M2)
  const seen = new Set();
  for (const { name, line, position } of info.created) {
    if (seen.has(name)) continue;
    seen.add(name);
    const where = `${shown(info.file)}:${line}`;
    const [schema] = name.split('.');
    const revoked = info.revokes.some(
      (revoke) =>
        revoke.position > position &&
        revoke.roles.includes('public') &&
        (revoke.names ? revoke.names.includes(name) : revoke.schema === schema),
    );
    if (!revoked)
      fail(
        'M8',
        where,
        `${name}: falta «revoke all on function ${name}(…) from public» en este archivo, después de crearla`,
      );
    const grantedTo = new Set(
      info.grants
        .filter((grant) => grant.position > position && grant.names.includes(name))
        .flatMap((grant) => grant.roles),
    );
    const contract = name.startsWith('public.')
      ? CONTRACT[name.slice('public.'.length)]
      : undefined;
    if (!contract) continue;
    const [role] = contract;
    if (role === 'anon' && !grantedTo.has('anon'))
      fail(
        'M9',
        where,
        `${name} es anon: falta «grant execute on function ${name}(…) to anon» en este archivo`,
      );
    if ((role === 'staff' || role === 'admin') && !grantedTo.has('authenticated')) {
      fail(
        'M9',
        where,
        `${name} es ${role}: falta «grant execute on function ${name}(…) to authenticated» en este archivo`,
      );
    }
    if (role === 'internal' && grantedTo.size)
      fail(
        'M9',
        where,
        `${name} es interna: no se concede a nadie (concedida a ${[...grantedTo].join(', ')})`,
      );
  }
}

// ---------- salida ----------
for (const warning of warnings) console.warn(`aviso: ${warning}`);
if (errors.length) {
  console.error(
    `verify:migrations FALLA: ${errors.length} problema(s) en ${inRepo ? relative(root, migrationsDir) : migrationsDir}:`,
  );
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(
  `verify:migrations OK: ${files.length} migración(es), ${functionDefs.size} función(es), ${viewDefs.size} vista(s); ` +
    'inicial intacta, un dueño por función, revoke/grant en su archivo.',
);
