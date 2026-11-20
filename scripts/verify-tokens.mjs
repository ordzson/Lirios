// `pnpm run verify:tokens` — PLAN.md §7.2 regla 3 y §8 Oleada 0 paso 2:
// «código nuevo sin hexadecimales: solo tokens de src/styles/_tokens.scss».
// Dueño: T (paso 0-T). Es una prueba del catálogo: nadie más la edita (§7.2 regla 11).
//
// Qué revisa
//   Todo archivo de texto bajo src/ (.scss .sass .css .less .ts .js .mjs .html .svg),
//   menos src/styles/** (ahí viven los tokens). Un «hexadecimal» es un color #rgb,
//   #rgba, #rrggbb o #rrggbbaa que no va pegado a una letra, número, «_», «-», «&» ni
//   «/» (así no cuentan `&#039;`, `#add-button` ni `ruta#seccion`).
//
// Cómo se define «carpeta nueva» / «código nuevo»
//   El SCSS público ya aprobado (y el panel viejo) tiene muchos hexadecimales y no se
//   reescribe hasta D3. En vez de una lista de carpetas, el script trae abajo una LÍNEA
//   BASE congelada el 2026-11-19 (Oleada 0, commit 82ec50b + árbol de trabajo): para
//   cada archivo heredado, cuántas veces aparece cada hexadecimal.
//     · Archivo que no está en la línea base (carpeta nueva o archivo nuevo en carpeta
//       vieja): cero hexadecimales.
//     · Archivo heredado: puede conservar o quitar los suyos, nunca agregar uno nuevo ni
//       repetir uno más veces que en la línea base.
//   La línea base solo baja (D3 la irá vaciando). Si una entrada sobra porque el
//   archivo ya no tiene hexadecimales, se avisa pero no falla.
//   `node scripts/verify-tokens.mjs --baseline` imprime el estado actual en el formato
//   de la línea base (solo para que T la reduzca; jamás para subirla).
//
// Sale con 1 y la lista archivo:línea:valor si hay alguna violación.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scanRoot = join(root, 'src');
const tokensDir = 'src/styles/';
const EXTENSIONS = new Set([
  '.scss',
  '.sass',
  '.css',
  '.less',
  '.ts',
  '.js',
  '.mjs',
  '.html',
  '.svg',
]);
const HEX = /(?<![&\w/])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9A-Za-z_-])/g;

