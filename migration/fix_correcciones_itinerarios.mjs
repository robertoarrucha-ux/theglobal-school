// Correcciones puntuales salidas de leer los 16 itinerarios uno por uno.
// Cada una sustituye una cadena exacta, no un patrón: si el texto ya cambió, no
// se toca nada y el script lo dice.
//
//  1. cheese-and-wine-trail d10: cerraba con "Traslado al aeropuerto al día
//     siguiente" en un viaje de 10 días, o sea en un día 11 que no existe.
//
//  2. french-revolution d9: llamaba a San Sulpicio "escenario de uno de sus
//     golpes de estado". El 18 de Brumario ocurrió en las Tullerías y en
//     Saint-Cloud. Lo que sí pasó en San Sulpicio fue el banquete que los
//     Consejos ofrecieron a Bonaparte el 6 de noviembre de 1799, tres días
//     antes del golpe: la historia es mejor y además es cierta.
//
//  3. industrial-revolution d3: metía el Museo Nacional del Ferrocarril, que
//     está en York a 150 km, en el mismo día que recorrer la línea
//     Liverpool-Mánchester. Se sustituye por dos paradas de la propia línea:
//     Rainhill, donde las pruebas de 1829 las ganó la "Rocket", y Edge Hill.
//
//  4. great-war-trenches d7: visitaba cementerios alemanes "cerca de Verdún y
//     el Somme", que están a 240 km. Se queda en el sector de Verdún, donde
//     está Consenvoye, uno de los mayores cementerios alemanes del frente.
//
// Dry-run por defecto. Aplicar con: node migration/fix_correcciones_itinerarios.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');

// slug -> [{ dia (1-based), lang, campo, antes, despues, nota }]
const C = [
  {
    slug: 'cheese-and-wine-trail', dia: 10, lang: 'es', campo: 'description',
    nota: 'el traslado deja de caer en un día 11 inexistente',
    antes: 'Tarde libre para comprar nuestros quesos y vinos favoritos. Cena de despedida en un restaurante que celebre los productos que hemos descubierto durante nuestro viaje. Traslado al aeropuerto al día siguiente.',
    despues: 'Mañana libre para comprar nuestros quesos y vinos favoritos. Almuerzo de despedida en un restaurante que celebre los productos que hemos descubierto durante nuestro viaje, y traslado al aeropuerto.',
  },
  {
    slug: 'cheese-and-wine-trail', dia: 10, lang: 'en', campo: 'description',
    nota: 'el traslado deja de caer en un día 11 inexistente',
    antes: 'A free afternoon to buy our favorite cheeses and wines. A farewell dinner at a restaurant that celebrates the products we have discovered on our journey. Transfer to the airport the following day.',
    despues: 'A free morning to buy our favorite cheeses and wines. A farewell lunch at a restaurant that celebrates the products we have discovered on our journey, then transfer to the airport.',
  },
  {
    slug: 'french-revolution', dia: 9, lang: 'es', campo: 'description',
    nota: 'San Sulpicio: el banquete, no un golpe que ocurrió en otro sitio',
    antes: 'Visitaremos la iglesia de San Sulpicio, escenario de uno de sus golpes de estado.',
    despues: 'Visitaremos la iglesia de San Sulpicio, donde los Consejos le ofrecieron un banquete multitudinario tres días antes del golpe de Brumario.',
  },
  {
    slug: 'french-revolution', dia: 9, lang: 'en', campo: 'description',
    nota: 'San Sulpicio: el banquete, no un golpe que ocurrió en otro sitio',
    antes: 'We will visit the church of Saint-Sulpice, the setting of one of his coups.',
    despues: 'We will visit the church of Saint-Sulpice, where the Councils held a mass banquet in his honour three days before the Brumaire coup.',
  },
  {
    slug: 'industrial-revolution', dia: 3, lang: 'es', campo: 'description',
    nota: 'fuera York (150 km), el día se queda en la propia línea',
    antes: 'En el Museo del Ferrocarril Nacional de York (excursión), comprenderemos cómo el ferrocarril revolucionó el transporte, el comercio, el tiempo y el espacio.',
    despues: 'Nos detendremos en Rainhill, donde en 1829 unas pruebas decidieron el futuro del ferrocarril a favor de la "Rocket" de Stephenson, y en la estación de Edge Hill, la estación de pasajeros más antigua del mundo que sigue en servicio. Comprenderemos cómo el ferrocarril revolucionó el transporte, el comercio, el tiempo y el espacio.',
  },
  {
    slug: 'industrial-revolution', dia: 3, lang: 'en', campo: 'description',
    nota: 'fuera York (150 km), el día se queda en la propia línea',
    antes: 'At the National Railway Museum in York (day trip), we will understand how the railway revolutionized transport, commerce, time, and space.',
    despues: 'We will stop at Rainhill, where in 1829 a set of trials settled the future of the railway in favour of Stephenson’s "Rocket", and at Edge Hill, the oldest passenger station still in service anywhere in the world. We will understand how the railway revolutionized transport, commerce, time, and space.',
  },
  {
    slug: 'great-war-trenches', dia: 7, lang: 'es', campo: 'description',
    nota: 'Verdún y el Somme están a 240 km: el día se queda en Verdún',
    antes: 'Visitaremos cementerios y memoriales alemanes cerca de Verdún y el Somme.',
    despues: 'Visitaremos cementerios y memoriales alemanes del sector de Verdún, como el de Consenvoye.',
  },
  {
    slug: 'great-war-trenches', dia: 7, lang: 'en', campo: 'description',
    nota: 'Verdún y el Somme están a 240 km: el día se queda en Verdún',
    antes: 'We will visit German cemeteries and memorials near Verdun and the Somme.',
    despues: 'We will visit German cemeteries and memorials in the Verdun sector, such as Consenvoye.',
  },
];

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const snap = await db.collection('experiences').get();
let hechas = 0, yaEstaban = 0, fallos = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const lang = (x.sites || []).includes('en') ? 'en' : 'es';
  const mias = C.filter((c) => c.slug === x.slug && c.lang === lang);
  if (!mias.length) continue;

  const it = [...(x.itinerary || [])];
  let tocado = false;

  for (const c of mias) {
    const d = it[c.dia - 1];
    if (!d) { console.error(`  ${doc.id} d${c.dia}: no existe. Se omite.`); fallos++; continue; }
    const v = d[c.campo] || '';
    if (v.includes(c.despues)) { console.log(`  ${doc.id} d${c.dia}: ya corregido (${c.nota}).`); yaEstaban++; continue; }
    if (!v.includes(c.antes)) { console.error(`  ${doc.id} d${c.dia}: no casa el texto original. Se omite.`); fallos++; continue; }
    it[c.dia - 1] = { ...d, [c.campo]: v.replace(c.antes, c.despues) };
    console.log(`\n  ${doc.id} d${c.dia}  ${c.nota}\n    - ${c.antes}\n    + ${c.despues}`);
    hechas++; tocado = true;
  }

  if (tocado && WRITE) await doc.ref.update({ itinerary: it });
}

console.log(`\n${hechas} corrección(es) ${WRITE ? 'aplicadas' : 'a aplicar (dry-run)'}, ${yaEstaban} ya estaban, ${fallos} fallo(s).`);
if (!WRITE && hechas) console.log('Aplicar con --write.');
process.exit(fallos ? 1 : 0);
