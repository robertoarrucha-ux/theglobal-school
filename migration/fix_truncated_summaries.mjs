// Repara los resúmenes cortados a media palabra.
//
// La importación de los 16 viajes nuevos truncó `summary` (la mayoría a 180 caracteres
// exactos), dejando frases partidas como "…para descubrir l". Se ve en el hero de cada
// ficha web, en la meta description y en la ficha imprimible.
//
// El texto completo sigue en `description`, así que la reparación no inventa nada: toma
// el primer párrafo de description y corta en el último final de frase que quepa.
//
// Dry-run por defecto. Aplicar con: node migration/fix_truncated_summaries.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const MAX = 260; // margen sobre los 180 originales sin desbordar la maqueta impresa

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const isTruncated = (s) => s && !/[.!?…»"')]$/.test(s.trim());

/** Corta en el último final de frase que quepa; si no hay ninguno, en la última palabra. */
function tidySummary(full, max = MAX) {
  const firstPara = full.split(/\n\s*\n/)[0].trim();
  if (firstPara.length <= max) return firstPara;
  const head = firstPara.slice(0, max + 1);
  // Final de frase = puntuación seguida de espacio (evita cortar en "e.g." o decimales)
  const m = [...head.matchAll(/[.!?…](?=\s|$)/g)];
  if (m.length) return firstPara.slice(0, m[m.length - 1].index + 1).trim();
  const cut = head.lastIndexOf(' ');
  return firstPara.slice(0, cut > 0 ? cut : max).trim() + '…';
}

const snap = await db.collection('experiences').get();
let fixed = 0, skipped = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const cur = (x.summary || '').trim();
  const full = (x.description || '').trim();
  if (!isTruncated(cur)) continue;

  // Solo reparamos si description contiene de verdad el inicio del summary:
  // así nunca sustituimos un resumen por texto de otro campo que no le corresponde.
  const head = cur.slice(0, Math.min(60, cur.length));
  if (!full || !full.includes(head)) {
    skipped++;
    console.log(`\n[SIN FUENTE] ${x.slug} [${(x.sites || []).join('/') || 'both'}]  se deja como está`);
    continue;
  }

  const next = tidySummary(full);
  if (next === cur) continue;
  fixed++;
  console.log(`\n${x.slug} [${(x.sites || []).join('/') || 'both'}]  ${cur.length} → ${next.length} car.`);
  console.log(`  antes:  …${cur.slice(-52)}`);
  console.log(`  ahora:  …${next.slice(-52)}`);

  if (WRITE) {
    await doc.ref.update({ summary: next }); // solo este campo
    console.log('  → aplicado');
  }
}

console.log(`\n${fixed} resumen(es) a reparar, ${skipped} sin fuente. ${WRITE ? 'Cambios aplicados.' : 'Dry-run: nada se escribió (usa --write).'}`);
process.exit(0);
