// Extrae los perfiles de nominados de los Latin American Leaders Awards (contenido TNGS migrado)
// a JSON estructurado, para sembrar el archivo histórico en awards.pro-latam.org (Firestore, proyecto apex-vote).
//
// El premio lo organiza Pro-Latam; The New Global School es partner co-organizador. La ficha canónica
// vive en awards.pro-latam.org; esta extracción es el puente de datos (el contenido solo existe en TNGS).
//
// Uso:
//   node migration/extract_lala_nominees.mjs            # dry-run: solo piloto, imprime muestra
//   node migration/extract_lala_nominees.mjs --all      # procesa todos los perfiles de nominado
//   node migration/extract_lala_nominees.mjs --all --write   # escribe migration/lala_nominees.json

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('content');
const PILOT = new Set([
  'alerta-isla-riesco-chile-nominados-2022-latin-american-leaders-awards',
  'ingrid-orozco-latin-american-social-leaders-awards',
]);

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const WRITE = args.includes('--write');

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function frontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: txt };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^"(.*)"$/, '$1');
    if (v.startsWith('[') && v.endsWith(']')) {
      try { v = JSON.parse(v.replace(/'/g, '"')); } catch { /* keep string */ }
    }
    fm[kv[1]] = v;
  }
  return { fm, body: m[2] };
}

const NOMINEE = /nominad|nominee|social leaders awards|leaders awards.*nominad/i;
const stripMd = (s) => s.replace(/\*\*/g, '').replace(/\\$/, '').replace(/\s+$/, '').trim();
// Quita enlaces markdown [texto](url) -> texto y devuelve el texto plano.
const stripLinks = (s) => s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1');
const urlsIn = (s) => [...s.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]).filter((u) => /^https?:/.test(u));
const ROLE_KW = /director|ceo|fundador|founder|co-?founder|gerente|manager|presidente|president|coordinador|jefe|head|guionista|productor|l[íi]der|consultor|abogad|ingenier|profesor|investigador|secretari|ministr|gobernador|viceministr/i;

const COUNTRIES = ['México', 'Mexico', 'Colombia', 'Chile', 'Perú', 'Peru', 'Argentina', 'Brasil', 'Brazil', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Venezuela', 'Panamá', 'Panama', 'Costa Rica', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'República Dominicana', 'Cuba', 'Puerto Rico', 'Estados Unidos', 'EEUU', 'USA', 'España', 'Spain', 'Austria'];
const NORM = { Mexico: 'México', Peru: 'Perú', Brazil: 'Brasil', Panama: 'Panamá', EEUU: 'Estados Unidos', USA: 'Estados Unidos', Spain: 'España' };
function detectCountry(headerLines) {
  const hay = headerLines.join(' | ');
  for (const c of COUNTRIES) { const re = new RegExp('\\b' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); if (re.test(hay)) return NORM[c] || c; }
  return '';
}

// Limpia el nombre: primer segmento antes de cargo/organización/lugar.
function cleanName(raw) {
  let s = stripMd(raw);
  s = s.split('[')[0].trim(); // corta en el primer enlace markdown (organización/lugar pegado) ANTES de desarmarlo
  const cuts = [' – ', ' - ', ' — ', '  '];
  for (const c of cuts) { const idx = s.indexOf(c); if (idx > 2) s = s.slice(0, idx); }
  const m = s.match(ROLE_KW);
  if (m && m.index > 2) s = s.slice(0, m.index);
  const words = s.trim().split(/\s+/);
  if (words.length > 6) s = words.slice(0, 6).join(' ');
  return s.replace(/[,:;.]+$/, '').trim();
}
const isBoldHeading = (l) => /^\*\*.+\*\*\s*$/.test(l.trim());
const endsLikeLabel = (l) => /[?:]\s*$/.test(stripMd(l));

// Detecta la edición por la fecha del post / título.
function edition(fm) {
  const y = String(fm.date || '').slice(0, 4);
  if (/2019|2020/.test(y)) return '2019';
  if (/2023/.test(y) || /2023/.test(fm.title || '')) return '2023';
  return '2022';
}

function parseProfile(fm, body) {
  const lines = body.split('\n').map((l) => l.replace(/\r$/, ''));
  let i = 0;
  // saltar el intro estándar del premio si aparece
  while (i < lines.length && (!lines[i].trim() || /Latin American Leaders Awards.*son los premios|DISFRUTA LA ENTREVISTA/i.test(lines[i]))) i++;
  // Región de encabezado: todo hasta la primera pregunta (negrita terminada en ? o :).
  // El nombre/ubicación/cargo suelen venir en un bloque de negrita multilínea, así que se procesa por líneas.
  let firstQA = i;
  while (firstQA < lines.length && !(isBoldHeading(lines[firstQA].trim()) && endsLikeLabel(lines[firstQA].trim()))) firstQA++;
  const header = [];
  for (let k = i; k < firstQA; k++) {
    const t = stripMd(lines[k].replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim());
    if (t) header.push(t);
  }
  i = firstQA;

  // Q&A: cada label en negrita terminada en ? o : abre un campo; el resto es la respuesta.
  const qa = [];
  let cur = null;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    const l = raw.trim();
    if (!l) { if (cur) cur.a.push(''); continue; }
    if (isBoldHeading(l) && endsLikeLabel(l)) {
      if (cur) qa.push(cur);
      cur = { q: stripMd(l), a: [] };
    } else if (cur) {
      cur.a.push(raw);
    }
  }
  if (cur) qa.push(cur);

  const clean = (arr) => arr.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const interview = qa.map((x) => ({ q: x.q, a: clean(x.a) })).filter((x) => x.a);

  // Campos derivados del header
  const name = cleanName(header[0] || (fm.title || '').split(' - ')[0]);
  const location = header.find((h) => /,/.test(h) && !/@/.test(h) && h.length < 70 && !ROLE_KW.test(h));
  const roleLine = header.find((h) => ROLE_KW.test(h));
  const country = detectCountry(header);

  // Respaldo: cuerpo completo en markdown (sin el intro estándar del premio), por si el Q&A quedó pobre.
  const bodyMd = stripLinks(body)
    .split('\n')
    .filter((l) => !/Latin American Leaders Awards.*son los premios|DISFRUTA LA ENTREVISTA|VOTA AL FINAL/i.test(l))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    name,
    location: location || '',
    country,
    role: roleLine ? stripLinks(stripMd(roleLine)) : '',
    orgUrls: [...new Set(header.flatMap((h) => urlsIn(h)))],
    contact: header.find((h) => /@/.test(h)) || '',
    interview,
    bodyMarkdown: bodyMd,
  };
}

