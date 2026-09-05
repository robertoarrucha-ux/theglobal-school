// Reestructura de tres itinerarios, salida de leer los 16 uno por uno.
//
// GRAND TOUR: fuera Bruselas. Era un solo día y metía unos 400 km de rodeo en
// el tramo París → Ginebra (París→Bruselas 264, Bruselas→Ginebra 540, frente a
// 410 directos). Aparte, el centro editorial clandestino de la Ilustración fue
// la República Holandesa, no Bruselas. El tema del día, censura y libertad de
// prensa, se queda en París, donde las obras de Voltaire se quemaron y se
// leyeron igual. Baja de 5 bases a 4.
//
// GUTENBERG: la ruta zigzagueaba. Maguncia → Estrasburgo (220 km al sur) →
// Frankfurt (que está a 35 km de Maguncia) → Amberes, y el día 9 volvía a
// Alemania sin nombrar ciudad. Reordenado a Estrasburgo → Maguncia (con
// Frankfurt de excursión) → Amberes: de sur a norte, sin volver sobre los
// propios pasos, y además cronológico, porque Gutenberg experimentó en
// Estrasburgo antes de imprimir la Biblia en Maguncia. El día de la
// Contra-Reforma no necesita volver a Alemania: Amberes fue su gran taller,
// donde Plantin imprimió los libros litúrgicos de todo el imperio español.
//
// JULIO CÉSAR: el día 4 metía vuelo a Lyon y 200 km hasta Alesia en la misma
// jornada, y el 6 vuelo de vuelta a Italia más el Rubicón sin decir dónde se
// dormía. Se separan: el 4 se queda en Lyon (la Lugdunum romana, con la Tabla
// Claudiana), el 5 es la excursión a Alesia, y el 6 declara el vuelo, el
// traslado y la noche. Lyon y el Rubicón pasan a figurar en los destinos, y se
// quita el "(FR)", el único paréntesis de país del catálogo.
//
// Dry-run por defecto. Aplicar con: node migration/fix_reestructura_tres.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');

// ---------------------------------------------------------------- Grand Tour
const GT_DIA3 = {
  es: {
    title: 'París Clandestino: Los Libros Prohibidos',
    description: 'Un día dedicado a cómo circulaba lo que estaba prohibido. Mis obras se quemaron en esta ciudad y se leyeron igual: entraban de contrabando desde Holanda y Suiza, impresas fuera del alcance del censor real. Recorreremos el antiguo barrio de los libreros, en torno a la rue Saint-Jacques, y la Bastilla, que además de prisión política fue depósito de libros confiscados y encerró a más de un impresor, y a mí mismo. Discutiremos por qué la censura acabó siendo la mejor promoción del siglo.',
    relevance: 'La Ilustración no se difundió a pesar de la censura, sino en buena medida gracias a ella. Entender el comercio clandestino de libros es entender el momento en que una idea deja de poder detenerse.',
  },
  en: {
    title: 'Clandestine Paris: The Forbidden Books',
    description: 'A day on how what was banned actually circulated. My works were burned in this city and read all the same: they were smuggled in from Holland and Switzerland, printed beyond the reach of the royal censor. We will walk the old booksellers’ quarter around the rue Saint-Jacques, and the Bastille, which besides being a political prison was a warehouse for confiscated books and held more than one printer, and myself. We will discuss why censorship ended up being the finest publicity of the century.',
    relevance: 'The Enlightenment spread not in spite of censorship but, in large part, because of it. To understand the clandestine book trade is to understand the moment an idea can no longer be stopped.',
  },
};
const GT_CITIES = { es: ['París', 'Ginebra', 'Roma', 'Venecia'], en: ['Paris', 'Geneva', 'Rome', 'Venice'] };

