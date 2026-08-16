# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRÍTICO: un solo proyecto Firebase

Todo el trabajo de este workspace (sitio Astro + app Aliados) vive **SIEMPRE** en el proyecto Firebase **`gen-lang-client-0345505794`** ("Global School", project number 216115217934). Aquí NUNCA se trabaja sobre otro proyecto: nada de `apex-vote` (pro-latam / awards) ni ningún otro. Todo deploy, regla, secret, Firestore y Storage se hace contra `gen-lang-client-0345505794`. Antes de cualquier `firebase deploy`/comando, confirmar que el output diga `Deploying to 'gen-lang-client-0345505794'`. Si algo pide tocar otro proyecto, detenerse y preguntar.

## What this workspace is

This directory holds **theglobal.school**, migrated off WordPress into a hybrid product:

1. **Astro content site + marketplace vitrina** (repo root: `src/`, `content/`, `astro.config.mjs`) — the public, SEO-facing site. Serves migrated WordPress content (blog, program/tool/story pages) **and** the public, indexable marketplace listings of events & trips.
2. **`Aliados-GlobalSchool-main/`** — a **separate** React/Vite/Firebase SPA (its own `CLAUDE.md`) that is the **transactional backend** of the marketplace: auth, publishing UI, participant registration, Stripe checkout, and the Cloud Function API. It also owns the Firestore rules and the shared database.
3. **`migration/`** — the conversion pipeline + derived data. Some of these scripts (`transform_expeditions.mjs`, `extract_wxr.py`, `recover_wxr.py`, `fetch_expedition_media.py`) reference sources that have been **archived out of the repo** (see below); the pipeline is done, so their broken paths are expected. Still-live: `gen_firebase.py` (regenerates `firebase.json`), `pages_classified.json` + `categories.json` (imported by the Astro build), the redirect CSVs.

**Archived out of the repo** (moved to `../theglobal.school.archive/` during a token/space cleanup — not lost, but no longer in the project): the WordPress backup `qidb/`, the WXR export `thenewglobalschool.WordPress.*.xml`, the retired Next.js expeditions app `Viajes.theglobal.school/` (its 16 expeditions were already imported to Firestore + `src/data/expeditions.generated.json`), and `migration/crawl_raw/` (rendered-HTML snapshots). Regenerables (`dist-*`, `.astro/`, `migration/.venv/`) were deleted outright. Restore from the archive only if re-running the migration.

