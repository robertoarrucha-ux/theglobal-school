// Cruza un export de 404 de Google Search Console contra los redirects de firebase.json
// y las páginas ya construidas (dist-en / dist-es). Imprime las URLs que SIGUEN en 404.
//
// Uso:
//   npm run build                                  # para que dist-* esté al día
//   node migration/check_404.mjs [export.csv]      # default: migration/gsc_gaps.csv
//
// Acepta CSV con columnas "url[,clicks,impressions]" o una URL por línea. Ignora cabecera.

import fs from 'node:fs';

const csvPath = process.argv[2] || 'migration/gsc_gaps.csv';
if (!fs.existsSync(csvPath)) { console.error(`No existe ${csvPath}`); process.exit(1); }
if (!fs.existsSync('firebase.json')) { console.error('Corre desde la raíz del repo (falta firebase.json).'); process.exit(1); }

const fb = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const red = { en: [], es: [] };
for (const h of fb.hosting) if (red[h.target]) red[h.target] = (h.redirects || []).map((r) => r.source);

const matches = (srcs, path) =>
  srcs.some((s) => (s.endsWith('/**') ? path.startsWith(s.slice(0, -3)) : s === path || s + '/' === path || s === path + '/'));
const built = (lang, path) =>
  fs.existsSync(`dist-${lang}${path.replace(/\/$/, '')}/index.html`) || (path === '/' && fs.existsSync(`dist-${lang}/index.html`));

const lines = fs.readFileSync(csvPath, 'utf8').replace(/\r/g, '').trim().split('\n');
let redirected = 0, exists = 0;
const dead = [];
for (const raw of lines) {
  const url = raw.split(',')[0].trim();
  if (!/^https?:\/\//.test(url)) continue; // salta cabecera / líneas vacías
  const imp = parseInt(raw.split(',')[2] || '0', 10) || 0;
  const lang = url.includes('es.theglobal.school') ? 'es' : 'en';
  const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
  if (matches(red[lang], path)) { redirected++; continue; }
  if (built(lang, path)) { exists++; continue; }
  dead.push({ lang, path, imp });
}
dead.sort((a, b) => b.imp - a.imp);

console.log(`Redirigidas: ${redirected} | ya existen: ${exists} | SIGUEN 404: ${dead.length}`);
if (dead.length) {
  console.log('\nURLs aún en 404 (agrégalas a GAP_REDIRECTS en migration/gen_firebase.py):');
  for (const d of dead) console.log(`  [${d.lang}] ("${d.path}", "/"),   # ${d.imp} imp`);
}