// ----------------------------------------------------------------- Gutenberg
const GB_ORDEN = {
  es: ['Estrasburgo', 'Maguncia', 'Taller', 'Frankfurt', 'Best-Seller', 'Amberes', 'Cartografía', 'Grabado', 'Contra-Reforma', 'Legado de la Galaxia'],
  en: ['Strasbourg', 'Mainz', 'Workshop', 'Frankfurt', 'Best-Seller', 'Antwerp', 'Cartography', 'Engraving', 'Counter-Reformation', 'Legacy of the Gutenberg'],
};
const GB_TEXTOS = {
  es: [
    ['Viaje a Estrasburgo, la ciudad', 'Llegada a Estrasburgo, la ciudad'],
    ['Bienvenidos a Maguncia (Mainz), la ciudad donde todo comenzó. Tras instalarnos', 'Viaje a Maguncia (Mainz), la ciudad donde todo comenzó. Tras instalarnos'],
    ['Nos dirigiremos a Frankfurt, sede', 'Excursión a Frankfurt, a media hora de Maguncia, sede'],
    ['De vuelta en Alemania, exploraremos cómo la Iglesia Católica adoptó la imprenta como una herramienta para la Contra-Reforma. Visitaremos una biblioteca barroca para ver cómo la tipografía y el diseño se usaron para crear obras suntuosas que reafirmaban la fe católica.',
     'Amberes fue el gran taller de la Contra-Reforma. Con un privilegio concedido por el papado, Plantin y sus herederos imprimieron durante más de un siglo los libros litúrgicos de todo el imperio español. Veremos esas ediciones y discutiremos cómo la Iglesia, que al principio temió la imprenta, terminó convirtiéndola en su mejor instrumento.'],
    ['Almuerzo de despedida en Frankfurt y traslado al aeropuerto.', 'Almuerzo de despedida en Amberes y traslado al aeropuerto.'],
  ],
  en: [
    ['Journey to Strasbourg, the city', 'Arrival in Strasbourg, the city'],
    ['Welcome to Mainz, the city where it all began. After settling in', 'Journey to Mainz, the city where it all began. After settling in'],
    ['We will head to Frankfurt, home', 'Day trip to Frankfurt, half an hour from Mainz, home'],
    ['Back in Germany, we will explore how the Catholic Church adopted the printing press as a tool for the Counter-Reformation. We will visit a Baroque library to see how typography and design were used to create sumptuous works that reaffirmed the Catholic faith.',
     'Antwerp was the great workshop of the Counter-Reformation. Under a privilege granted by the papacy, Plantin and his heirs printed the liturgical books of the entire Spanish empire for more than a century. We will see those editions and discuss how the Church, which first feared the press, ended up making it its finest instrument.'],
    ['Farewell lunch in Frankfurt and transfer to the airport.', 'Farewell lunch in Antwerp and transfer to the airport.'],
  ],
};
// La llegada pasa a ser Estrasburgo, así que los títulos de los días 1 y 2 se
// intercambian el "Llegada a". [día nuevo, título].
const GB_TITULOS = {
  es: [[1, 'Llegada a Estrasburgo: Años de Exilio y Experimentación'], [2, 'Maguncia: La Cuna de la Impresión']],
  en: [[1, 'Arrival in Strasbourg: Years of Exile and Experimentation'], [2, 'Mainz: The Cradle of Printing']],
};
const GB_CITIES = { es: ['Estrasburgo', 'Maguncia', 'Frankfurt', 'Amberes'], en: ['Strasbourg', 'Mainz', 'Frankfurt', 'Antwerp'] };

// --------------------------------------------------------------- Julio César
const JC_TEXTOS = {
  es: [
    ['Vuelo a Lyon (Francia). Desde aquí, viajaremos al sitio de Alesia, donde culminó mi conquista de la Galia. Discutiremos',
     'Vuelo a Lyon, la Lugdunum romana, capital de las Tres Galias. Por la tarde visitaremos el museo galorromano, donde se conserva la Tabla Claudiana: el discurso en bronce con el que Claudio abrió el Senado a los notables galos casi un siglo después, la prueba de hasta dónde llegó lo que yo empecé. Discutiremos'],
    ['En un museo galorromano, estudiaremos cómo se organizaba la administración de una nueva provincia:',
     'Excursión de día completo a Alesia, en Borgoña, a poco más de dos horas de camino. Allí culminó mi conquista de la Galia con la rendición de Vercingétorix en el 52 a.C.: en el MuséoParc recorreremos las líneas de circunvalación y contravalación con las que encerré a un ejército mientras me defendía de otro. Después estudiaremos lo que venía tras la victoria, cómo se organizaba la administración de una nueva provincia:'],
    ['Regreso a Italia (vía vuelo). Simbólicamente, nos detendremos cerca del río Rubicón.',
     'Vuelo de Lyon a Bolonia y traslado al Rubicón, cerca de Savignano. Noche en la costa adriática.'],
    ['De vuelta en Roma, un seminario se centrará', 'Tren a Roma por la mañana. Por la tarde, un seminario se centrará'],
  ],
  en: [
    ['Flight to Lyon (France). From here, we will travel to the site of Alesia, where my conquest of Gaul culminated. We will discuss',
     'Flight to Lyon, the Roman Lugdunum, capital of the Three Gauls. In the afternoon we will visit the Gallo-Roman museum, which holds the Claudian Tablet: the bronze-cast speech with which Claudius opened the Senate to Gallic notables almost a century later, proof of how far what I began would reach. We will discuss'],
    ['In a Gallo-Roman museum, we will study how the administration of a new province was organized:',
     'A full-day trip to Alesia, in Burgundy, a little over two hours away. There my conquest of Gaul culminated with the surrender of Vercingetorix in 52 BC: at the MuséoParc we will walk the lines of circumvallation and contravallation with which I penned in one army while holding off another. We will then study what came after victory, how the administration of a new province was organized:'],
    ['Return to Italy (by flight). Symbolically, we will pause near the Rubicon river.',
     'Flight from Lyon to Bologna and transfer to the Rubicon, near Savignano. Night on the Adriatic coast.'],
    ['Back in Rome, a seminar will focus', 'Train to Rome in the morning. In the afternoon, a seminar will focus'],
  ],
};
const JC_TITULOS = {
  es: [[5, 'Alesia: El Asedio y la Administración de la Provincia']],
  en: [[5, 'Alesia: The Siege and the Administration of the Province']],
};
const JC_CITIES = { es: ['Roma', 'Lyon', 'Alesia', 'Rubicón'], en: ['Rome', 'Lyon', 'Alesia', 'Rubicon'] };

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

