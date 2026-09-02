// Ajusta los logos de colaboradores en las experiencias.
//
//  1. Elimina el logo de Vienna Business Agency (/media/2018/01/logo-vienna-business-agency-1-300x300-1.webp).
//  2. Cambia el logo de Vienna School of Quality & Innovation por la versión negra:
//     el archivo anterior era blanco sobre transparente y las fichas de logos tienen
//     fondo blanco, así que resultaba invisible.
//
// Dry-run por defecto. Aplicar con: node migration/fix_logos_firestore.mjs --write
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const REMOVE = '/media/2018/01/logo-vienna-business-agency-1-300x300-1.webp';
const OLD_VS = '/media/2023/08/Vienna-School-Logo-NEW-trans.webp';
const NEW_VS = '/media/2026/01/Vienna-School-logo-black.webp';

const key = fs.readdirSync('.').find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!key) { console.error('Falta la clave de servicio en la raíz del repo.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(key, 'utf8'))) });
const db = getFirestore('ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');

const snap = await db.collection('experiences').get();
let changed = 0;

for (const doc of snap.docs) {
  const x = doc.data();
  const before = x.collaborators || [];
  if (!before.length) continue;

  const after = before
    .filter((c) => c?.imageUrl !== REMOVE)
    .map((c) => (c?.imageUrl === OLD_VS ? { ...c, imageUrl: NEW_VS } : c));

  const same = after.length === before.length && after.every((c, i) => c.imageUrl === before[i].imageUrl);
  if (same) continue;

  changed++;
  console.log(`\n${x.slug} [${(x.sites || []).join('/') || 'both'}]  ${before.length} → ${after.length} colaboradores`);
  before.filter((c) => c?.imageUrl === REMOVE).forEach((c) => console.log(`  - eliminado: ${c.name || '(sin nombre)'}`));
  before.filter((c) => c?.imageUrl === OLD_VS).forEach((c) => console.log(`  ~ logo negro: ${c.name || '(sin nombre)'}`));

  if (WRITE) {
    await doc.ref.update({ collaborators: after }); // solo este campo
    console.log('  → aplicado');
  }
}

console.log(`\n${changed} documento(s). ${WRITE ? 'Cambios aplicados.' : 'Dry-run: nada se escribió (usa --write).'}`);
process.exit(0);
