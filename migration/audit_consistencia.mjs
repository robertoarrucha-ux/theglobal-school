// Audita contradicciones INTERNAS de cada experiencia: cifras del texto contra los
// campos estructurados, duracion contra fechas, itinerario contra dias, temporada
// contra mes, y divergencias entre la version ES y la EN del mismo slug.
// Solo lectura. No corrige nada.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
const key = fs.readdirSync('.').find(f => /firebase-adminsdk.*\.json$/.test(f));
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key,'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const dias = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const mes = (iso) => new Date(iso + 'T00:00:00').getMonth() + 1;
const problemas = [];
const add = (slug, sites, tipo, msg) => problemas.push({ slug, sites, tipo, msg });

const snap = await db.collection('experiences').get();
const porSlug = {};

snap.forEach((d) => {
  const x = d.data();
  const sites = (x.sites || []).join('/') || 'both';
  const id = x.slug;
  (porSlug[id] ||= []).push(x);
  const eds = x.editions || [];

  // A. durationDays contra el intervalo de cada edicion
  eds.forEach((e) => {
    if (!e.startDate || !e.endDate) return;
    const d1 = dias(e.startDate, e.endDate) + 1;
    if (x.durationDays && d1 !== x.durationDays)
      add(id, sites, 'duración', `durationDays=${x.durationDays} pero ${e.season} va ${e.startDate}→${e.endDate} = ${d1} días`);
  });
  // ...y que las dos ediciones duren lo mismo
  if (eds.length === 2 && eds.every((e) => e.startDate && e.endDate)) {
    const l = eds.map((e) => dias(e.startDate, e.endDate) + 1);
    if (l[0] !== l[1]) add(id, sites, 'duración', `las dos salidas duran distinto: ${l[0]} y ${l[1]} días`);
  }

  // B. temporada contra mes (hemisferio norte)
  eds.forEach((e) => {
    if (!e.startDate) return;
    const m = mes(e.startDate);
    const esVerano = m >= 6 && m <= 9;
    const esInvierno = m === 12 || m <= 3;
    if (e.season === 'summer' && !esVerano) add(id, sites, 'temporada', `salida 'summer' empieza en mes ${m} (${e.startDate})`);
    if (e.season === 'winter' && !esInvierno) add(id, sites, 'temporada', `salida 'winter' empieza en mes ${m} (${e.startDate})`);
  });

  // C. año de las ediciones
  eds.forEach((e) => {
    const y = e.startDate ? new Date(e.startDate + 'T00:00:00').getFullYear() : null;
    if (y && y !== 2027) add(id, sites, 'año', `salida ${e.season} en ${y}, no 2027 (${e.startDate})`);
  });

  // D. startDate/endDate de nivel superior deben coincidir con alguna edicion
  if (eds.length && x.startDate && !eds.some((e) => e.startDate === x.startDate))
    add(id, sites, 'fechas', `startDate=${x.startDate} no coincide con ninguna salida (${eds.map((e) => e.startDate).join(', ')})`);

  // E. itinerario contra durationDays
  const it = x.itinerary || [];
  if (it.length && x.durationDays && it.length !== x.durationDays)
    add(id, sites, 'itinerario', `${it.length} días de itinerario pero durationDays=${x.durationDays}`);
  // dias duplicados o saltados
  if (it.length) {
    const nums = it.map((i) => i.day).filter((n) => typeof n === 'number');
    const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
    if (dup.length) add(id, sites, 'itinerario', `días repetidos: ${[...new Set(dup)].join(', ')}`);
    const esperado = [...Array(nums.length).keys()].map((n) => n + 1);
    if (nums.length && JSON.stringify([...nums].sort((a, b) => a - b)) !== JSON.stringify(esperado))
      add(id, sites, 'itinerario', `numeración no consecutiva: ${[...nums].sort((a, b) => a - b).join(',')}`);
  }

  // F. cifras dentro del texto contra los campos
  const textos = [...(x.included || []), ...(x.notIncluded || []), ...(x.highlights || [])];
  textos.forEach((t) => {
    const s = String(t);
    const noches = s.match(/(\d+)\s*noches?/i) || s.match(/(\d+)\s*nights?/i);
    if (noches && eds[0]?.startDate && eds[0]?.endDate) {
      const esperadas = dias(eds[0].startDate, eds[0].endDate);
      if (+noches[1] !== esperadas) add(id, sites, 'noches', `"${s.slice(0, 60)}" pero las fechas dan ${esperadas} noches`);
    }
    const d = s.match(/(\d+)\s*d[íi]as?/i) || s.match(/(\d+)\s*days?/i);
    if (d && x.durationDays && +d[1] !== x.durationDays)
      add(id, sites, 'días en texto', `"${s.slice(0, 60)}" pero durationDays=${x.durationDays}`);
    const cap = s.match(/m[áa]x\.?\s*(\d+)/i) || s.match(/max\.?\s*(\d+)/i);
    if (cap && x.capacity && +cap[1] !== x.capacity)
      add(id, sites, 'capacidad', `"${s.slice(0, 60)}" pero capacity=${x.capacity}`);
  });

  // G. idioma declarado contra el sitio
  if (sites === 'en' && /espa[ñn]ol/i.test(x.language || '')) add(id, sites, 'idioma', `doc EN con language="${x.language}"`);
  if (sites === 'es' && /^english$/i.test((x.language || '').trim())) add(id, sites, 'idioma', `doc ES con language="${x.language}"`);
});

