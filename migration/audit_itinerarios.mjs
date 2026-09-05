// Plausibilidad operativa de los itinerarios: detecta traslados que el calendario
// no aguanta. Mide el salto real entre ciudades consecutivas con coordenadas,
// cuenta traslados por viaje y marca destinos fuera de Europa.
// Solo lectura.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
const key = fs.readdirSync('.').find(f => /firebase-adminsdk.*\.json$/.test(f));
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key,'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

// Coordenadas de las ciudades y sitios que aparecen en los itinerarios.
const C = {
  roma:[41.90,12.50], lyon:[45.76,4.84], alesia:[47.54,4.50], alejandria:[31.20,29.92], alexandria:[31.20,29.92],
  paris:[48.86,2.35], versalles:[48.80,2.13], versailles:[48.80,2.13], fontainebleau:[48.40,2.70],
  estocolmo:[59.33,18.07], stockholm:[59.33,18.07], copenhague:[55.68,12.57], copenhagen:[55.68,12.57],
  munich:[48.14,11.58], florencia:[43.77,11.26], florence:[43.77,11.26], siena:[43.32,11.33], venecia:[45.44,12.32], venice:[45.44,12.32],
  berlin:[52.52,13.40], bruselas:[50.85,4.35], brussels:[50.85,4.35], atenas:[37.98,23.73], athens:[37.98,23.73],
  corinto:[37.94,22.93], corinth:[37.94,22.93], nemea:[37.82,22.71], olimpia:[37.64,21.63], olympia:[37.64,21.63],
  normandia:[49.18,-0.37], normandy:[49.18,-0.37], auschwitz:[50.03,19.20], nuremberg:[49.45,11.08], nuremberg2:[49.45,11.08],
  viena:[48.21,16.37], vienna:[48.21,16.37], budapest:[47.50,19.04], ginebra:[46.20,6.14], geneva:[46.20,6.14],
  gante:[51.05,3.72], ghent:[51.05,3.72], aquisgran:[50.78,6.08], aachen:[50.78,6.08], toledo:[39.86,-4.02],
  manchester:[53.48,-2.24], liverpool:[53.41,-2.98], londres:[51.51,-0.13], london:[51.51,-0.13],
  ypres:[50.85,2.89], somme:[49.99,2.30], verdun:[49.16,5.38], bolonia:[44.49,11.34], bologna:[44.49,11.34],
  praga:[50.08,14.44], prague:[50.08,14.44], dublin:[53.35,-6.26], maguncia:[49.99,8.25], mainz:[49.99,8.25],
  estrasburgo:[48.57,7.75], strasbourg:[48.57,7.75], frankfurt:[50.11,8.68], amberes:[51.22,4.40], antwerp:[51.22,4.40],
  beaune:[47.02,4.84], jura:[46.72,5.92], gruyeres:[46.58,7.08], rubicon:[44.10,12.40], egipto:[31.20,29.92], egypt:[31.20,29.92],
  // Faltaban en la primera versión, y por eso la auditoría no vio que estos
  // sitios se visitaban sin figurar en los destinos. Cualquier ciudad ausente
  // de esta tabla es invisible para el chequeo: añadir al encontrar una nueva.
  madrid:[40.42,-3.70], milan:[45.46,9.19], yuste:[40.12,-5.74],
  cracovia:[50.06,19.94], krakow:[50.06,19.94], ironbridge:[52.63,-2.49],
  passchendaele:[50.90,3.02], belleau:[49.07,3.29],
};
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'');
const km = (a,b) => { const R=6371, dLat=(b[0]-a[0])*Math.PI/180, dLon=(b[1]-a[1])*Math.PI/180;
  const la1=a[0]*Math.PI/180, la2=b[0]*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h))); };

const findCity = (txt) => {
  const n = norm(txt);
  const hits = Object.keys(C).filter(k => n.includes(k) && k.length > 3);
  return hits.sort((a,b)=>b.length-a.length)[0] || null;
};

const P = [];
const snap = await db.collection('experiences').get();
const resumen = [];

snap.forEach((d) => {
  const x = d.data();
  if (x.type !== 'viaje' || !(x.sites||[]).includes('es')) return;
  const it = x.itinerary || [];
  if (!it.length) return;

  let traslados = 0, fuera = [], saltos = [];
  let prev = null;
  const enItinerario = new Set();
  it.forEach((i) => {
    const txt = `${i.title} ${i.description||''}`;
    // Un dia declarado tematico no implica traslado ni salto: se excluye del calculo.
    const tematico = /sin traslado|no travel|jornada tem[áa]tica|thematic day/i.test(txt);
    if (!tematico && /vuelo|traslado|viaje a|regreso a|nos trasladamos/i.test(txt)) traslados++;
    if (tematico) return;
    const c = findCity(txt);
    if (c) {
      if (C[c][0] < 34 || C[c][1] > 45) fuera.push(`día ${i.day}: ${c}`);
      if (prev && prev.c !== c) {
        const dist = km(C[prev.c], C[c]);
        if (dist > 900) saltos.push(`día ${prev.day}→${i.day} ${prev.c}→${c}: ${dist} km`);
      }
      enItinerario.add(c);
      prev = { c, day: i.day };
    }
  });

  resumen.push(`  ${x.slug.slice(0,30).padEnd(31)} ${x.durationDays}d  ${String(traslados).padStart(2)} traslados  ${(x.cities||[]).length} ciudades`);
  if (fuera.length) P.push(`FUERA DE EUROPA | ${x.slug}: ${fuera.join('; ')}`);
  if (saltos.length) P.push(`SALTO LARGO | ${x.slug}: ${saltos.join('; ')}`);
  if (traslados > x.durationDays / 2) P.push(`DEMASIADOS TRASLADOS | ${x.slug}: ${traslados} en ${x.durationDays} días`);
  // Inverso del primer chequeo: se visita una ciudad que no figura como destino.
  const declaradas = new Set((x.cities||[]).map(c => norm(c)));
  const noDeclaradas = [...enItinerario].filter(c => ![...declaradas].some(d => d.includes(c) || c.includes(d)));
  if (noDeclaradas.length) P.push(`VISITA NO DECLARADA | ${x.slug}: ${noDeclaradas.join(', ')} aparece en el itinerario pero no en los destinos`);
});

console.log('=== resumen por viaje ===');
resumen.sort().forEach(r=>console.log(r));
console.log(`\n=== incidencias (${P.length}) ===`);
P.length ? P.sort().forEach(p=>console.log('  '+p)) : console.log('  ninguna');
process.exit(0);
