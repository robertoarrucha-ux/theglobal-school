// Coherencia interna de cada día del itinerario. Complementa audit_itinerarios.mjs,
// que mira el viaje entero; esto mira dentro de un día y entre días contiguos.
//
// Busca los dos fallos que rompieron Carlos V y WW2:
//
//  1. JORNADA PARTIDA: el título de un día nombra dos sitios separados por más
//     de 120 km. El caso original: "Gante y Aquisgrán" metía dos países y 168
//     km en una jornada, y hubo que partirlo en dos excursiones.
//
//  2. TRASLADO REDUNDANTE: el texto anuncia viajar a la ciudad en la que ya se
//     está. El caso original: el día 2 de WW2 abría con "Viaje a Caen" cuando
//     el día 1 ya dormía allí, y el día de Yuste decía "Vuelo de regreso a
//     España" con España como etapa anterior.
//
// Se mira el TÍTULO y los traslados explícitos, no cualquier ciudad mencionada:
// un día puede hablar de Londres sin ir a Londres. "Regreso a X" no se cuenta,
// que es como termina una excursión bien planteada.
//
// Solo lectura.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

// Si se añade una ciudad en audit_itinerarios.mjs, añadirla aquí también: lo
// que no está en la tabla es invisible para el chequeo. Sin "caen", que en
// español choca con el verbo.
const C = {
  roma:[41.90,12.50], lyon:[45.76,4.84], alesia:[47.54,4.50], alejandria:[31.20,29.92],
  paris:[48.86,2.35], versalles:[48.80,2.13], fontainebleau:[48.40,2.70],
  estocolmo:[59.33,18.07], copenhague:[55.68,12.57], munich:[48.14,11.58],
  florencia:[43.77,11.26], siena:[43.32,11.33], venecia:[45.44,12.32], murano:[45.46,12.35],
  berlin:[52.52,13.40], bruselas:[50.85,4.35], atenas:[37.98,23.73],
  corinto:[37.94,22.93], nemea:[37.82,22.71], olimpia:[37.64,21.63],
  normandia:[49.18,-0.37], auschwitz:[50.03,19.20], nuremberg:[49.45,11.08],
  viena:[48.21,16.37], budapest:[47.50,19.04], ginebra:[46.20,6.14], ferney:[46.26,6.11],
  gante:[51.05,3.72], aquisgran:[50.78,6.08], toledo:[39.86,-4.02], madrid:[40.42,-3.70],
  manchester:[53.48,-2.24], liverpool:[53.41,-2.98], londres:[51.51,-0.13], ironbridge:[52.63,-2.49],
  ypres:[50.85,2.89], somme:[49.99,2.30], verdun:[49.16,5.38], bolonia:[44.49,11.34], milan:[45.46,9.19],
  praga:[50.08,14.44], dublin:[53.35,-6.26], maguncia:[49.99,8.25], modena:[44.65,10.93],
  estrasburgo:[48.57,7.75], frankfurt:[50.11,8.68], amberes:[51.22,4.40], cracovia:[50.06,19.94],
  beaune:[47.02,4.84], jura:[46.72,5.92], gruyeres:[46.58,7.08], rubicon:[44.10,12.40], yuste:[40.12,-5.74],
  passchendaele:[50.90,3.02], belleau:[49.07,3.29], borgona:[47.02,4.84],
};
// A diferencia de audit_itinerarios.mjs, aquí se conservan los espacios: sin
// límites de palabra "fromage" contiene "roma" y "elegante" contiene "gante".
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z]/g,' ').replace(/\s+/g,' ').trim();
const km = (a,b) => { const R=6371, dLat=(b[0]-a[0])*Math.PI/180, dLon=(b[1]-a[1])*Math.PI/180;
  const la1=a[0]*Math.PI/180, la2=b[0]*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h))); };

const RADIO = 120;   // por encima de esto, dos sitios no caben cómodos en un día
const ciudadesDe = (txt) => {
  const t = ` ${norm(txt)} `;
  return Object.keys(C).filter(k => t.includes(` ${k} `));
};

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const snap = await db.collection('experiences').get();
const docs = snap.docs.map(d => d.data()).filter(x => x.type === 'viaje' && (x.sites||[]).includes('es'));
docs.sort((a,b) => a.slug.localeCompare(b.slug));

const P = [];
for (const x of docs) {
  let posicion = null;   // dónde se duerme al empezar el día
  (x.itinerary || []).forEach((i, n) => {
    const dia = `d${n+1}`;
    const titulo = i.title || '';
    const txt = `${titulo} ${i.description || ''}`;
    const tematico = /sin traslado|jornada tem[áa]tica/i.test(txt);

    const enTitulo = ciudadesDe(titulo);
    // Traslados anunciados, sin contar el "regreso a" con el que cierra una excursión.
    const destinos = [...txt.matchAll(/\b(viaje|vuelo|traslado|llegada|excursi[óo]n|cruce)\b[^.;]{0,40}?\ba\s+(?:la\s+|el\s+|los\s+)?([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'’-]+)/gi)]
      .map((m) => ({ verbo: m[1].toLowerCase(), ciudad: ciudadesDe(m[2])[0] }))
      .filter((d) => d.ciudad);

    // 1. El título mete dos sitios lejanos en la misma jornada.
    if (!tematico) {
      for (let a = 0; a < enTitulo.length; a++) for (let b = a+1; b < enTitulo.length; b++) {
        const d = km(C[enTitulo[a]], C[enTitulo[b]]);
        if (d > RADIO) P.push(`JORNADA PARTIDA | ${x.slug} ${dia}: "${titulo}" junta ${enTitulo[a]} y ${enTitulo[b]}, a ${d} km`);
      }
      // O el título dice una cosa y el texto anuncia un traslado lejos de ella.
      const base = enTitulo[0];
      for (const d of destinos) {
        if (!base || d.ciudad === base || d.verbo === 'excursion') continue;
        const dist = km(C[base], C[d.ciudad]);
        if (dist > RADIO) P.push(`JORNADA PARTIDA | ${x.slug} ${dia}: "${titulo}" pero anuncia ${d.verbo} a ${d.ciudad}, a ${dist} km`);
      }
    }

    // 2. Anuncia traslado a donde ya se está.
    if (posicion) {
      for (const d of destinos) {
        if (d.ciudad === posicion && d.verbo !== 'excursion') {
          P.push(`TRASLADO REDUNDANTE | ${x.slug} ${dia}: anuncia ${d.verbo} a ${d.ciudad} pero ya se duerme allí. "${titulo}"`);
        }
      }
    }

    // La posición se toma del título, que es donde ocurre el día. Una excursión
    // no la mueve.
    if (!tematico && enTitulo[0] && !/excursi[óo]n/i.test(txt)) posicion = enTitulo[0];
  });
}

console.log(`=== incidencias (${P.length}) ===`);
P.length ? P.forEach(p => console.log('  ' + p)) : console.log('  ninguna');
process.exit(0);