Two visual themes, same brand (purple palette; Poppins/Martel light, Inter/Cormorant Garamond dark): the **blog and long-form/legal pages are light/editorial** (`global.css`), while the **marketplace and the landing-type content pages are dark/glassmorphism** (`marketplace.css`, Aliados' look). See the archetype routing below.

## Commands (Astro site, run from repo root)

```bash
npm run dev              # EN dev server (SITE_LANG=en), port 4321
npm run dev:es           # ES dev server
npm run build            # builds BOTH languages → dist-en/ + dist-es/
npm run deploy:marketplace   # build + firebase deploy --only hosting
```

There is no test suite. Type-checking happens implicitly during `astro build` (and `npm run lint` in Aliados).

Migration/data scripts (`migration/*.mjs`) run with plain `node` from the repo root (so firebase-admin resolves) and need the service-account key at the root. Firestore-mutating ones are dry-run by default, `--write` to apply: `import_experiences.mjs` / `import_en_expeditions.mjs` (seed/EN trips), `set_experience_sites.mjs` (which language each publishes to), `set_editions.mjs` (2 seasonal dates), `extract_sections.mjs` (accordions from migrated content), `fix_dashes_firestore.mjs` (em-dash cleanup). The old Python `.venv` was archived; run Python scripts with system `python3` (`gen_firebase.py` is stdlib-only).

## Writing style (hard rule)
Never use the em dash "—" in any visible text (content, UI, emails, titles) or in copy anywhere. Use a comma (or colon/parentheses). The en dash "–" is allowed only for date/number ranges. This is enforced repo-wide (see `migration/fix_dashes_firestore.mjs` for the Firestore side).

## Critical architecture

### Dual-language build (i18n by environment, not routing)
Astro is built **twice**, once per language, selected by the `SITE_LANG` env var (see `astro.config.mjs` + `src/lib/site.ts`):
- EN → `site: theglobal.school`, `outDir: dist-en/`
- ES → `site: es.theglobal.school`, `outDir: dist-es/`

The ES subdomain is preserved (not a `/es/` path) to keep SEO. Each language deploys to its own Firebase Hosting target (`theglobal-en` / `theglobal-es`, see `firebase.json` + `.firebaserc`). Localized routes come in pairs that cross-redirect (`contact.astro`/`contacto.astro`, `experiences/`/`experiencias/`); dynamic routes return `[]` for the wrong language.

### Content pipeline (WordPress → Astro)
The live WordPress site was **crawled** (rendered HTML → clean Markdown), not converted from the shortcode-heavy WXR. Output lives in `content/{en,es}/{post,page,project}/*.md`. Key derived data in `migration/`:
- `inventory.csv` — the URL/SEO source of truth (from the live sitemaps, **not** the WXR, which was incomplete for ES).
- `pages_classified.json` — every page tagged with an **archetype** (Institucional, Programa/Curso, Certificación, Herramienta, Historia, Evento/Campaña, Donación, Aplicación, Perfil, Legal, Sistema). `src/pages/[slug].astro` routes by archetype: **landing archetypes render in the dark/glass brand** (`PageDarkLayout.astro`, reuses `marketplace.css`); **blog posts, Historia and Legal stay light** (`ArticleLayout.astro` / `PageLayout.astro`, `global.css`). Each layout picks an eyebrow + contact CTA per archetype.
- `gen_firebase.py` **generates `firebase.json`** (2 hosting targets + ~90 EN/94 ES 301 redirects, split by domain, cross-language destinations made absolute). Never hand-edit `firebase.json` redirects — edit the generator and re-run.

### Marketplace: single Firestore source, read at build
The marketplace catalog is the **`experiences` collection** in the Aliados Firestore (non-default DB `ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f`). Data flow:
1. Publish via the Aliados admin panel ("Marketplace" tab) **or** `migration/import_experiences.mjs --write` (seeds 16 expeditions + 3 TNGS events).
2. `src/lib/experiences.ts` reads that collection at **build time** via firebase-admin (needs the service-account key), mapping docs to the `Experience` type. Falls back to the JSON bridge (`src/data/expeditions.generated.json` + `tngs-events.json`) when no credentials are present, so builds never break.
3. `experiences/index.astro` + `[slug].astro` (and ES `experiencias/`) render indexable listing/detail pages. The "Reserve" CTA points to `aliados.theglobal.school/reservar/:slug` (the Aliados SPA registration flow); `registerUrl` overrides it (LALA / Mujeres Auténticas → `awards.pro-latam.org`).

`src/lib/experiences.ts` also **normalizes** each doc (derives the `publisher` object from `publisherType`, defaults `highlights`/`publicPrice`/`type`/`currency`) so panel-created docs with missing fields never crash the build.

Because the site is static, marketplace changes need a rebuild. Two mechanisms cover it:
- **Auto-rebuild (static/SEO):** `onExperienceChange` (codebase `theglobal`) fires on any write to a `publicListed` experience and triggers a GitHub Actions build+deploy via `repository_dispatch` (see Auto-deploy below). It no longer emails.
- **Live "freshen" (instant for visitors):** detail pages re-fetch `/api/experience?slug=&lang=` on load (Cloud Function `experiencePublic`) and patch the DOM with pre-rendered HTML fragments read live from Firestore, so edits show in seconds without waiting for the rebuild. It picks the doc whose `sites` matches the requested lang.

**Extended `Experience` model** (beyond the base fields; see `src/data/experiences.ts`): `sites: ('en'|'es')[]` (which language site it publishes to; empty = both, loader filters by build `LANG`), `editions: [{season:'summer'|'winter',startDate,endDate}]` (2 seasonal dates/trip, all 2027, same in ES/EN), `videoUrl` (YouTube lite-embed), `layout` + `sections[]` (accordions), `collaborators[]`, `eventGallery[]`, `testimonials[]`, `included`/`notIncluded`. The EN versions of the 16 Spanish trips are **separate docs** `exp-<slug>-en` (same slug, `sites:['en']`, translated content).

**B2B model:** no prices/checkout on the vitrina. The trip CTA is a WhatsApp "contact us to organize" button (`https://api.whatsapp.com/send/?phone=4367761735010`); cards show "On request"/"A consultar". `registerUrl` still overrides the CTA (awards events).

## Firebase / infra gotchas (shared project)

Everything lives in **one Firebase project: `gen-lang-client-0345505794`**, shared by this site, Aliados, and (historically) Viajes.

- **Functions codebases are split** to avoid clobbering: this site's functions (`functions/`, `submitLead` + `onExperienceChange`) use codebase **`theglobal`**; Aliados' `api` uses codebase **`default`**. Always deploy scoped: `firebase deploy --only "functions:theglobal"`. If a deploy asks to delete functions from the other codebase, answer **N**.
- **Firestore rules live in `Aliados-GlobalSchool-main/firestore.rules`**, not here, and target the non-default DB. Aliados' `firebase.json` needs a `firestore` block with `"database": "ai-studio-..."` for `firebase deploy --only firestore:rules` to actually deploy them.
- **Service-account key** (`gen-lang-client-*-firebase-adminsdk-*.json`) sits at the repo root, is `.gitignore`d, and is required for build-time Firestore reads and for `migration/*.mjs` scripts. Never commit or deploy it (hosting only serves `dist-en`/`dist-es`).
- **Email** uses Acumbamail SMTP via secrets `TGS_SMTP_USER` / `TGS_SMTP_PASS` (dedicated to this project's functions, from `hello@theglobal.school`). `submitLead` handles the contact form (`/api/lead` rewrite).
- **Hosting auto-deploys via CI** (see below). **Cloud Functions and the Aliados panel deploy manually** and are the user's action — the Firebase CLI token expires often mid-session; when it does, hand the user `firebase login --reauth` + the scoped deploy command rather than retrying.

### Auto-deploy (CI)
The repo is on GitHub (`robertoarrucha-ux/theglobal-school`) and hosting deploys through **GitHub Actions** (`.github/workflows/deploy-marketplace.yml`): on `push` to main, on manual `workflow_dispatch`, and on `repository_dispatch` type `marketplace-publish` (fired by `onExperienceChange`). The workflow runs `npm run build` (reads Firestore live via the `FIREBASE_SERVICE_ACCOUNT` secret) then `firebase deploy --only hosting`. Because content lives in Firestore, not the repo, the stable repo build always produces fresh pages. `concurrency: cancel-in-progress` collapses rapid publishes.
- `onExperienceChange` needs the `GH_DISPATCH_TOKEN` secret (a GitHub PAT) and `GH_REPO` (in `functions/.env`) to fire the dispatch.
- **`public/media/` (81MB of migrated images) IS versioned** (removed from `.gitignore`) so CI deploys without broken images. `Aliados-GlobalSchool-main/` stays gitignored (separate project, no version control).

## SEO invariants (the whole point of the migration)

- Zero-loss SEO: every live URL must resolve (200) or 301 to its equivalent. Redirects are generated, not manual (see above). `migration/gsc_gaps.csv` (16-month Search Console export) drives which dead URLs get redirects.
- JSON-LD must be emitted as `<script type="application/ld+json" set:html={JSON.stringify(x)} />` — the `<set:html value=.../>` element form silently HTML-escapes and breaks the structured data.
- DNS cutover plan (BanaHosting → Porkbun + Firebase, preserving Google Workspace MX/DKIM) is documented in `CUTOVER.md`; deploy runbook in `DEPLOY.md`.

## Maintenance owed

Function runtimes are on Node 20 (deprecated 2026-10-30) in both `functions/` and Aliados; bump to Node 22 before then. `firebase-functions` is outdated in both (upgrade deliberately — breaking changes).
