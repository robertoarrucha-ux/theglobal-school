// WW2: de 6 bases a 5, aplicando la regla de 4 bases (5 como máximo) en 10 días.
//
//   Normandía → París → Cracovia → Berlín → Núremberg
//
// Sale Londres, y la razón es de movilidad, no de contenido: Londres a
// Normandía era la pierna más cara del catálogo, ferry de unas seis horas o
// volar a París y conducir hasta Caen. Sin ella se entra directo por CDG.
//
// El Blitz no se pierde. El día 1 pasa a ser jornada de llegada a Normandía con
// una sesión temática sobre la resistencia británica y la preparación aliada,
// que encaja mejor ahí de lo que encajaba como visita suelta: el Día D se
// planeó y embarcó desde el sur de Inglaterra. Mismo recurso que el día de
// Egipto en el viaje de César.
//
// El día 2 abría con "Viaje a Caen (Francia)", que deja de ser cierto porque
// ya se duerme allí desde el día 1.
//
// Auschwitz sigue en los destinos: es excursión desde Cracovia (70 km), así que
// no suma base, y es el sitio más significativo del viaje.
//
// Dry-run por defecto. Aplicar con: node migration/fix_bases_ww2.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const SLUG = 'ww2-conflict-and-memory';

const DIA_1 = {
  es: {
    day: 1,
    title: 'Llegada a Normandía: Gran Bretaña Sola y el Camino al Día D',
    description: 'Llegada a París y traslado a Caen. Dedicamos la tarde a lo que hizo posible el desembarco: el Blitz sobre Londres, la resistencia civil británica y los años en que Gran Bretaña aguantó sola frente al Tercer Reich, hasta la planificación aliada que se preparó en el sur de Inglaterra. Una cena de bienvenida nos sitúa en el mapa de una Europa al borde del abismo.',
    relevance: 'Antes de pisar las playas conviene entender desde dónde se salió. La determinación británica de 1940, la de una nación y un líder que se negaron a rendirse, es lo que sostuvo la guerra hasta que cruzar el Canal fue posible.',
  },
  en: {
    day: 1,
    title: 'Arrival in Normandy: Britain Alone and the Road to D-Day',
    description: 'Arrival in Paris and transfer to Caen. We devote the afternoon to what made the landings possible: the Blitz over London, British civilian resistance, and the years when Britain held out alone against the Third Reich, through to the Allied planning prepared in southern England. A welcome dinner sets us in the map of a Europe on the brink of the abyss.',
    relevance: 'Before setting foot on the beaches it helps to understand where they set out from. British resolve in 1940, that of a nation and a leader who refused to surrender, is what held the war together until crossing the Channel became possible.',
  },
};

// El día 2 ya no viaja a Caen: se duerme allí desde el día 1.
const DIA_2 = {
  es: ['Viaje a Caen (Francia). Nos dirigiremos', 'Nos dirigiremos'],
  en: ['Travel to Caen (France). We will make', 'We will make'],
};

const CIUDADES = {
  es: ['Normandía', 'París', 'Cracovia', 'Auschwitz', 'Berlín', 'Núremberg'],
  en: ['Normandy', 'Paris', 'Krakow', 'Auschwitz', 'Berlin', 'Nuremberg'],
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

  if (JSON.stringify(x.cities || []) === JSON.stringify(CIUDADES[lang])) {
    console.log(`${doc.id} [${lang}]: ya está reestructurado.`);
    continue;
  }
  if (antes.length !== 10) {
    console.error(`${doc.id}: ${antes.length} días, se esperaban 10. Se omite.`);
    continue;
  }
  const esperado = lang === 'es' ? /^Londres:/ : /^London:/;
  if (!esperado.test(antes[0].title)) {
    console.error(`${doc.id}: el día 1 no es el esperado ("${antes[0].title}"). Se omite.`);
    continue;
  }

  const [malo, bueno] = DIA_2[lang];
  const dia2 = antes[1].description?.includes(malo)
    ? { ...antes[1], description: antes[1].description.replace(malo, bueno) }
    : antes[1];

  const despues = [DIA_1[lang], dia2, ...antes.slice(2)];

  cambiados++;
  console.log(`\n${doc.id}  [${lang}]`);
  console.log(`  fuera: ${antes[0].title}`);
  console.log(`  d 1: ${despues[0].title}  NUEVO`);
  if (dia2 !== antes[1]) console.log(`  d 2: ${dia2.title}  (fuera el traslado a Caen, ya se duerme allí)`);
  console.log(`  city: "${x.city}" → "${CIUDADES[lang][0]}"`);
  console.log(`  cities: ${(x.cities || []).join(' → ')}`);
  console.log(`       →  ${CIUDADES[lang].join(' → ')}`);

  if (WRITE) await doc.ref.update({ itinerary: despues, cities: CIUDADES[lang], city: CIUDADES[lang][0] });
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
if (!WRITE) console.log('Aplicar con --write.');
process.exit(0);
