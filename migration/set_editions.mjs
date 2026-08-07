// Genera 2 ediciones por viaje: Verano (Jul-Ago) e Invierno (Ene-Feb), fechas
// aleatorias, TODAS en 2027 (hoy es Ago 2026, así que futuras). Misma fecha para
// las versiones ES (exp-<slug>) y EN (exp-<slug>-en): se agrupa por slug.
// Uso:  node migration/set_editions.mjs           (dry-run)
//       node migration/set_editions.mjs --write
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATABASE_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const KEY = resolve(BASE, 'gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json');
const WRITE = process.argv.includes('--write');
const YEAR = 2027;

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const rnd = (n) => Math.floor(Math.random() * (n + 1));

// duración en días del viaje (fallback 8)
function durationOf(doc) {
  if (doc.durationDays) return doc.durationDays;
  if (doc.startDate && doc.endDate) {
    const d = Math.round((new Date(doc.endDate) - new Date(doc.startDate)) / 86400000) + 1;
    if (d > 0) return d;
  }
  return 8;
}
function makeEditions(duration) {
  // Verano: inicio Jul 1 + [0..50] días → Jul 1 a ~Ago 20
  const sStart = addDays(new Date(Date.UTC(YEAR, 6, 1)), rnd(50));
  const sEnd = addDays(sStart, duration - 1);
  // Invierno: inicio Ene 6 + [0..43] días → Ene 6 a ~Feb 18
  const wStart = addDays(new Date(Date.UTC(YEAR, 0, 6)), rnd(43));
  const wEnd = addDays(wStart, duration - 1);
  return [
    { season: 'summer', startDate: iso(sStart), endDate: iso(sEnd) },
    { season: 'winter', startDate: iso(wStart), endDate: iso(wEnd) },
  ];
}

if (!existsSync(KEY)) { console.error('Falta la service account key en la raíz.'); process.exit(1); }
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) }, 'set-editions');
const db = getFirestore(app, DATABASE_ID);

const snap = await db.collection('experiences').get();
const viajes = snap.docs.filter((d) => d.data().type === 'viaje');
// agrupar por slug (une exp-<slug> y exp-<slug>-en)
const bySlug = {};
for (const d of viajes) { const s = d.data().slug; (bySlug[s] ||= []).push(d); }

let docs = 0;
for (const slug of Object.keys(bySlug)) {
  const group = bySlug[slug];
  const duration = durationOf(group[0].data());
  const editions = makeEditions(duration);
  // primaria = invierno (la próxima cronológicamente, Ene 2027) para orden/JSON-LD
  const winter = editions.find((e) => e.season === 'winter');
  const patch = { editions, startDate: winter.startDate, endDate: winter.endDate };
  console.log(`  ${slug} (${duration}d) → V ${editions[0].startDate}…${editions[0].endDate} · I ${winter.startDate}…${winter.endDate}  [${group.length} docs]`);
  if (WRITE) for (const d of group) { await d.ref.set(patch, { merge: true }); docs++; }
}
console.log(`\n${WRITE ? `ESCRITO: ${docs} docs (${Object.keys(bySlug).length} viajes × ES/EN)` : `DRY-RUN: ${Object.keys(bySlug).length} viajes (usa --write)`}`);
process.exit(0);
