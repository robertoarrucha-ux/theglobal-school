# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this workspace is

This directory holds **theglobal.school**, migrated off WordPress into a hybrid product:

1. **Astro content site + marketplace vitrina** (repo root: `src/`, `content/`, `astro.config.mjs`) — the public, SEO-facing site. Serves migrated WordPress content (blog, program/tool/story pages) **and** the public, indexable marketplace listings of events & trips.
2. **`Aliados-GlobalSchool-main/`** — a **separate** React/Vite/Firebase SPA (its own `CLAUDE.md`) that is the **transactional backend** of the marketplace: auth, publishing UI, participant registration, Stripe checkout, and the Cloud Function API. It also owns the Firestore rules and the shared database.
3. **`migration/`** — the conversion pipeline + derived data. Some of these scripts (`transform_expeditions.mjs`, `extract_wxr.py`, `recover_wxr.py`, `fetch_expedition_media.py`) reference sources that have been **archived out of the repo** (see below); the pipeline is done, so their broken paths are expected. Still-live: `gen_firebase.py` (regenerates `firebase.json`), `pages_classified.json` + `categories.json` (imported by the Astro build), the redirect CSVs.

**Archived out of the repo** (moved to `../theglobal.school.archive/` during a token/space cleanup — not lost, but no longer in the project): the WordPress backup `qidb/`, the WXR export `thenewglobalschool.WordPress.*.xml`, the retired Next.js expeditions app `Viajes.theglobal.school/` (its 16 expeditions were already imported to Firestore + `src/data/expeditions.generated.json`), and `migration/crawl_raw/` (rendered-HTML snapshots). Regenerables (`dist-*`, `.astro/`, `migration/.venv/`) were deleted outright. Restore from the archive only if re-running the migration.

The content site is **light/editorial**; the marketplace is **dark/glassmorphism** (Aliados' look). Same brand: purple palette, Poppins/Martel (content) + Inter/Cormorant Garamond (marketplace).

## Commands (Astro site, run from repo root)

```bash
npm run dev              # EN dev server (SITE_LANG=en), port 4321
npm run dev:es           # ES dev server
npm run build            # builds BOTH languages → dist-en/ + dist-es/
npm run deploy:marketplace   # build + firebase deploy --only hosting
```

There is no test suite. Type-checking happens implicitly during `astro build`.

Python migration scripts use an isolated venv: `./migration/.venv/bin/python migration/<script>.py`.
Node scripts that read TypeScript data files use `node --experimental-strip-types <script>.mjs`.

## Critical architecture

### Dual-language build (i18n by environment, not routing)
Astro is built **twice**, once per language, selected by the `SITE_LANG` env var (see `astro.config.mjs` + `src/lib/site.ts`):
- EN → `site: theglobal.school`, `outDir: dist-en/`
- ES → `site: es.theglobal.school`, `outDir: dist-es/`

The ES subdomain is preserved (not a `/es/` path) to keep SEO. Each language deploys to its own Firebase Hosting target (`theglobal-en` / `theglobal-es`, see `firebase.json` + `.firebaserc`). Localized routes come in pairs that cross-redirect (`contact.astro`/`contacto.astro`, `experiences/`/`experiencias/`); dynamic routes return `[]` for the wrong language.

### Content pipeline (WordPress → Astro)
The live WordPress site was **crawled** (rendered HTML → clean Markdown), not converted from the shortcode-heavy WXR. Output lives in `content/{en,es}/{post,page,project}/*.md`. Key derived data in `migration/`:
- `inventory.csv` — the URL/SEO source of truth (from the live sitemaps, **not** the WXR, which was incomplete for ES).
- `pages_classified.json` — every page tagged with an **archetype** (Institucional, Programa/Curso, Certificación, Herramienta, Historia, Evento/Campaña, Donación, Aplicación, Perfil, Legal, Sistema). `src/pages/[slug].astro` renders posts/pages/projects/categories and picks a layout + CTA per archetype (`PageLayout.astro`).
- `gen_firebase.py` **generates `firebase.json`** (2 hosting targets + ~90 EN/94 ES 301 redirects, split by domain, cross-language destinations made absolute). Never hand-edit `firebase.json` redirects — edit the generator and re-run.

### Marketplace: single Firestore source, read at build
The marketplace catalog is the **`experiences` collection** in the Aliados Firestore (non-default DB `ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f`). Data flow:
1. Publish via the Aliados admin panel ("Marketplace" tab) **or** `migration/import_experiences.mjs --write` (seeds 16 expeditions + 3 TNGS events).
2. `src/lib/experiences.ts` reads that collection at **build time** via firebase-admin (needs the service-account key), mapping docs to the `Experience` type. Falls back to the JSON bridge (`src/data/expeditions.generated.json` + `tngs-events.json`) when no credentials are present, so builds never break.
3. `experiences/index.astro` + `[slug].astro` (and ES `experiencias/`) render indexable listing/detail pages. The "Reserve" CTA points to `aliados.theglobal.school/reservar/:slug` (the Aliados SPA registration flow); `registerUrl` overrides it (LALA / Mujeres Auténticas → `awards.pro-latam.org`).

Because the site is static, marketplace changes require a rebuild+deploy. The Cloud Function `onExperienceChange` (in `functions/`) emails a reminder on publish (M3 "manual mode").

## Firebase / infra gotchas (shared project)

Everything lives in **one Firebase project: `gen-lang-client-0345505794`**, shared by this site, Aliados, and (historically) Viajes.

- **Functions codebases are split** to avoid clobbering: this site's functions (`functions/`, `submitLead` + `onExperienceChange`) use codebase **`theglobal`**; Aliados' `api` uses codebase **`default`**. Always deploy scoped: `firebase deploy --only "functions:theglobal"`. If a deploy asks to delete functions from the other codebase, answer **N**.
- **Firestore rules live in `Aliados-GlobalSchool-main/firestore.rules`**, not here, and target the non-default DB. Aliados' `firebase.json` needs a `firestore` block with `"database": "ai-studio-..."` for `firebase deploy --only firestore:rules` to actually deploy them.
- **Service-account key** (`gen-lang-client-*-firebase-adminsdk-*.json`) sits at the repo root, is `.gitignore`d, and is required for build-time Firestore reads and for `migration/*.mjs` scripts. Never commit or deploy it (hosting only serves `dist-en`/`dist-es`).
- **Email** uses Acumbamail SMTP via secrets `TGS_SMTP_USER` / `TGS_SMTP_PASS` (dedicated to this project's functions, from `hello@theglobal.school`). `submitLead` handles the contact form (`/api/lead` rewrite).
- **Deploys are the user's action** unless auth is confirmed working in-session. The content site does not auto-deploy on push.

## SEO invariants (the whole point of the migration)

- Zero-loss SEO: every live URL must resolve (200) or 301 to its equivalent. Redirects are generated, not manual (see above). `migration/gsc_gaps.csv` (16-month Search Console export) drives which dead URLs get redirects.
- JSON-LD must be emitted as `<script type="application/ld+json" set:html={JSON.stringify(x)} />` — the `<set:html value=.../>` element form silently HTML-escapes and breaks the structured data.
- DNS cutover plan (BanaHosting → Porkbun + Firebase, preserving Google Workspace MX/DKIM) is documented in `CUTOVER.md`; deploy runbook in `DEPLOY.md`.

## Maintenance owed

Function runtimes are on Node 20 (deprecated 2026-10-30) in both `functions/` and Aliados; bump to Node 22 before then. `firebase-functions` is outdated in both (upgrade deliberately — breaking changes).
