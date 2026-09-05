// Carlos V: de 6 bases a 4, aplicando la regla de 4 bases (5 como máximo) en
// 10 días. Lo que carga un viaje es cambiar de hotel, no visitar sitios.
//
//   Bruselas (4 noches)  Grand-Place, Coudenberg, Gante, Aquisgrán
//   Bolonia  (2 noches)  San Petronio, Milán
//   Madrid   (3 noches)  Palacio Real, Toledo
//   Yuste    (1 noche)   el retiro, salida por Madrid
//
// Dos vuelos en todo el viaje (BRU→BLQ, BLQ→MAD), el resto trenes de menos de
// hora y media. Se conservan 8 de los 9 destinos.
//
// Cambios:
//  1. Sale París. Era el único destino sin un hecho biográfico detrás, y su
//     día ni siquiera visitaba el sitio del que hablaba: el Campo del Paño de
//     Oro fue cerca de Calais, a 290 km de París.
//  2. El día 3 juntaba Gante y Aquisgrán, dos países y 168 km entre medias.
//     Se parte en dos excursiones desde Bruselas, que es lo que caben.
//  3. Milán pasa de traslado a excursión en tren desde Bolonia.
//
// Dry-run por defecto. Aplicar con: node migration/fix_bases_carlos_v.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const SLUG = 'charles-v-empire-tour';

// Los días 3 y 4 actuales (Gante+Aquisgrán juntos, y París) se sustituyen por
// estos dos. El resto del itinerario no se toca ni se renumera.
const DIAS_3_Y_4 = {
  es: [
    {
      day: 3,
      title: 'Gante: Mi Ciudad Natal',
      description: 'Excursión en tren a Gante, donde nací en 1500. Visitaremos la Catedral de San Bavón, con la pila en la que fui bautizado, y el castillo de los condes de Flandes. Recorreremos también la ciudad que se rebeló contra mí en 1539 y a la que impuse un castigo ejemplar, para entender la tensión entre mis raíces flamencas y mis deberes como emperador. Regreso a Bruselas por la tarde.',
      relevance: 'Gante explica de dónde vengo y por qué nunca dejé de ser flamenco. Aquí se ve el conflicto de gobernar a los tuyos: la ciudad que me dio la cuna fue también la que reprimí con más dureza.',
    },
    {
      day: 4,
      title: 'Aquisgrán: La Corona de Carlomagno',
      description: 'Excursión en tren a Aquisgrán, ya en Alemania, la capital de Carlomagno. En su Capilla Palatina fui coronado Rey de Romanos en 1520, sentado en el trono de piedra del primer gran emperador de Europa. Discutiremos qué significaba reclamar esa herencia y cómo se financió mi elección imperial, pagada en buena parte por los banqueros Fugger. Regreso a Bruselas por la tarde.',
      relevance: 'Mi legitimidad no venía solo de la sangre: venía de una elección comprada y de un símbolo, el trono de Carlomagno. Aquisgrán es el lugar donde la idea imperial se convirtió en ceremonia.',
    },
  ],
  en: [
    {
      day: 3,
      title: 'Ghent: My Birthplace',
      description: 'Day trip by train to Ghent, where I was born in 1500. We will visit Saint Bavo’s Cathedral, with the font at which I was baptized, and the castle of the Counts of Flanders. We will also walk the city that rebelled against me in 1539 and on which I imposed an exemplary punishment, to understand the tension between my Flemish roots and my duties as emperor. Return to Brussels in the afternoon.',
      relevance: 'Ghent explains where I come from and why I never stopped being Flemish. Here you see the difficulty of ruling your own people: the city that gave me my cradle was also the one I put down most harshly.',
    },
    {
      day: 4,
      title: 'Aachen: The Crown of Charlemagne',
      description: 'Day trip by train to Aachen, across the German border, the capital of Charlemagne. In its Palatine Chapel I was crowned King of the Romans in 1520, seated on the stone throne of the first great emperor of Europe. We will discuss what it meant to claim that inheritance and how my imperial election was financed, paid for in large part by the Fugger bankers. Return to Brussels in the afternoon.',
      relevance: 'My legitimacy came not from blood alone: it came from a purchased election and from a symbol, the throne of Charlemagne. Aachen is where the imperial idea became ceremony.',
    },
  ],
};

// Milán deja de ser traslado y pasa a excursión desde Bolonia.
const MILAN = {
  es: [
    'Viaje a Milán, una de las joyas más disputadas de Italia.',
    'Excursión en tren a Milán, una de las joyas más disputadas de Italia.',
    ' Regreso a Bolonia por la tarde.',
  ],
  en: [
    'Travel to Milan, one of the most fiercely contested jewels of Italy.',
    'Day trip by train to Milan, one of the most fiercely contested jewels of Italy.',
    ' Return to Bologna in the afternoon.',
  ],
};

const CIUDADES = {
  es: ['Bruselas', 'Gante', 'Aquisgrán', 'Bolonia', 'Milán', 'Madrid', 'Toledo', 'Yuste'],
  en: ['Brussels', 'Ghent', 'Aachen', 'Bologna', 'Milan', 'Madrid', 'Toledo', 'Yuste'],
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
  // Guarda: los días que se sustituyen tienen que ser los que creemos.
  const esperado = lang === 'es' ? [/Gante y Aquisgrán/, /París/] : [/Ghent and Aachen/, /Paris/];
  if (!esperado[0].test(antes[2].title) || !esperado[1].test(antes[3].title)) {
    console.error(`${doc.id}: los días 3 y 4 no son los esperados ("${antes[2].title}", "${antes[3].title}"). Se omite.`);
    continue;
  }

  const [malMilan, bienMilan, colaMilan] = MILAN[lang];
  const despues = [
    antes[0],
    antes[1],
    ...DIAS_3_Y_4[lang],
    ...antes.slice(4).map((d) => {
      if (!d.description?.includes(malMilan)) return d;
      return { ...d, description: d.description.replace(malMilan, bienMilan) + colaMilan };
    }),
  ];

  cambiados++;
  console.log(`\n${doc.id}  [${lang}]`);
  despues.forEach((d, i) => {
    const viejo = antes.find((a) => a.title === d.title);
    const marca = !viejo ? '  NUEVO' : viejo.description !== d.description ? '  (texto ajustado)' : '';
    console.log(`  d${String(i + 1).padStart(2)}: ${d.title}${marca}`);
  });
  console.log(`  fuera: ${antes.filter((a) => !despues.some((d) => d.title === a.title)).map((a) => a.title).join('; ')}`);
  console.log(`  cities: ${(x.cities || []).join(' → ')}`);
  console.log(`       →  ${CIUDADES[lang].join(' → ')}`);

  if (WRITE) await doc.ref.update({ itinerary: despues, cities: CIUDADES[lang] });
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
if (!WRITE) console.log('Aplicar con --write.');
process.exit(0);