// Aplica sustituciones de texto sobre el itinerario entero. Devuelve null si
// alguna no casa, para no dejar el documento a medias.
const sustituir = (it, pares, etiqueta) => {
  const out = it.map((d) => ({ ...d }));
  for (const [antes, despues] of pares) {
    const i = out.findIndex((d) => (d.description || '').includes(antes));
    if (i === -1) {
      if (out.some((d) => (d.description || '').includes(despues))) continue;  // ya aplicado
      console.error(`  ${etiqueta}: no casa "${antes.slice(0, 45)}...". Se omite el documento.`);
      return null;
    }
    out[i].description = out[i].description.replace(antes, despues);
  }
  return out;
};

const snap = await db.collection('experiences').get();
let cambiados = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const lang = (x.sites || []).includes('en') ? 'en' : 'es';
  const antes = x.itinerary || [];
  let despues = null, cities = null, resumen = [];

  if (x.slug === 'grand-tour-enlightenment') {
    cities = GT_CITIES[lang];
    if (JSON.stringify(x.cities || []) === JSON.stringify(cities)) { console.log(`${doc.id}: ya reestructurado.`); continue; }
    const viejo = antes[2];
    const clave = lang === 'es' ? /^Bruselas:/ : /^Brussels:/;
    if (!clave.test(viejo?.title || '')) { console.error(`${doc.id}: el día 3 no es Bruselas ("${viejo?.title}"). Se omite.`); continue; }
    despues = [...antes];
    despues[2] = { day: 3, ...GT_DIA3[lang] };
    resumen.push(`fuera d3 "${viejo.title}"`, `nuevo d3 "${GT_DIA3[lang].title}"`);
  }

  if (x.slug === 'gutenberg-revolution') {
    cities = GB_CITIES[lang];
    if (JSON.stringify(x.cities || []) === JSON.stringify(cities)) { console.log(`${doc.id}: ya reestructurado.`); continue; }
    const claves = GB_ORDEN[lang];
    const casa = claves.map((k) => antes.filter((d) => (d.title || '').includes(k)));
    const mala = claves.findIndex((_, i) => casa[i].length !== 1);
    if (mala !== -1) { console.error(`${doc.id}: "${claves[mala]}" casa con ${casa[mala].length} días. Se omite.`); continue; }
    const pos = new Map(antes.map((d, i) => [d.title, i + 1]));
    const orden = casa.map(([d], i) => ({ ...d, day: i + 1 }));
    despues = sustituir(orden, GB_TEXTOS[lang], doc.id);
    if (!despues) continue;
    resumen = despues.map((d, i) => `d${i + 1}: ${d.title}${pos.get(d.title) !== i + 1 ? `  (era d${pos.get(d.title)})` : ''}`);
    for (const [dia, titulo] of GB_TITULOS[lang]) {
      resumen.push(`d${dia} título: "${despues[dia - 1].title}" → "${titulo}"`);
      despues[dia - 1] = { ...despues[dia - 1], title: titulo };
    }
  }

  if (x.slug === 'julius-caesar-law-tour') {
    cities = JC_CITIES[lang];
    if (JSON.stringify(x.cities || []) === JSON.stringify(cities)) { console.log(`${doc.id}: ya reestructurado.`); continue; }
    despues = sustituir(antes, JC_TEXTOS[lang], doc.id);
    if (!despues) continue;
    for (const [dia, titulo] of JC_TITULOS[lang]) {
      resumen.push(`d${dia}: "${despues[dia - 1].title}" → "${titulo}"`);
      despues[dia - 1] = { ...despues[dia - 1], title: titulo };
    }
    resumen.push('d4 se queda en Lyon, d5 pasa a ser la excursión a Alesia, d6 declara vuelo y noche');
  }

  if (!despues) continue;
  cambiados++;
  console.log(`\n${doc.id}  [${lang}]`);
  resumen.forEach((r) => console.log(`  ${r}`));
  console.log(`  cities: ${(x.cities || []).join(' → ')}\n       →  ${cities.join(' → ')}`);
  if (WRITE) await doc.ref.update({ itinerary: despues, cities });
}

console.log(`\n${cambiados} documento(s) ${WRITE ? 'actualizados' : 'a actualizar (dry-run)'}.`);
if (!WRITE && cambiados) console.log('Aplicar con --write.');
process.exit(0);