const files = walk(ROOT).filter((f) => {
  const slug = path.basename(f, '.md');
  if (!ALL) return PILOT.has(slug);
  const txt = fs.readFileSync(f, 'utf8');
  const { fm } = frontmatter(txt);
  return NOMINEE.test(fm.title || '') || NOMINEE.test(slug);
});

const records = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const { fm, body } = frontmatter(txt);
  const prof = parseProfile(fm, body);
  records.push({
    slug: fm.slug || path.basename(f, '.md'),
    edition: edition(fm),
    lang: fm.lang || (f.includes('/en/') ? 'en' : 'es'),
    name: prof.name,
    location: prof.location,
    country: prof.country,
    role: prof.role,
    orgUrls: prof.orgUrls,
    contact: prof.contact,
    hero: fm.hero || '',
    images: Array.isArray(fm.images) ? fm.images : [],
    description: fm.description || '',
    interview: prof.interview,
    bodyMarkdown: prof.bodyMarkdown,
    // Puente de identidad para SEO/IA: la ficha canónica vivirá en awards; TNGS conservará versión editorial.
    tngsSourceUrl: fm.sourceUrl || fm.canonical || '',
    awardsCanonical: `https://awards.pro-latam.org/edicion-${edition(fm)}/${fm.slug || path.basename(f, '.md')}/`,
  });
}

console.log(`Perfiles procesados: ${records.length}${ALL ? ' (todos)' : ' (piloto)'}`);
if (WRITE) {
  const out = path.resolve('migration/lala_nominees.json');
  fs.writeFileSync(out, JSON.stringify(records, null, 2));
  console.log(`Escrito -> ${out}`);
} else {
  console.log('\n=== MUESTRA (primer registro) ===');
  const r = records[0];
  console.log(JSON.stringify({ ...r, interview: r.interview.slice(0, 3).map((x) => ({ q: x.q, a: x.a.slice(0, 90) + '...' })) }, null, 2));
  console.log(`\n(interview tiene ${records[0]?.interview.length} preguntas en el 1º; ${records[1]?.interview.length} en el 2º)`);
}
