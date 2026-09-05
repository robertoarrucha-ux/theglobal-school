// Itinerario del Campamento de Invierno Musical (Viena 2027).
//
// Era el único viaje del catálogo que vendía un programa sin publicar ni un
// solo día, y además el más largo: 18 días, del martes 5 al viernes 22 de enero
// de 2027.
//
// Se estructura por semanas y no por días, porque en 18 días el desglose diario
// sería repetitivo: de lunes a viernes el ritmo se repite (mañanas de clase
// individual, tardes de taller). Los bloques siguen el calendario real:
//
//   Semana 1  días  1–6   martes 5 a domingo 10
//   Semana 2  días  7–13  lunes 11 a domingo 17   (Budapest el sábado 16)
//   Semana 3  días 14–18  lunes 18 a viernes 22
//
// El contenido no se inventa: sale de las secciones "Estructura y agenda",
// "Objetivos" e "Instituciones y aliados" que la ficha ya publica. La
// expedición a Budapest cae en sábado, que es lo que dice la agenda ("Día 11"
// contado desde la llegada) y encaja con que las clases sean de lunes a viernes.
//
// Dos cosas de la agenda original que NO se trasladan, y conviene revisar:
//  - El "picnic en los jardines de Schönbrunn": esto es Viena en enero, con
//    máximas de unos 3 grados. Aquí queda como visita a Schönbrunn.
//  - Las alianzas con mdw, Musikverein, Haus der Musik y las de Budapest están
//    descritas en la ficha como "se gestiona la colaboración", o sea en
//    negociación. El itinerario solo repite lo que la ficha ya promete en firme
//    en Objetivos y en los highlights, sin dar por cerrado ningún convenio.
//
// Dry-run por defecto. Aplicar con: node migration/set_itinerario_campamento.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const DOC = 'campamento-de-invierno-musical';

const ITINERARIO = [
  {
    day: 1,
    label: 'Semana 1 · días 1–6',
    title: 'Llegada, Apertura y Primeras Clases',
    description: 'Llegada a Viena y traslado al alojamiento. Al día siguiente, recepción y ceremonia oficial de apertura en la sede de VSQI, seguida de un recorrido por el Distrito 1, el casco histórico donde vivieron, estrenaron y murieron Haydn, Mozart, Beethoven, Schubert y Brahms. Desde ahí arranca el ritmo del programa: mañanas de 09:00 a 13:00 de clase individual de instrumento, tardes de 15:00 a 18:00 con los primeros talleres. El fin de semana es de integración del grupo, con una salida al Prater.',
    relevance: 'Las primeras clases individuales sirven para fijar el punto de partida de cada estudiante. Todo lo que viene después, el examen de competencias incluido, se construye sobre ese diagnóstico.',
  },
  {
    day: 2,
    label: 'Semana 2 · días 7–13',
    title: 'El Núcleo del Programa y la Expedición a Budapest',
    description: 'La semana de más carga. Las mañanas siguen siendo de clase individual y las tardes rotan entre masterclass por instrumento, composición y dirección de orquesta, Music Business, identidad y visión artística, y psicología y resiliencia del músico de alto rendimiento. Se intercalan las visitas técnicas: la Wiener Staatsoper por dentro y los laboratorios de experimentación sonora de la Haus der Musik. El sábado, expedición de día completo a Budapest en tren Railjet, con la Casa de la Música Húngara, la Ópera Estatal de Hungría y la Academia Liszt.',
    relevance: 'Budapest no es una excursión turística. Viena y Budapest fueron las dos capitales del mismo imperio y resolvieron de forma distinta la misma pregunta, cómo se sostiene una institución musical. Verlas una detrás de otra convierte la visita en un caso de estudio.',
  },
  {
    day: 3,
    label: 'Semana 3 · días 14–18',
    title: 'Evaluación, Recital Final y Clausura',
    description: 'La última semana gira en torno al recital final. Las clases individuales pasan a trabajar el repertorio que se va a tocar y los talleres cierran con el examen de competencias de VPMA, el que da la segunda acreditación. Se incluyen la visita guiada de acústica al Musikverein, la sala considerada la de mejor acústica del mundo, y una visita a Schönbrunn. El programa termina con la gala de clausura: recital de los alumnos, entrega de certificados y cena de despedida.',
    relevance: 'El programa no cierra con un diploma de asistencia. La certificación de VSQI se obtiene al completarlo, pero la de VPMA hay que aprobarla, y el recital final se toca delante de público.',
  },
];

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const ref = db.collection('experiences').doc(DOC);
const snap = await ref.get();
if (!snap.exists) { console.error(`No existe el documento ${DOC}.`); process.exit(1); }
const x = snap.data();

const actual = x.itinerary || [];
if (JSON.stringify(actual) === JSON.stringify(ITINERARIO)) {
  console.log('El itinerario ya está puesto.');
  process.exit(0);
}
if (actual.length) {
  console.error(`Cuidado: el documento ya tiene ${actual.length} bloque(s) de itinerario. Se sobrescriben.`);
  actual.forEach((d, i) => console.error(`  ${i + 1}. ${d.title}`));
}

console.log(`${DOC}  (${x.durationDays} días, ${x.startDate} a ${x.endDate})\n`);
ITINERARIO.forEach((d) => {
  console.log(`  [${d.label}]  ${d.title}`);
  console.log(`     ${d.description}`);
  console.log(`     ↳ ${d.relevance}\n`);
});

if (WRITE) { await ref.update({ itinerary: ITINERARIO }); console.log('Escrito.'); }
else console.log('Dry-run. Aplicar con --write.');
process.exit(0);
