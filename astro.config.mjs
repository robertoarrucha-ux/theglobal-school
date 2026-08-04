import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Build por idioma controlado por SITE_LANG (en | es).
// EN -> theglobal.school   ·   ES -> es.theglobal.school (subdominio preservado)
// Cada idioma sale a dist-<lang>/ y se despliega a su target de Firebase Hosting.
const LANG = process.env.SITE_LANG === 'es' ? 'es' : 'en';
const SITE = LANG === 'es' ? 'https://es.theglobal.school' : 'https://theglobal.school';

export default defineConfig({
  site: SITE,
  outDir: `./dist-${LANG}`,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
