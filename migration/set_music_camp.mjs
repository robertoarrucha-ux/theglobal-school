// Completa la experiencia del campamento musical con la info del Google Slides "High Music".
// Dry-run por defecto; --write para aplicar. DB no-default (experiences).
import { readFileSync, readdirSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DB_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const DOC_ID = 'campamento-de-invierno-musical';
const WRITE = process.argv.includes('--write');

const data = {
  title: 'Campamento de Invierno Musical: Viena 2027',
  type: 'viaje',
  summary: 'Programa de inmersión musical de 18 días en Viena, la capital mundial de la música: clases individuales, masterclasses en instituciones vienesas, Music Business e innovación, acreditación europea y una expedición a Budapest.',
  description: 'Un programa de inmersión total de 18 días con sede en Viena, la capital mundial de la música. Los estudiantes viven una experiencia híbrida que combina el rigor técnico de los conservatorios europeos con módulos de innovación y gestión musical (Music Business), además de visitas y conferencias magistrales con figuras emblemáticas de la música europea y mundial. Inicia el 5 de enero de 2027.',
  city: 'Viena',
  country: 'Austria',
  cities: ['Viena', 'Budapest'],
  format: 'presencial',
  language: 'Español',
  durationDays: 18,
  startDate: '2027-01-05',
  endDate: '2027-01-22',
  editions: [{ season: 'winter', startDate: '2027-01-05', endDate: '2027-01-22' }],
  publicPrice: 4900,
  currency: 'EUR',
  publisherType: 'tgs',
  publicListed: true,
  layout: 'viaje',
  highlights: [
    '18 días de inmersión total en Viena, capital mundial de la música',
    'Masterclasses con maestros vinculados a instituciones vienesas',
    'Acreditación europea VSQI y VPMA',
    'Music Business, innovación y tecnología musical',
    'La música en sus recintos originales: Musikverein, Ópera de Viena, Academia Liszt',
    'Expedición a Budapest: Casa de la Música Húngara y Ópera Estatal',
  ],
  included: [
    'Todas las actividades del Campamento de Invierno Musical Viena 2027',
    'Vuelo redondo CDMX, Viena (escala en Madrid)',
    'Seguro básico de gastos médicos (reembolso por servicios hospitalarios)',
    '26 noches de hospedaje individual en pensión o residencias estudiantiles, con acceso a cocina',
    'Cena de bienvenida y cena de despedida',
    'Material de trabajo y salas de trabajo',
    'Sesión de fotos',
    'Pase de transporte público ilimitado durante el programa',
  ],
  notIncluded: [
    'Alimentos (aprox. 20 a 40 euros por semana)',
    'Souvenirs, regalos y turismo personal',
  ],
  sections: [
    {
      title: '¿Por qué Viena?',
      md: 'Viena es la única ciudad donde la densidad de genios musicales por metro cuadrado ha sido inigualable: hogar de Haydn, Mozart, Beethoven, Schubert, Brahms, Mahler y Strauss.\n\n- **El Sonido de Viena (Wiener Klangstil):** una tradición interpretativa única que instituciones como la Filarmónica de Viena preservan.\n- **Infraestructura de clase mundial:** el Musikverein, considerada la sala con mejor acústica del mundo, y la Wiener Staatsoper, con ópera y ballet 300 días al año.\n- **Capital del Music Business:** nodo estratégico de gestión cultural, derechos de autor, tecnología sonora y educación disruptiva.',
    },
    {
      title: 'Objetivos',
      md: '- **Acreditación europea:** certificación de VSQI (Vienna School of Quality & Education) al completar el programa, y VPMA (Vienna Premier Music Academy) al aprobar un examen de competencias.\n- **Perfeccionamiento técnico:** masterclasses con maestros vinculados a las principales instituciones vienesas.\n- **Mentalidad de innovación:** herramientas tecnológicas y de Music Business para el artista moderno.\n- **Inmersión histórica:** vivir la música en sus recintos originales (Musikverein, Ópera de Viena, Academia Liszt).',
    },
    {
      title: 'Estructura y agenda',
      md: '**Día 0:** arribo a Viena y traslado al alojamiento.\n**Día 1:** recepción y bienvenida, ceremonia oficial en la sede de VSQI y recorrido por el Distrito 1 (casco histórico).\n**Días 2 a 18:** ciclo de capacitación en Viena (talleres, masterclasses y visitas).\n**Día 11:** expedición a Budapest en tren (Railjet), visita y recorrido cultural.\n**Día 18:** gala de clausura, recital final de alumnos, entrega de certificados y cena de despedida.\n\n**Ritmo diario (lunes a viernes):** mañanas (09:00 a 13:00) clases individuales; tardes (15:00 a 18:00) talleres de Music Business, masterclass por instrumento, composición y dirección de orquesta, identidad y visión artística, y psicología y resiliencia del músico de alto rendimiento, además de visitas técnicas (Wiener Staatsoper, Haus der Musik). Integración en el Prater y picnic en los jardines de Schönbrunn.',
    },
    {
      title: 'Instituciones y aliados',
      md: 'Para asegurar el prestigio de la certificación se gestiona la colaboración con:\n\n**En Viena:**\n- mdw (Universidad de Música y Arte Dramático de Viena), para maestros de masterclass.\n- Musikverein (Gesellschaft der Musikfreunde), para visitas guiadas de acústica.\n- Vienna Premier Music Academy, para la validación de estándares de evaluación.\n- Haus der Musik, socio estratégico para talleres de experimentación sonora.\n\n**En Budapest:**\n- Casa de la Música Húngara (Magyar Zene Háza), laboratorios interactivos de educación musical.\n- Ópera Estatal de Hungría, estudio comparativo de gestión de teatros líricos.',
    },
  ],
  updatedAt: new Date().toISOString(),
};

const key = readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
const cred = JSON.parse(readFileSync(key, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(cred), projectId: cred.project_id });
const db = getFirestore(getApps()[0], DB_ID);

const ref = db.collection('experiences').doc(DOC_ID);
const cur = await ref.get();
if (!cur.exists) { console.error('No existe el doc', DOC_ID); process.exit(1); }
console.log('Doc actual title:', cur.data().title, '| cover:', cur.data().coverImageUrl || '(vacío)');
console.log('\nSe actualizará a:');
console.log('  title:', data.title);
console.log('  fechas:', data.startDate, 'a', data.endDate, '| duración:', data.durationDays, 'días');
console.log('  ciudades:', data.cities.join(', '), '| formato:', data.format);
console.log('  highlights:', data.highlights.length, '| included:', data.included.length, '| notIncluded:', data.notIncluded.length, '| sections:', data.sections.length);
console.log('  (coverImageUrl NO se toca en este script)');
if (WRITE) { await ref.set(data, { merge: true }); console.log('\n✅ Escrito.'); }
else console.log('\nDRY-RUN. Añade --write para aplicar.');
process.exit(0);
