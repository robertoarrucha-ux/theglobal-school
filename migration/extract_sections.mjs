// Auto-extrae SECCIONES estructuradas del contenido migrado de los eventos/programas,
// para renderizarlas como acordeones. Reconoce el vocabulario común (¿Qué?/¿Quién?/Agenda/FAQ...).
// Actualiza src/data/tngs-events.json (añade `layout` + `sections[]` a cada evento).
// Ejecutar: node migration/extract_sections.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Mapa: qué layout usa cada evento + orden/etiquetas de sus secciones.
const CONFIG = {
  'latin-america-leaders-awards': 'evento',
  'mujeres-autenticas': 'evento',
  'diplomado-ejecutivo-viena-calidad-de-vida-y-ciudad-inteligente': 'programa',
};

// Reconocimiento de secciones por el TEXTO del encabezado (cualquier nivel #..####).
const MATCHERS = [
  { key: 'que', title: '¿Qué es?', re: /^¿?qu[eé]\??$/i },
  { key: 'quien', title: '¿Para quién?', re: /^¿?qui[eé]n(\s+es.*)?\??$/i },
  { key: 'logistica', title: '¿Cómo, cuándo y dónde?', re: /(c[oó]mo|cu[aá]ndo|d[oó]nde)/i },
  { key: 'agenda', title: 'Agenda', re: /^(agenda|programa(\s+de\b.*)?)$/i },
  { key: 'inversion', title: 'Inversión', re: /(inversi[oó]n|costos?|precios?)/i },
  { key: 'conferencistas', title: 'Conferencistas', re: /conferencistas/i },
  { key: 'premiados', title: 'Premiados', re: /premiados?/i },
  { key: 'empresas', title: 'Empresas y organizaciones', re: /(empresas|organizaciones|org\.)/i },
  { key: 'temario', title: 'Temario', re: /(temario|contenidos?|m[oó]dulos?)/i },
  { key: 'certificacion', title: 'Certificación', re: /certificaci[oó]n/i },
  { key: 'organizadores', title: 'Organizadores y colaboradores', re: /(organizadores|colaboradores|aliados)/i },
  { key: 'faq', title: 'Preguntas frecuentes', re: /(preguntas\s+frecuentes|faq|dudas)/i },
];

