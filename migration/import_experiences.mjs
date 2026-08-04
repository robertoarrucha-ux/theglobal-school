// Importa las experiencias (16 expediciones + 3 eventos TNGS) a la colección `experiences`
// del Firestore de Aliados (DB no-default). NO toca programs/trips del B2B en vivo.
//
// DRY-RUN por defecto (no escribe). Para escribir de verdad:  node ... import_experiences.mjs --write
// Idempotente: doc id = exp-<slug> (expedición) | evt-<slug> (evento). Upsert (merge).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = resolve(__dir, '..');
const WRITE = process.argv.includes('--write');
const DATABASE_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const COLLECTION = 'experiences';
const KEY_PATH = resolve(BASE, 'gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json');

const expeditions = JSON.parse(readFileSync(resolve(BASE, 'src/data/expeditions.generated.json')));
const events = JSON.parse(readFileSync(resolve(BASE, 'src/data/tngs-events.json')));

const docs = [
  ...expeditions.map((x) => ({ id: `exp-${x.slug}`, data: { ...x, kind: 'expedition', publisherType: 'tgs', publicListed: true, programStatus: 'published' } })),
  ...events.map((x) => ({ id: `evt-${x.slug}`, data: { ...x, kind: 'event', publisherType: 'tgs', publicListed: true, programStatus: 'published' } })),
];

console.log(`Colección destino: ${COLLECTION}  (DB ${DATABASE_ID})`);
console.log(`Documentos a escribir: ${docs.length} (${expeditions.length} expediciones + ${events.length} eventos)`);
console.log(`Modo: ${WRITE ? '🟥 WRITE (producción)' : '🟩 DRY-RUN (no escribe)'}`);
console.log('\nIDs:');
docs.forEach((d) => console.log(`  ${d.id}  · ${d.data.type} · ${d.data.title.slice(0, 50)}`));

if (!WRITE) {
  console.log('\nDRY-RUN: nada escrito. Ejecuta con --write para importar.');
  process.exit(0);
}

if (!existsSync(KEY_PATH)) {
  console.error(`\n❌ Falta la service account key en ${KEY_PATH}`);
  process.exit(1);
}

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const cred = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const app = initializeApp({ credential: cert(cred) });
const db = getFirestore(app, DATABASE_ID);

let ok = 0;
for (const d of docs) {
  await db.collection(COLLECTION).doc(d.id).set({ ...d.data, updatedAt: new Date().toISOString() }, { merge: true });
  ok++;
  console.log(`  ✓ escrito ${d.id}`);
}
console.log(`\n✅ Importadas ${ok}/${docs.length} experiencias a ${COLLECTION}.`);
process.exit(0);
