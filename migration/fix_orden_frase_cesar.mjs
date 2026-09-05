// julius-caesar-law-tour d6: al reescribir la logística del día, la frase de la
// noche quedó incrustada en medio del párrafo, antes de la discusión que ocurre
// ese mismo día. Va al final, que es donde ocurre.
//
// Dry-run por defecto. Aplicar con: node migration/fix_orden_frase_cesar.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const SLUG = 'julius-caesar-law-tour';
const NOCHE = { es: ' Noche en la costa adriática.', en: ' Night on the Adriatic coast.' };

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const snap = await db.collection('experiences').get();
let cambiados = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  if (x.slug !== SLUG) continue;
  const lang = (x.sites || []).includes('en') ? 'en' : 'es';
  const it = [...(x.itinerary || [])];
  const d = it[5];
  const v = d?.description || '';
  const frase = NOCHE[lang];

  if (v.trimEnd().endsWith(frase.trim())) { console.log(`${doc.id}: la frase ya está al final.`); continue; }
  if (!v.includes(frase)) { console.error(`${doc.id}: no se encuentra la frase. Se omite.`); continue; }

  const nuevo = v.replace(frase, '').trimEnd() + frase;
  it[5] = { ...d, description: nuevo };
  cambiados++;
  console.log(`\n${doc.id} [${lang}] d6\n  ${nuevo}`);
  if (WRITE) await doc.ref.update({ itinerary: it });
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
process.exit(0);