function cleanHeading(t) {
  return t.replace(/\*\*/g, '').replace(/[#*_]/g, '').trim();
}
function matchSection(headingText) {
  const t = cleanHeading(headingText);
  for (const m of MATCHERS) if (m.re.test(t)) return m;
  return null;
}

function slug(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}
function titleCase(t) {
  const s = t.trim().replace(/[!¡?¿.]+$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function extract(md) {
  const body = md.replace(/^---[\s\S]*?---\s*/, '');
  const lines = body.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const m = matchSection(h[2]);
      if (m) {
        // encabezado reconocido → nueva sección (o continúa si es el mismo key seguido)
        if (!current || current.key !== m.key) { current = { key: m.key, title: m.title, buf: [] }; sections.push(current); }
        continue;
      }
      // H2 NO reconocido → nueva sección genérica (evita bloques gigantes). H1 = título; H3/H4 = quedan en el cuerpo.
      if (level === 2) {
        const title = cleanHeading(h[2]);
        if (title.length > 1 && title.length < 70) { current = { key: 'sec-' + slug(title), title: titleCase(title), buf: [] }; sections.push(current); continue; }
      }
      if (level === 1) continue; // título de la página, ignorar
    }
    if (current) current.buf.push(line);
  }
  // fusionar secciones con el mismo key (duplicados)
  const merged = [];
  const byKey = {};
  for (const s of sections) {
    if (byKey[s.key]) byKey[s.key].buf.push('', ...s.buf);
    else { byKey[s.key] = s; merged.push(s); }
  }
  return merged
    .map((s) => ({ key: s.key, title: s.title, md: s.buf.join('\n').replace(/\n{3,}/g, '\n\n').trim() }))
    .filter((s) => s.md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s/g, '').length > 20); // descartar vacías o solo-imágenes
}

// Extrae imágenes de logos/fotos hacia una cuadrícula de colaboradores, y las quita de los acordeones.
const IMG_RE = /!\[([^\]]*)\]\(([^ )]+)(?:\s+"([^"]*)")?\)/g;
const COLLAB_KEYS = new Set(['conferencistas', 'empresas', 'premiados', 'organizadores', 'aliados']);
function niceName(alt, title) {
  const n = (title || alt || '').trim();
  if (!n || n.startsWith('/') || /\.(webp|jpe?g|png|gif)$/i.test(n)) return '';
  return n.replace(/\s*[-–|]\s*(Latin American Leaders Awards|African Leaders Awards|The (New )?Global School).*$/i, '').trim();
}
function isLogo(url, name) {
  return /logo/i.test(url) || /logo/i.test(name || '');
}
function pullCollaborators(sections) {
  const collaborators = []; // logos de aliados/patrocinadores
  const gallery = [];       // fotos del evento/experiencia
  const seen = new Set();
  const kept = [];
  for (const s of sections) {
    const imgs = [...s.md.matchAll(IMG_RE)];
    const isCollabSource = COLLAB_KEYS.has(s.key) || (s.key.startsWith('sec-') && imgs.length >= 4);
    if (isCollabSource && imgs.length) {
      for (const m of imgs) {
        const url = m[2];
        if (seen.has(url)) continue;
        seen.add(url);
        const name = niceName(m[1], m[3]);
        if (isLogo(url, name)) collaborators.push({ imageUrl: url, name });
        else gallery.push({ imageUrl: url, caption: name });
      }
      s.md = s.md.replace(IMG_RE, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    if (s.md.replace(/\s/g, '').length > 20) kept.push(s);
  }
  return { sections: kept, collaborators, gallery };
}

// Extrae TESTIMONIOS (foto circular + cita + autor + organización) del markdown crudo,
// y los quita del cuerpo para que no ensucien los acordeones.
const AVATAR_RE = /circle/i; // los avatares migrados llevan "circle" en el nombre
function pullTestimonials(rawMd) {
  const body = rawMd.replace(/^---[\s\S]*?---\s*/, '');
  const lines = body.split('\n');
  const testimonials = [];
  const drop = new Set();
  for (let i = 0; i < lines.length; i++) {
    const img = lines[i].match(/^!\[[^\]]*\]\(([^ )]+)/);
    if (!img || !AVATAR_RE.test(img[1])) continue;
    // headline = H2/H3/H4 inmediatamente anterior (dentro de 3 líneas)
    let headline = '', hIdx = -1;
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      const h = lines[j].match(/^#{2,4}\s+(.*)$/);
      if (h) { headline = cleanHeading(h[1]); hIdx = j; break; }
      if (lines[j].trim() && !lines[j].startsWith('#')) break;
    }
    // recoge líneas de texto posteriores: cita, autor, organización
    const texts = [], idxs = [];
    for (let k = i + 1; k < lines.length; k++) {
      const t = lines[k];
      if (/^#{1,4}\s/.test(t) || /^!\[/.test(t)) break;
      if (t.trim()) { texts.push(t.trim()); idxs.push(k); }
      else if (texts.length >= 3) break;
    }
    if (texts.length < 2) continue;
    const quote = texts[0].replace(/^["“]+|["”]+$/g, '').trim();
    if (quote.length < 20) continue; // exige una cita real, no un nombre suelto
    const author = texts[1].replace(/\*\*/g, '').trim();
    let org = (texts[2] || '').replace(/\*\*/g, '').trim(), orgUrl = '';
    const lnk = org.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (lnk) { org = lnk[1].trim(); orgUrl = lnk[2].trim(); }
    testimonials.push({ quote, author, org, orgUrl, photo: img[1], headline });
    const start = hIdx >= 0 ? hIdx : i, end = idxs[idxs.length - 1];
    for (let d = start; d <= end; d++) drop.add(d);
    i = end;
  }
  const cleaned = lines.filter((_, idx) => !drop.has(idx)).join('\n');
  return { md: cleaned, testimonials };
}

const data = JSON.parse(readFileSync(resolve(BASE, 'src/data/tngs-events.json'), 'utf8'));
let updated = 0;
for (const ev of data) {
  const layout = CONFIG[ev.slug];
  if (!layout) continue;
  const md = readFileSync(resolve(BASE, `content/es/page/${ev.slug}.md`), 'utf8');
  ev.layout = layout;
  const t = pullTestimonials(md);           // 1º saca testimonios del markdown crudo
  const pulled = pullCollaborators(extract(t.md)); // 2º secciona + saca logos/fotos
  ev.sections = pulled.sections;
  ev.collaborators = pulled.collaborators;
  ev.eventGallery = pulled.gallery;
  ev.testimonials = t.testimonials;
  delete ev.gallery; // limpiar campo obsoleto de corridas anteriores
  updated++;
  console.log(`  ${ev.slug} [${layout}] → ${ev.sections.length} secc, ${ev.collaborators.length} logos, ${ev.eventGallery.length} fotos, ${ev.testimonials.length} testimonios`);
}
writeFileSync(resolve(BASE, 'src/data/tngs-events.json'), JSON.stringify(data, null, 2));
console.log(`\n✅ ${updated} eventos actualizados con secciones en src/data/tngs-events.json`);
