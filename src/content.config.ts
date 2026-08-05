import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Esquema tolerante: el frontmatter viene de la migración; casi todo opcional.
const seo = z.object({
  title: z.string(),
  seoTitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  slug: z.string(),
  lang: z.enum(['en', 'es']),
  type: z.string().optional().default('post'),
  date: z.string().optional().default(''),
  canonical: z.string().optional().default(''),
  ogTitle: z.string().optional().default(''),
  ogImage: z.string().optional().default(''),
  hero: z.string().optional().default(''),
  targetKeyword: z.string().optional().default(''),
  sourceUrl: z.string().optional().default(''),
  recovered: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  // CTA personalizado por página (override del CTA por arquetipo)
  ctaHref: z.string().optional(),
  ctaLabel: z.string().optional(),
});

// id = ruta relativa completa (lang/type/slug) para evitar colisiones EN/ES.
const fullId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

// 3 tipos distintos (posts, pages, projects), propósitos y diseños diferentes.
const posts = defineCollection({
  loader: glob({ pattern: '{en,es}/post/*.md', base: './content', generateId: fullId }),
  schema: seo,
});

const pages = defineCollection({
  loader: glob({ pattern: '{en,es}/page/*.md', base: './content', generateId: fullId }),
  schema: seo,
});

const projects = defineCollection({
  loader: glob({ pattern: '{en,es}/project/*.md', base: './content', generateId: fullId }),
  schema: seo,
});

export const collections = { posts, pages, projects };
