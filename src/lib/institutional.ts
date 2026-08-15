// Parser de páginas institucionales (arquetipo "Institucional": nosotros, alianzas, about-us,
// partnerships, etc.). El contenido migrado de WordPress vuelca equipo, temáticas y stats como
// prosa en una sola columna con las fotos sueltas. Esto lo estructura en bloques:
//   - team:   miembros (foto + nombre #### + rol + bio + redes) -> grilla de tarjetas
//   - topics: "Listado de Temáticas" / "Topics" -> grilla
//   - stats:  "Nuestro trabajo en números" -> banda de etiquetas
//   - bodyMarkdown: el resto de la prosa (quiénes somos, cómo trabajamos + imagen), limpia
// Degrada con gracia: si no hay equipo ni temáticas, hasStructured=false y se renderiza la prosa.

export interface TeamMember {
  name: string;
  role?: string;
  bio?: string;
  img?: string;
  socials: { label: string; url: string }[];
}

export interface InstitutionalParse {
  bodyMarkdown: string;
  topics: string[];
  team: TeamMember[];
  stats: string[];
  logos: { img: string; url?: string }[];
  logosTitle: string;
  hasStructured: boolean;
}

const PLAIN_IMG = /^!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/;
const LINKED_IMG = /^\[!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)]+)\)$/;
const H4 = /^####\s+(.+?)\s*$/;
const HEADING = /^#{1,6}\s+/;
const BULLET = /^-\s+(.+)$/;
const SOCIAL = /^-\s+\[([^\]]+)\]\(([^)]+)\)\s*$/;
const TOPICS_H = /tem[áa]ticas|topics/i;
const STATS_H = /en\s+n[úu]meros|in\s+numbers|nuestro\s+trabajo/i;
const strip = (s: string) => s.replace(/\*\*/g, '').replace(/\\$/, '').trim();
const badImg = (u: string) => !u || /\/\.webp$/.test(u);

export function parseInstitutional(body: string): InstitutionalParse {
  const lines = (body || '').split('\n');
  const consumed = new Set<number>();
  const team: TeamMember[] = [];
  const topics: string[] = [];
  const stats: string[] = [];

  // ── Equipo: cada `#### Nombre` con su foto (línea de imagen previa cercana) ──
  for (let i = 0; i < lines.length; i++) {
    const h4 = lines[i].match(H4);
    if (!h4) continue;
    const member: TeamMember = { name: strip(h4[1]), socials: [] };
    consumed.add(i);
    // foto: imagen suelta en las ~3 líneas previas
    for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
      const pi = lines[k].match(PLAIN_IMG);
      if (pi && !badImg(pi[1])) { member.img = pi[1]; consumed.add(k); break; }
      if (lines[k].trim()) break;
    }
    // rol + bio + redes tras el nombre, hasta el próximo miembro/heading/imagen
    const bio: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t) { consumed.add(j); continue; }
      if (H4.test(t) || HEADING.test(t) || PLAIN_IMG.test(t)) break;
      const soc = t.match(SOCIAL);
      if (soc) { member.socials.push({ label: soc[1], url: soc[2] }); consumed.add(j); continue; }
      if (!member.role) member.role = strip(t);
      else bio.push(strip(t));
      consumed.add(j);
    }
    member.bio = bio.join(' ').trim() || undefined;
    team.push(member);
  }

  // ── Temáticas: bullets tras el heading "Listado de Temáticas"/"Topics" ──
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i) || !HEADING.test(lines[i]) || !TOPICS_H.test(lines[i])) continue;
    consumed.add(i);
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t) { consumed.add(j); continue; }
      if (HEADING.test(t) || PLAIN_IMG.test(t)) break;
      const b = t.match(BULLET);
      if (b) { topics.push(strip(b[1])); consumed.add(j); }
      else break;
    }
  }

  // ── Stats: etiquetas (headings) tras "Nuestro trabajo en números" ──
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i) || !HEADING.test(lines[i]) || !STATS_H.test(lines[i])) continue;
    consumed.add(i);
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t) { consumed.add(j); continue; }
      if (PLAIN_IMG.test(t) || H4.test(t)) break; // empieza el equipo
      const hm = t.match(/^#{1,6}\s+(.+)$/);
      if (hm) { stats.push(strip(hm[1])); consumed.add(j); }
      else break;
    }
  }

  // ── Logos: tandas de 2+ imágenes sueltas (aliados, premios, reconocimientos) ──
  const logos: { img: string; url?: string }[] = [];
  let logosTitle = '';
  const asImg = (idx: number): { img: string; url?: string } | null => {
    const t = lines[idx].trim();
    const li = t.match(LINKED_IMG);
    if (li && !badImg(li[1])) return { img: li[1], url: li[2] };
    const pi = t.match(PLAIN_IMG);
    if (pi && !badImg(pi[1])) return { img: pi[1] };
    return null;
  };
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i) || !asImg(i)) continue;
    const run: { idx: number; img: string; url?: string }[] = [];
    let j = i;
    while (j < lines.length) {
      if (consumed.has(j)) break;
      const t = lines[j].trim();
      if (!t) { j++; continue; }
      const im = asImg(j);
      if (!im) break;
      run.push({ idx: j, ...im });
      j++;
    }
    if (run.length >= 2) {
      // encabezado previo como título de la sección de logos
      for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
        const t = lines[k].trim();
        if (!t) continue;
        const hm = t.match(/^#{1,6}\s+(.+)$/);
        if (hm && !consumed.has(k)) { if (!logosTitle) logosTitle = strip(hm[1]); consumed.add(k); }
        break;
      }
      for (const r of run) { logos.push({ img: r.img, url: r.url }); consumed.add(r.idx); }
      for (let k = i; k < j; k++) if (!lines[k].trim()) consumed.add(k);
    }
    i = Math.max(j - 1, i);
  }

  // ── Resto de prosa: limpia título/subtítulo/HR y líneas ya consumidas ──
  let h1seen = false;
  const bodyMarkdown = lines
    .filter((l, idx) => {
      if (consumed.has(idx)) return false;
      const t = l.trim();
      if (!t) return true;
      if (/^#\s+/.test(t)) { if (!h1seen) { h1seen = true; return false; } }
      if (/^[-–—_*\s]{3,}$/.test(t)) return false; // separadores sueltos
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    bodyMarkdown,
    topics,
    team,
    stats,
    logos,
    logosTitle,
    hasStructured: team.length > 0 || topics.length > 0 || logos.length > 0,
  };
}
