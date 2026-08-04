# Design tokens — theglobal.school (extraídos del sitio Divi actual)

Base para replicar la identidad visual en el rediseño Astro (Fase 2).

## Tipografías (Google Fonts → auto-hospedar en el sitio nuevo)
- **Poppins** — principal / UI / encabezados (pesos usados: 300–900). Fallback: Helvetica, Arial, sans-serif.
- **Martel** — serif, para acentos/citas/algunos títulos. Fallback: Georgia, serif.
- **Open Sans** — cuerpo secundario. Fallback: Arial, sans-serif.
- (ETmodules = iconos de Divi → NO migrar; usar iconos SVG propios.)

## Paleta (del et-divi-customizer-global.min.css)
- **Acento primario (morado):** `#8300e9`
- **Acento secundario (violeta):** `#6c00f9`
- **Morado profundo / marca:** `#3f3979`
- Texto principal: `#333333`
- Texto secundario: `#666666`
- Grises UI: `#999`, `#bbb`, `#e8e8e8`
- Fondo: `#ffffff`
- (Azul `#2ea3f2` = default de Divi, NO es de marca — descartar.)

## Estructura de contenido (referencia del crawl)
- Cuerpo de posts: contenedor `.et_pb_post_content` → HTML limpio (párrafos, listas, citas).
- Páginas: contenido repartido en módulos dentro de `#main-content`.
- Imagen destacada: en el header del post (capturada vía og:image → frontmatter `hero`).

## SEO / IA (estado actual y mejoras)
- Actual: SEOPress genera `<title>`, meta description, canonical, OG/Twitter. **NO hay JSON-LD.**
- Nuevo sitio debe añadir: JSON-LD `Article` / `Organization` / `BreadcrumbList`, `hreflang` EN↔ES,
  sitemaps por idioma, `LLMs.txt` (ya existe en EN y ES), HTML semántico.

## Idiomas
- EN: `theglobal.school` · ES: `es.theglobal.school` (subdominio, se mantiene).
- Un repo Astro → 2 targets de Firebase Hosting.