// H. divergencias entre ES y EN del mismo slug
for (const [slug, docs] of Object.entries(porSlug)) {
  if (docs.length < 2) continue;
  // city y country quedan fuera a proposito: DEBEN diferir entre idiomas
  // (Berlin/Berlín, Florence/Florencia). Compararlos generaba 31 falsos positivos.
  // Lo que si es un fallo es que esten cruzados, y eso se comprueba abajo.
  for (const campo of ['durationDays', 'capacity', 'format', 'type']) {
    const vals = [...new Set(docs.map((d) => JSON.stringify(d[campo] ?? null)))];
    if (vals.length > 1) add(slug, 'es+en', 'ES≠EN', `${campo}: ${vals.join(' vs ')}`);
  }
  const fechas = [...new Set(docs.map((d) => JSON.stringify((d.editions || []).map((e) => `${e.season}:${e.startDate}→${e.endDate}`))))];
  if (fechas.length > 1) add(slug, 'es+en', 'ES≠EN', `fechas distintas entre idiomas`);

  // Idioma cruzado: nombre en ingles dentro del doc ES, o al reves.
  const esDoc = docs.find((d) => (d.sites || []).includes('es'));
  const enDoc = docs.find((d) => (d.sites || []).includes('en'));
  const pareceEs = (t) => /[áéíóúñ]/i.test(String(t)) || /^(Europa|Francia|Italia|Grecia|Alemania|Reino Unido|B[eé]lgica|Suiza)/i.test(String(t));
  const pareceEn = (t) => /^(Europe|France|Italy|Greece|Germany|United Kingdom|Belgium|Switzerland|Northern Europe)$/i.test(String(t))
    || /^(Normandy|Florence|Stockholm|Athens|Ghent|Brussels|Rome|Mainz|Paris|Berlin|Vienna|Munich|Prague|Manchester|London)$/i.test(String(t));
  if (esDoc && (pareceEn(esDoc.city) || pareceEn(esDoc.country)))
    add(slug, 'es', 'idioma cruzado', `doc ES con nombre en inglés: ${esDoc.city} / ${esDoc.country}`);
  if (enDoc && (pareceEs(enDoc.city) || pareceEs(enDoc.country)))
    add(slug, 'en', 'idioma cruzado', `doc EN con nombre en español: ${enDoc.city} / ${enDoc.country}`);
}

console.log(`Experiencias revisadas: ${snap.size}\n`);
if (!problemas.length) { console.log('Sin contradicciones.'); process.exit(0); }
const porTipo = {};
problemas.forEach((p) => (porTipo[p.tipo] ||= []).push(p));
for (const [tipo, arr] of Object.entries(porTipo)) {
  console.log(`\n### ${tipo} (${arr.length})`);
  arr.forEach((p) => console.log(`  ${p.slug} [${p.sites}]: ${p.msg}`));
}
console.log(`\nTotal: ${problemas.length} incidencias`);
process.exit(0);
