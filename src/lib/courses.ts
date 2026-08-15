// Parser de páginas de curso (arquetipo "Programa/Curso").
// Distingue dos formas migradas desde WordPress:
//   - catálogo: lista de cursos, cada uno [![img](media)](url) + **Título** + "Impartido por Instructor"
//   - individual: un curso con instructor (## Nombre), imagen, módulos y descripción
// Devuelve datos estructurados para renderizar una grilla de tarjetas o una landing de curso,
// en lugar de la prosa cruda que parece un blog post.

export interface CourseCard {
  title: string;
  href: string;
  img?: string;
  instructor?: string;
}

export interface CourseParse {
  kind: 'catalog' | 'single';
  cards: CourseCard[];
  modules: string[];
  instructorName?: string;
  instructorImg?: string;
  instructorRole?: string;
  aboutMarkdown: string;
}

// Enlaces de imagen: [![alt](img "title")](href)
const IMG_LINK = /\[!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\((https?:\/\/[^)]+)\)/;
const BOLD_LINE = /^\*\*(.+?)\*\*$/;
const PLAIN_IMG = /^!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/;
const H2 = /^##\s+(.+?)\s*$/;
const MODULE = /^-\s+\[(.+?)\]\(#\)\s*$/;
// Ruido migrado a descartar del cuerpo "sobre el curso".
const NOISE = /nominad|premios?\s+m[áa]s|puedes votar|vota por|click aqu[íi]|obtuviste un certificado|eres l[íi]der de (empresa|gobierno)|desde (el )?(tel[eé]fono|la computadora|computadora)|rastreo entre sitios|evitar rastreo|inhabilita|habilita «|secci[óo]n «configuraci[óo]n|puedes volver a activarlo|navegador \(chrome|encuentra la app/i;
const SUBTITLE = /^cursos?\s+(gratis\s+)?(en\s+línea\s+)?de\s+liderazgo/i;
const AWARD_LINK = /^\**\[latin american leaders awards\]\(/i;
const RULE_ISH = /^[\\_*\-\s]{3,}$/; // líneas de guiones/underscores sueltos
const PROMO_LI = /^\d+\.\s*\*.*\*\s*$/; // ítem de lista totalmente en itálica (promo)

// Convierte enlaces a theglobal.school en rutas relativas (mismo dominio de idioma).
function localize(href: string): string {
  const m = href.match(/^https?:\/\/(?:[a-z-]+\.)?theglobal\.school(\/.*)?$/i);
  return m ? (m[1] || '/') : href;
}

export function parseCourse(body: string): CourseParse {
  const lines = (body || '').split('\n');
  const cards: CourseCard[] = [];
  const modules: string[] = [];
  let instructorName: string | undefined;
  let instructorImg: string | undefined;
  let instructorRole: string | undefined;
  let imgIdx = -1, nameIdx = -1, roleIdx = -1, h1Idx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (h1Idx < 0 && /^#\s+/.test(line)) h1Idx = i;

    // Tarjeta de catálogo
    const lk = line.match(IMG_LINK);
    if (lk) {
      const img = lk[1];
      const href = localize(lk[2]);
      let title = '';
      let instructor = '';
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const bm = lines[j]?.trim().match(BOLD_LINE);
      if (bm) { title = bm[1].trim(); j++; }
      while (j < lines.length && !lines[j].trim()) j++;
      if (lines[j] && !IMG_LINK.test(lines[j]) && !lines[j].startsWith('#')) {
        instructor = lines[j].trim().replace(/^Impartido por\s*/i, '').replace(/^Taught by\s*/i, '');
      }
      const okImg = img && !/\/\.webp$/.test(img);
      cards.push({ title: title || 'Curso', href, img: okImg ? img : undefined, instructor: instructor || undefined });
      continue;
    }

    // Datos del curso individual
    if (!instructorImg) {
      const pi = line.match(PLAIN_IMG);
      if (pi && !/\/\.webp$/.test(pi[1])) { instructorImg = pi[1]; imgIdx = i; }
    }
    if (!instructorName) {
      const h2 = line.match(H2);
      if (h2) {
        instructorName = h2[1].trim();
        nameIdx = i;
        // el rol suele ser la primera línea con texto tras el nombre
        for (let j = i + 1; j < lines.length; j++) {
          const t = lines[j].trim();
          if (!t) continue;
          if (MODULE.test(t) || t.startsWith('#') || PLAIN_IMG.test(t) || NOISE.test(t)) break;
          instructorRole = t.replace(/\*\*/g, '').replace(/\\$/, '').trim();
          roleIdx = j;
          break;
        }
      }
    }
    const mod = line.match(MODULE);
    if (mod) {
      const t = mod[1].trim();
      if (!modules.includes(t)) modules.push(t);
    }
  }

  // "Sobre el curso": cuerpo limpio, sin lo ya mostrado en tarjetas ni ruido migrado.
  const aboutMarkdown = lines
    .filter((l, idx) => {
      if (idx === imgIdx || idx === nameIdx || idx === roleIdx || idx === h1Idx) return false;
      const t = l.trim();
      if (!t) return true;
      if (MODULE.test(t) || PLAIN_IMG.test(t) || SUBTITLE.test(t) || NOISE.test(t)) return false;
      if (AWARD_LINK.test(t) || RULE_ISH.test(t) || PROMO_LI.test(t)) return false;
      if (instructorName && t.replace(/\*\*/g, '').trim().toLowerCase() === instructorName.toLowerCase()) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    kind: cards.length >= 3 ? 'catalog' : 'single',
    cards,
    modules,
    instructorName,
    instructorImg,
    instructorRole,
    aboutMarkdown,
  };
}
