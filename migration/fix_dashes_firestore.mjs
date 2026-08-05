// Reemplaza el em dash "—" por coma en TODOS los campos de texto de la colección
// `experiences` (Firestore, DB de Aliados). Mismas reglas que fix_dashes.py.
// Uso:  node migration/fix_dashes_firestore.mjs           (dry-run)
//       node migration/fix_dashes_firestore.mjs --write   (escribe)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATABASE_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const KEY = resolve(BASE, 'gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json');
const WRITE = process.argv.includes('--write');

const H = '[^\\S\\n]';
function fixDashes(s) {
  if (typeof s !== 'string' || s.indexOf('—') === -1) return s;
  s = s.replace(new RegExp(`^(>*)${H}*—${H}*`, 'gm'), (_, g1) => (g1 ? g1 + ' ' : ''));
  s = s.replace(new RegExp(`${H}*—${H}*$`, 'gm'), '');
  s = s.replace(new RegExp(`([.!?;:])${H}*—${H}*`, 'g'), '$1 ');
  s = s.replace(new RegExp(`${H}*—${H}*`, 'g'), ', ');
  return s;
}
function walk(v) {
  if (typeof v === 'string') return fixDashes(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = walk(v[k]); return o; }
  return v;
}

if (!existsSync(KEY)) { console.error('Falta la service account key en la raíz.'); process.exit(1); }
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) }, 'dash-fixer');
const db = getFirestore(app, DATABASE_ID);

const snap = await db.collection('experiences').get();
let changed = 0, dashesBefore = 0;
for (const doc of snap.docs) {
  const before = doc.data();
  const beforeStr = JSON.stringify(before);
  dashesBefore += (beforeStr.match(/—/g) || []).length;
  const after = walk(before);
  if (JSON.stringify(after) !== beforeStr) {
    changed++;
    console.log(`  ${WRITE ? '✍️ ' : '•'} ${doc.id}  (${(beforeStr.match(/—/g) || []).length} em-dashes)`);
    if (WRITE) await db.collection('experiences').doc(doc.id).set(after);
  }
}
console.log(`\n${WRITE ? 'ESCRITO' : 'DRY-RUN'}: ${changed}/${snap.size} docs con em-dashes (${dashesBefore} ocurrencias en total).`);
process.exit(0);
