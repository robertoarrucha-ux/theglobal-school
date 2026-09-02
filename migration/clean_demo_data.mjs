// Limpia datos de demo que quedaron vivos en experiencias públicas.
// Caso detectado: el campamento musical arrastra un testimonio y un colaborador
// llamados "Maria" ("Maria la del barrio", texto de relleno en inglés), creados
// al probar el panel de Aliados. Publicados así restan credibilidad.
//
// Dry-run por defecto. Aplicar con: node migration/clean_demo_data.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

// Un item es de demo si su autor/nombre es exactamente "Maria" y además apunta a
// la foto de plantilla o a la organización inventada. Deliberadamente estricto:
// no queremos borrar un testimonio real de alguien que se llame María.
const isDemoTestimonial = (t) =>
  (t?.author || '').trim().toLowerCase() === 'maria' &&
  (/maria la del barrio/i.test(t?.org || '') || /Maria-Cool-Team/i.test(t?.photo || ''));
const isDemoCollaborator = (c) =>
  (c?.name || '').trim().toLowerCase() === 'maria' || /Maria-Cool-Team/i.test(c?.imageUrl || '');

const snap = await db.collection('experiences').get();
let changed = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const tIn = x.testimonials || [];
  const cIn = x.collaborators || [];
  const tOut = tIn.filter((t) => !isDemoTestimonial(t));
  const cOut = cIn.filter((c) => !isDemoCollaborator(c));
  if (tOut.length === tIn.length && cOut.length === cIn.length) continue;

  changed++;
  console.log(`\n${x.slug} [${(x.sites || []).join('/') || 'both'}]  (doc ${doc.id})`);
  tIn.filter(isDemoTestimonial).forEach((t) => console.log(`  - testimonio: "${String(t.quote).slice(0, 60)}…" por ${t.author} / ${t.org}`));
  cIn.filter(isDemoCollaborator).forEach((c) => console.log(`  - colaborador: ${c.name} (${c.imageUrl})`));

  if (WRITE) {
    // update() solo toca estos dos campos: no reescribe el documento entero.
    await doc.ref.update({ testimonials: tOut, collaborators: cOut });
    console.log('  → aplicado');
  }
}

console.log(`\n${changed} documento(s) afectado(s). ${WRITE ? 'Cambios aplicados.' : 'Dry-run: nada se escribió (usa --write).'}`);
process.exit(0);
