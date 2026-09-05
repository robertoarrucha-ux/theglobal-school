// Reordena los días de charles-v-empire-tour para que la ruta deje de cruzar
// el continente dos veces.
//
// El itinerario iba Bruselas → Gante/Aquisgrán → París → Madrid → Toledo →
// Bolonia → Milán → Yuste: bajaba a España, subía a Italia y volvía a España.
// 4.597 km de traslados en 10 días, 7 de ellos en movimiento.
//
// Orden nuevo (Italia antes que España): 3.005 km, 1.592 menos, sin quitar
// ningún destino. Además queda cronológico respecto a la vida del emperador:
// Gante (nacimiento) → Aquisgrán (coronación 1520) → París (Drap d'Or 1520) →
// Bolonia (coronación imperial 1530) → Milán → España → Yuste (muerte 1558).
//
// Es una permutación pura: no se reescribe ningún día, solo se reordenan y se
// renumera `day`. La única frase que deja de ser cierta al mover los días es la
// apertura de Yuste ("Vuelo de regreso a España (vía Madrid)"), porque en el
// orden nuevo España es la etapa inmediatamente anterior.
//
// Dry-run por defecto. Aplicar con: node migration/fix_orden_carlos_v.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const SLUG = 'charles-v-empire-tour';

// El orden se define por un trozo del título de cada día, no por su número:
// tras aplicarlo los días quedan renumerados 1..10, así que una segunda pasada
// keyed por número volvería a barajarlos. Con títulos el script es idempotente.
const ORDEN = {
  es: ['Llegada a Bruselas', 'Coudenberg', 'Gante y Aquisgrán', 'París',
       'Bolonia', 'Milán', 'Madrid', 'Toledo', 'Yuste', 'Reflexión Final'],
  en: ['Arrival in Brussels', 'Coudenberg', 'Ghent and Aachen', 'Paris',
       'Bologna', 'Milan', 'Madrid', 'Toledo', 'Yuste', 'Final Reflection'],
};

const CIUDADES = {
  es: ['Bruselas', 'Gante', 'Aquisgrán', 'París', 'Bolonia', 'Milán', 'Madrid', 'Toledo', 'Yuste'],
  en: ['Brussels', 'Ghent', 'Aachen', 'Paris', 'Bologna', 'Milan', 'Madrid', 'Toledo', 'Yuste'],
};

// Frase que sobra en Yuste una vez que España va antes. Se recorta el vuelo,
// se conserva el resto del día tal cual.
const YUSTE = {
  es: [
    'Vuelo de regreso a España (vía Madrid) y viaje a la región de Extremadura para visitar el Monasterio de Yuste.',
    'Viaje a la región de Extremadura para visitar el Monasterio de Yuste.',
  ],
  en: [
    'Flight back to Spain (via Madrid) and travel to the region of Extremadura to visit the Monastery of Yuste.',
    'Travel to the region of Extremadura to visit the Monastery of Yuste.',
  ],
};

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
  const antes = x.itinerary || [];
  const claves = ORDEN[lang];

  if (antes.length !== claves.length) {
    console.error(`${doc.id}: el itinerario tiene ${antes.length} días, se esperaban ${claves.length}. Se omite.`);
    continue;
  }
  // Cada clave tiene que casar con un día y solo uno, o el reordenado sería un
  // barajado silencioso. Ante cualquier ambigüedad, no se toca el documento.
  const casa = claves.map((k) => antes.filter((d) => (d.title || '').includes(k)));
  const ambigua = claves.findIndex((_, i) => casa[i].length !== 1);
  if (ambigua !== -1) {
    console.error(`${doc.id}: "${claves[ambigua]}" casa con ${casa[ambigua].length} días. Se omite.`);
    continue;
  }

  const [malo, bueno] = YUSTE[lang];
  const despues = casa.map(([d], i) => {
    const nuevo = { ...d, day: i + 1 };
    if (typeof nuevo.description === 'string' && nuevo.description.includes(malo)) {
      nuevo.description = nuevo.description.replace(malo, bueno);
    }
    return nuevo;
  });

  const posicion = new Map(antes.map((d, i) => [d.title, i + 1]));
  const igual = antes.every((d, i) => d.title === despues[i].title && d.description === despues[i].description);
  const rutaOk = JSON.stringify(x.cities || []) === JSON.stringify(CIUDADES[lang]);
  if (igual && rutaOk) { console.log(`${doc.id} [${lang}]: ya está en el orden nuevo.`); continue; }

  cambiados++;
  console.log(`\n${doc.id}  [${lang}]`);
  despues.forEach((d, i) => {
    const viejo = posicion.get(d.title);
    console.log(`  d${String(i + 1).padStart(2)}: ${d.title}${viejo !== i + 1 ? `  (era d${viejo})` : ''}`);
  });
  const y = despues.find((d) => (d.description || '').startsWith(bueno));
  if (y && !(antes.find((d) => d.title === y.title)?.description || '').startsWith(bueno)) {
    console.log(`  descripción recortada en "${y.title}": fuera el vuelo de regreso a España`);
  }
  console.log(`  cities: ${(x.cities || []).join(' → ')}`);
  console.log(`       →  ${CIUDADES[lang].join(' → ')}`);

  if (WRITE) await doc.ref.update({ itinerary: despues, cities: CIUDADES[lang] });
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
if (!WRITE) console.log('Aplicar con --write.');
process.exit(0);
