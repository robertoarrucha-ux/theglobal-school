// Alinea el campo `cities` con las ciudades que el itinerario visita de verdad.
//
// Contexto: en la ficha, `cities` se pinta como RUTA (Ciudad → Ciudad → Ciudad),
// alimenta el buscador libre de las tarjetas y el campo "Destinos" del one-pager.
// La auditoría de itinerarios (migration/audit_itinerarios.mjs) encontró 5 viajes
// cuya lista omitía ciudades donde el itinerario pasa un día entero, incluida en
// dos casos la CIUDAD DE LLEGADA, que es el dato con el que el comprador saca vuelo.
//
// Cada secuencia de abajo es el orden real del itinerario. No inventa destinos:
// solo declara los que la ficha ya publica en sus días. Se omiten los sitios que
// son parte de una base ya listada (Bocage y Passchendaele quedan dentro de
// Normandía e Ypres; Versalles es excursión de día desde París).
//
// Dry-run por defecto. Aplicar con: node migration/fix_ciudades_ruta.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');

// slug -> { es: [...], en: [...] }, en orden de itinerario.
const RUTAS = {
  // Sin Londres desde la reestructuración en 5 bases (fix_bases_ww2.mjs).
  'ww2-conflict-and-memory': {
    es: ['Normandía', 'París', 'Cracovia', 'Auschwitz', 'Berlín', 'Núremberg'],
    en: ['Normandy', 'Paris', 'Krakow', 'Auschwitz', 'Berlin', 'Nuremberg'],
  },
  'great-war-trenches': {
    es: ['Bruselas', 'Ypres', 'Somme', 'Verdún', 'París'],
    en: ['Brussels', 'Ypres', 'Somme', 'Verdun', 'Paris'],
  },
  // Sin Bruselas desde fix_reestructura_tres.mjs: era un rodeo de 400 km para
  // un solo día, y el tema del día se quedó en París.
  'grand-tour-enlightenment': {
    es: ['París', 'Ginebra', 'Roma', 'Venecia'],
    en: ['Paris', 'Geneva', 'Rome', 'Venice'],
  },
  'cold-war-and-reunion': {
    es: ['Berlín', 'Praga', 'Roma', 'Bruselas'],
    en: ['Berlin', 'Prague', 'Rome', 'Brussels'],
  },
  // Estado posterior al reordenado (fix_orden_carlos_v.mjs, Italia antes que
  // España) y a la reestructuración en 4 bases (fix_bases_carlos_v.mjs, que
  // saca París). Si se cambia aquí, cambiarlo también allí.
  'charles-v-empire-tour': {
    es: ['Bruselas', 'Gante', 'Aquisgrán', 'Bolonia', 'Milán', 'Madrid', 'Toledo', 'Yuste'],
    en: ['Brussels', 'Ghent', 'Aachen', 'Bologna', 'Milan', 'Madrid', 'Toledo', 'Yuste'],
  },
  // Ironbridge es la jornada entera del día 4 y no figuraba. Es un sitio, no una
  // ciudad base, pero la convención ya lista sitios (Auschwitz, Somme, Verdún).
  'industrial-revolution': {
    es: ['Mánchester', 'Liverpool', 'Ironbridge', 'Londres'],
    en: ['Manchester', 'Liverpool', 'Ironbridge', 'London'],
  },
};

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const snap = await db.collection('experiences').get();
let cambiados = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const ruta = RUTAS[x.slug];
  if (!ruta) continue;

  const lang = (x.sites || []).includes('en') ? 'en' : 'es';
  const after = ruta[lang];
  const before = x.cities || [];
  if (before.length === after.length && before.every((c, i) => c === after[i])) continue;

  cambiados++;
  const nuevas = after.filter((c) => !before.includes(c));
  console.log(`\n${doc.id}  [${lang}]`);
  console.log(`  antes:   ${before.join(' → ') || '(vacío)'}`);
  console.log(`  después: ${after.join(' → ')}`);
  console.log(`  añadidas: ${nuevas.join(', ')}`);

  // `city` (singular) es la ciudad de partida: debe ser la primera de la ruta.
  const patch = { cities: after };
  if (x.city && x.city !== after[0]) {
    console.log(`  city: "${x.city}" → "${after[0]}" (ciudad de llegada)`);
    patch.city = after[0];
  }
  if (WRITE) await doc.ref.update(patch);
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
if (!WRITE) console.log('Aplicar con --write.');
process.exit(0);
