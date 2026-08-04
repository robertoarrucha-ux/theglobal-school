// DRY-RUN: transforma las expediciones de Viajes al modelo unificado Experience.
// NO escribe en Firestore. Solo genera migration/experiences_preview.json + resumen.
// Ejecutar: node --experimental-strip-types migration/transform_expeditions.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = resolve(__dir, '..');

const { expeditions } = await import(resolve(BASE, 'Viajes.theglobal.school/src/lib/data.ts'));

// mapping id-de-imagen -> URL real (de Viajes)
import { readFileSync } from 'node:fs';
const imgMap = {};
JSON.parse(readFileSync(resolve(BASE, 'migration/viajes-images.json'))).images.forEach((i) => (imgMap[i.id] = i.imageUrl || i.url));

const KEEP = new Set(['webp', 'gif', 'svg']);
const toDownload = new Set();
// resuelve un id/URL de imagen a una ruta local /media/, y registra la descarga si es de theglobal.school
function resolveImg(idOrUrl) {
  if (!idOrUrl) return '';
  let url = imgMap[idOrUrl] || idOrUrl; // si es un id, resolver; si ya es URL, usar
  if (!url.includes('wp-content/uploads/')) return url; // externa (picsum, etc.) → dejar tal cual
  const after = url.split('wp-content/uploads/')[1].split('?')[0];
  const [stem, ext] = [after.replace(/\.[^.]+$/, ''), (after.split('.').pop() || '').toLowerCase()];
  const local = '/media/' + (KEEP.has(ext) ? after : `${stem}.webp`);
  toDownload.add(url);
  return local;
}

function toExperience(x) {
  const spotsLeft = Math.max(0, (x.maxParticipants ?? 0) - (x.currentParticipants ?? 0));
  const highlights = [
    `Itinerario guiado de ${x.itinerary?.length ?? 0} días`,
    `Grupo reducido (máx. ${x.maxParticipants} participantes)`,
    x.preWork?.items?.length ? `Pre-work curado: ${x.preWork.items.length} recursos` : 'Materiales de preparación incluidos',
    x.pricingTiers?.length ? 'Descuentos por grupo disponibles' : null,
  ].filter(Boolean);

  return {
    slug: x.slug,
    type: 'viaje',
    title: x.title,
    summary: (x.leader?.narrative || x.rationale?.importance || '').slice(0, 180),
    description: [x.leader?.narrative, x.rationale?.importance].filter(Boolean).join('\n\n'),
    coverImageUrl: resolveImg(x.images?.hero) || '',
    gallery: (x.images?.gallery || []).map(resolveImg),
    city: x.cities?.[0] || x.location,
    country: x.location,
    cities: x.cities || [],
    format: 'presencial',
    startDate: x.dates?.start || '',
    endDate: x.dates?.end || '',
    durationDays: x.itinerary?.length ?? 0,
    publicPrice: x.basePrice ?? 0,
    currency: 'EUR',
    capacity: x.maxParticipants,
    spotsLeft,
    language: 'Español',
    paymentMode: 'platform',
    publisher: { name: 'The New Global School', type: 'tgs' },
    highlights,
    category: x.category,
    leader: x.leader,
    rationale: x.rationale,
    itinerary: (x.itinerary || []).map((d) => ({ day: d.day, title: d.title, description: d.description, relevance: d.relevance })),
    pricingTiers: x.pricingTiers || [],
    preWork: x.preWork || null,
    status: 'scheduled',
    votes: 0,
    voteThreshold: 0,
    // metadatos de import
    _source: 'viajes-expeditions',
    _importId: `exp-${x.slug}`,
    publisherType: 'tgs',
    publicListed: true,
    programStatus: 'published',
  };
}

const mapped = expeditions.map(toExperience);
// preview completo (con metadatos de import) para el paso de Firestore
writeFileSync(resolve(BASE, 'migration/experiences_preview.json'), JSON.stringify(mapped, null, 2));
// versión limpia (solo campos de Experience) para que Astro la renderice ya
const IMPORT_META = new Set(['_source', '_importId', 'publisherType', 'publicListed', 'programStatus']);
const clean = mapped.map((m) => Object.fromEntries(Object.entries(m).filter(([k]) => !IMPORT_META.has(k))));
writeFileSync(resolve(BASE, 'src/data/expeditions.generated.json'), JSON.stringify(clean, null, 2));
// lista de imágenes a descargar (de theglobal.school → /media/)
writeFileSync(resolve(BASE, 'migration/expedition_media_urls.txt'), [...toDownload].join('\n') + '\n');
console.log(`Imágenes de theglobal.school a descargar: ${toDownload.size} (migration/expedition_media_urls.txt)`);

console.log(`DRY-RUN: ${mapped.length} expediciones mapeadas a Experience`);
console.log(`Escrito: migration/experiences_preview.json (NO se tocó Firestore)`);
console.log('\n=== Validación de campos requeridos ===');
const missing = mapped.filter((m) => !m.slug || !m.title || !m.coverImageUrl || !m.startDate);
console.log(`  con todos los campos clave (slug,title,cover,startDate): ${mapped.length - missing.length}/${mapped.length}`);
if (missing.length) missing.forEach((m) => console.log('   ⚠️ incompleto:', m.slug, '| cover:', !!m.coverImageUrl, '| start:', !!m.startDate));
console.log('\n=== Muestra mapeada [0] ===');
const s = mapped[0];
console.log(JSON.stringify({ slug: s.slug, title: s.title, type: s.type, city: s.city, country: s.country, price: `${s.currency} ${s.publicPrice}`, cupos: `${s.spotsLeft}/${s.capacity}`, dias: s.durationDays, category: s.category, leader: s.leader?.name, highlights: s.highlights, summary: s.summary }, null, 2));