// Línea base congelada (Oleada 0). Solo se reduce.
const BASELINE = {
  'src/app/app.component.scss': {
    '#faf2eb': 8,
    '#2d2427': 6,
    '#fff8f3': 1,
    '#564a4c': 1,
    '#75686a': 1,
    '#fff5eb': 3,
    '#efd8d0': 1,
    '#5d4b4f': 2,
    '#cdbeb4': 2,
    '#66595a': 1,
    '#d6bea9': 1,
    '#513f42': 3,
    '#5a4547': 1,
    '#2f513e': 1,
    '#261c1f': 1,
    '#f4e7dd': 2,
    '#cdbab4': 1,
    '#e3d7cd': 1,
  },
  'src/app/pages/admin/dashboard/admin-dashboard.component.scss': {
    '#f7eee7': 1,
    '#2d2427': 5,
    '#fff5eb': 3,
    '#261c1f': 1,
    '#f4e7dd': 1,
    '#faf2eb': 1,
    '#cdbeb4': 7,
    '#35272b': 1,
    '#514247': 1,
    '#b6a5aa': 1,
    '#4f1020': 4,
    '#66595a': 8,
    '#fff8f3': 8,
    '#758e7d': 1,
    '#2f513e': 2,
    '#b98791': 1,
    '#9d6570': 1,
    '#9e8d88': 6,
    '#d5c8bf': 7,
    '#75686a': 10,
    '#564a4c': 1,
    '#998b8d': 1,
    '#a36d1d': 1,
    '#6c4ea0': 1,
    '#2f6b48': 1,
    '#8b293d': 1,
    '#b9a9a2': 5,
    '#f0dfd9': 2,
    '#513f42': 1,
    '#a58c90': 2,
    '#dfd0c7': 1,
    '#eaded6': 1,
  },
  'src/app/pages/admin/login/admin-login.component.scss': {
    '#faf2eb': 1,
    '#2d2427': 2,
    '#fff5eb': 2,
    '#66595a': 1,
    '#b98791': 1,
    '#513f42': 1,
    '#8c7377': 1,
    '#75686a': 1,
    '#fff8f3': 1,
    '#a58c90': 1,
  },
  'src/app/pages/cart/cart.component.scss': {
    '#faf2eb': 1,
    '#f4e7dd': 1,
    '#2d2427': 1,
    '#66595a': 1,
    '#d3c1b8': 1,
    '#5f5557': 1,
    '#75686a': 3,
    '#9c8583': 1,
    '#564a4c': 1,
    '#fff8f3': 2,
    '#9b7379': 1,
  },
  'src/app/pages/catalog/catalog.component.scss': {
    '#faf2eb': 1,
    '#2d2427': 1,
    '#66595a': 2,
    '#d3c1b8': 1,
    '#75686a': 3,
    '#fff8f3': 3,
    '#f4e7dd': 3,
  },
  'src/app/pages/custom-arrangements/custom-arrangements.component.scss': {
    '#faf2eb': 1,
    '#f4e7dd': 2,
    '#2d2427': 1,
    '#5d4b4f': 1,
    '#fff8f3': 2,
    '#66595a': 1,
    '#fff5eb': 9,
    '#efd8d0': 1,
    '#f2ddd6': 1,
    '#f1ddd5': 2,
    '#cdbeb4': 2,
    '#261c1f': 1,
  },
  'src/app/pages/order-confirmation/order-confirmation.component.scss': {
    '#faf2eb': 1,
    '#f4e7dd': 1,
    '#2d2427': 1,
    '#66595a': 1,
    '#d3c1b8': 1,
    '#2f513e': 1,
    '#fff8f3': 2,
  },
  'src/app/shared/brand/brand.component.ts': { '#faf2eb': 1 },
  'src/app/shared/site-header/site-header.component.scss': {
    '#faf2eb': 2,
    '#d8c9c0': 1,
    '#2d2427': 2,
    '#e3d7cd': 1,
  },
  'src/index.html': { '#faf2eb': 1 },
  'src/styles.scss': {
    '#de5b98': 1,
    '#f2b600': 1,
    '#922c59': 1,
    '#792147': 1,
    '#a12f63': 1,
    '#7e204c': 1,
    '#f1dce5': 1,
    '#faf2eb': 3,
    '#2d2427': 1,
    '#fff8f3': 1,
  },
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    const dot = name.lastIndexOf('.');
    return dot >= 0 && EXTENSIONS.has(name.slice(dot)) ? [full] : [];
  });
}

const scanned = walk(scanRoot);
const found = new Map(); // archivo → [{ line, value }]
for (const full of scanned) {
  const file = relative(root, full).split(sep).join('/');
  if (file.startsWith(tokensDir)) continue;
  const lines = readFileSync(full, 'utf8').split('\n');
  const hits = [];
  lines.forEach((text, index) => {
    for (const match of text.matchAll(HEX))
      hits.push({ line: index + 1, value: `#${match[1].toLowerCase()}` });
  });
  if (hits.length) found.set(file, hits);
}

if (process.argv.includes('--baseline')) {
  const current = {};
  for (const [file, hits] of [...found].sort(([a], [b]) => a.localeCompare(b))) {
    current[file] = {};
    for (const { value } of hits) current[file][value] = (current[file][value] ?? 0) + 1;
  }
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

const errors = [];
for (const [file, hits] of found) {
  const allowed = BASELINE[file];
  if (!allowed) {
    for (const { line, value } of hits)
      errors.push(
        `${file}:${line}: ${value} (archivo nuevo: usa un token de src/styles/_tokens.scss)`,
      );
    continue;
  }
  const counts = {};
  for (const { line, value } of hits) {
    counts[value] = (counts[value] ?? 0) + 1;
    if (counts[value] > (allowed[value] ?? 0)) {
      errors.push(
        `${file}:${line}: ${value} (archivo heredado: ${allowed[value] ? `la línea base permite ${allowed[value]}` : 'hexadecimal nuevo'}; usa un token)`,
      );
    }
  }
}

const stale = Object.keys(BASELINE).filter((file) => !found.has(file));
const legacyCount = [...found]
  .filter(([file]) => BASELINE[file])
  .reduce((sum, [, hits]) => sum + hits.length, 0);

if (errors.length) {
  console.error(
    `verify:tokens FALLA: ${errors.length} hexadecimal(es) fuera de ${tokensDir} en código nuevo:`,
  );
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
for (const file of stale)
  console.warn(`aviso: ${file} ya no tiene hexadecimales; T puede quitarlo de la línea base.`);
console.log(
  `verify:tokens OK: ${scanned.length} archivos revisados en src/ (sin ${tokensDir}); ` +
    `${legacyCount} hexadecimales heredados dentro de la línea base (${Object.keys(BASELINE).length} archivos); 0 nuevos.`,
);
