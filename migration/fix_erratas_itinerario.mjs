// Erratas de topónimos en los itinerarios.
//
// "Paschendaele" en el título del día 3 de great-war-trenches (ES): la propia
// descripción de ese mismo día lo escribe bien dos líneas más abajo, y el
// documento en inglés lo escribe bien en los tres sitios. Es una errata suelta,
// no una variante ortográfica.
//
// Sustituye en title, description y en cualquier cadena del documento.
// Dry-run por defecto. Aplicar con: node migration/fix_erratas_itinerario.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');

// [patrón, corrección]. El patrón no debe casar con la forma ya correcta.
const ERRATAS = [
  [/\bPaschendaele\b/g, 'Passchendaele'],
];

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const arreglar = (v) => {
  if (typeof v === 'string') return ERRATAS.reduce((s, [re, ok]) => s.replace(re, ok), v);
  if (Array.isArray(v)) return v.map(arreglar);
  if (v && typeof v === 'object' && v.constructor === Object) {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, arreglar(val)]));
  }
  return v;
};

const snap = await db.collection('experiences').get();
let cambiados = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const patch = {};
  for (const campo of ['title', 'summary', 'description', 'itinerary', 'sections', 'cities']) {
    if (x[campo] === undefined) continue;
    const nuevo = arreglar(x[campo]);
    if (JSON.stringify(nuevo) !== JSON.stringify(x[campo])) patch[campo] = nuevo;
  }
  if (!Object.keys(patch).length) continue;

  cambiados++;
  console.log(`\n${doc.id}  campos: ${Object.keys(patch).join(', ')}`);
  for (const [re] of ERRATAS) {
    const antes = (JSON.stringify(x).match(re) || []).length;
    if (antes) console.log(`  ${re.source}: ${antes} ocurrencia(s)`);
  }
  if (WRITE) await doc.ref.update(patch);
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
if (!WRITE) console.log('Aplicar con --write.');
process.exit(0);
