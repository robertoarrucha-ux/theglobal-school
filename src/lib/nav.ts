import pages from '../../migration/pages_classified.json';
import type { Lang } from './site';

type P = { lang: string; slug: string; title: string; arch: string; clicks: number };
const ALL = pages as P[];

function decode(s: string) {
  return (s || '').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
}

function top(lang: Lang, arch: string, n: number) {
  return ALL.filter((p) => p.lang === lang && p.arch === arch)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, n)
    .map((p) => ({ label: decode(p.title), href: `/${p.slug}/` }));
}

export function footerGroups(lang: Lang) {
  const es = lang === 'es';
  return [
    { title: es ? 'Programas' : 'Programs', links: top(lang, 'Programa/Curso', 6) },
    { title: es ? 'Certificaciones' : 'Certifications', links: top(lang, 'Certificación', 6) },
    { title: es ? 'Herramientas' : 'Tools', links: top(lang, 'Herramienta', 6) },
    { title: es ? 'Institución' : 'About', links: top(lang, 'Institucional', 6) },
  ].filter((g) => g.links.length);
}
