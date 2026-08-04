import type { APIRoute } from 'astro';
import { LANG } from '../lib/site';
import llmsEn from '../seo/llms.en.txt?raw';
import llmsEs from '../seo/llms.es.txt?raw';

// LLMs.txt por idioma (contenido curado del sitio actual).
export const GET: APIRoute = () => {
  const body = LANG === 'es' ? llmsEs : llmsEn;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
