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
}

// Enlaces de imagen: [![alt](img "title")](href)
const IMG_LINK = /\[!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\((https?:\/\/[^)]+)\)/;
const BOLD_LINE = /^\*\*(.+?)\*\*$/;
const PLAIN_IMG = /^!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/;
const H2 = /^##\s+(.+?)\s*$/;
const MODULE = /^-\s+\[(.+?)\]\(#\)\s*$/;

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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
      if (pi && !/\/\.webp$/.test(pi[1])) instructorImg = pi[1];
    }
    if (!instructorName) {
      const h2 = line.match(H2);
      if (h2) instructorName = h2[1].trim();
    }
    const mod = line.match(MODULE);
    if (mod) {
      const t = mod[1].trim();
      if (!modules.includes(t)) modules.push(t);
    }
  }

  return {
    kind: cards.length >= 3 ? 'catalog' : 'single',
    cards,
    modules,
    instructorName,
    instructorImg,
  };
}
