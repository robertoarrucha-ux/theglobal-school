// Fija el campo `sites` (idiomas de publicación) en la colección `experiences`.
// Uso:  node migration/set_experience_sites.mjs es           (dry-run, todas -> ['es'])
//       node migration/set_experience_sites.mjs es --write
//       node migration/set_experience_sites.mjs es,en --write (ambos)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATABASE_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const KEY = resolve(BASE, 'gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json');

const arg = process.argv[2] || 'es';
const sites = arg.split(',').map((s) => s.trim()).filter((s) => s === 'en' || s === 'es');
const WRITE = process.argv.includes('--write');
if (!sites.length) { console.error('Indica idiomas: es | en | es,en'); process.exit(1); }
if (!existsSync(KEY)) { console.error('Falta la service account key en la raíz.'); process.exit(1); }

const app = initializeApp({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) }, 'set-sites');
const db = getFirestore(app, DATABASE_ID);

const snap = await db.collection('experiences').get();
let n = 0;
for (const doc of snap.docs) {
  n++;
  if (WRITE) await db.collection('experiences').doc(doc.id).set({ sites }, { merge: true });
}
console.log(`${WRITE ? 'ESCRITO' : 'DRY-RUN'}: sites=[${sites.join(', ')}] en ${n} experiencias.`);
process.exit(0);
