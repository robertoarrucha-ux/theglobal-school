import type { APIRoute } from 'astro';
import { LANG, SELF_ORIGIN } from '../lib/site';

// robots.txt permisivo con bots de IA (igual que el sitio actual), apuntando al sitemap del idioma.
export const GET: APIRoute = () => {
  const origin = SELF_ORIGIN[LANG];
  const body = `# ${origin}
User-agent: *
Allow: /
Disallow: /wp-admin/

# Motores de IA permitidos
User-agent: GPTBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: ${origin}/sitemap-index.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
