// Importa las versiones EN de los viajes (traducidas por los subagentes) a Firestore.
// Lee los .json de scratchpad/en/, fija id=exp-<slug>-en, sites=['en'], publicListed=true.
// Uso:  node migration/import_en_expeditions.mjs <dir_en>            (dry-run)
//       node migration/import_en_expeditions.mjs <dir_en> --write
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATABASE_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const KEY = resolve(BASE, 'gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json');

const dir = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!dir || !existsSync(dir)) { console.error('Pasa el directorio con los .json EN.'); process.exit(1); }
if (!existsSync(KEY)) { console.error('Falta la service account key en la raíz.'); process.exit(1); }

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const docs = [];
let bad = 0;
for (const f of files) {
  let d;
  try { d = JSON.parse(readFileSync(join(dir, f), 'utf8')); }
  catch (e) { console.error(`  ❌ JSON inválido: ${f} (${e.message})`); bad++; continue; }
  const slug = d.slug || f.replace(/\.json$/, '');
  d.id = `exp-${slug}-en`;
  d.slug = slug;
  d.sites = ['en'];
  d.publicListed = true;
  // sanidad mínima
  const missing = ['title', 'summary', 'coverImageUrl'].filter((k) => !d[k]);
  if (missing.length) { console.error(`  ❌ ${f}: faltan campos ${missing.join(',')}`); bad++; continue; }
  const emd = (JSON.stringify(d).match(/—/g) || []).length;
  docs.push({ d, slug, emd });
}

console.log(`Archivos: ${files.length} · válidos: ${docs.length} · inválidos: ${bad}`);
for (const { d, slug, emd } of docs) console.log(`  • exp-${slug}-en  "${d.title.slice(0, 48)}"${emd ? `  ⚠️ ${emd} em-dash` : ''}`);

if (bad) { console.error('\nHay archivos inválidos: corrige antes de escribir.'); if (WRITE) process.exit(1); }

if (WRITE) {
  const app = initializeApp({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) }, 'import-en');
  const db = getFirestore(app, DATABASE_ID);
  for (const { d } of docs) await db.collection('experiences').doc(d.id).set(d);
  console.log(`\n✅ ESCRITO: ${docs.length} experiencias EN a la colección experiences.`);
} else {
  console.log(`\nDRY-RUN: ${docs.length} listas para escribir (usa --write).`);
}
process.exit(0);
