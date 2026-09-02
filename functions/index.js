import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { marked } from 'marked';

// Secrets de Acumbamail DEDICADOS a theglobal.school (desacoplados de Aliados,
// que usa SMTP_PASS en el mismo project). Mismo valor de cuenta Acumbamail.
const SMTP_USER = defineSecret('TGS_SMTP_USER');
const SMTP_PASS = defineSecret('TGS_SMTP_PASS');

const SMTP_HOST = 'smtp.acumbamail.com';
const SMTP_PORT = 465; // SSL, config probada en awards.pro-latam.org
const FROM_EMAIL = 'hello@theglobal.school';
const FROM_NAME = 'The New Global School';
const NOTIFY_TO = 'hello@theglobal.school'; // destino interno de los leads

const ALLOWED_ORIGINS = [
  'https://theglobal.school',
  'https://es.theglobal.school',
  'http://localhost:4321',
];

function esc(s = '') {
  return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

export const submitLead = onRequest(
  { region: 'us-central1', secrets: [SMTP_USER, SMTP_PASS], cors: ALLOWED_ORIGINS, maxInstances: 5 },
  async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

    const b = req.body || {};
    const name = (b.name || '').toString().trim().slice(0, 120);
    const email = (b.email || '').toString().trim().slice(0, 160);
    const phone = (b.phone || '').toString().trim().slice(0, 40);
    const message = (b.message || '').toString().trim().slice(0, 4000);
    const interest = (b.interest || '').toString().trim().slice(0, 120);
    const audience = (b.audienceType || '').toString().trim().slice(0, 60);
    const groupSize = (b.groupSize || '').toString().trim().slice(0, 40);
    const dates = (b.dates || '').toString().trim().slice(0, 120);
    const country = (b.country || '').toString().trim().slice(0, 60);
    const lang = b.lang === 'es' ? 'es' : 'en';
    const page = (b.page || '').toString().slice(0, 300);
    const hp = (b.company || '').toString(); // honeypot anti-spam

    if (hp) return res.status(200).json({ ok: true }); // bot: fingir éxito
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'validation' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
      tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    });

    // 1) Notificación interna al equipo
    const notify = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: NOTIFY_TO,
      replyTo: email,
      subject: `Lead${audience ? ` [${audience}]` : ''}${groupSize ? ` [${groupSize}]` : ''}: ${name}${interest ? `, ${interest}` : ''}`,
      html: `<h3>Nuevo mensaje desde el sitio (${lang.toUpperCase()})</h3>
        <p><b>Nombre:</b> ${esc(name)}</p>
        <p><b>Email:</b> ${esc(email)}</p>
        ${phone ? `<p><b>Teléfono:</b> ${esc(phone)}</p>` : ''}
        ${audience ? `<p><b>Perfil:</b> ${esc(audience)}</p>` : ''}
        ${interest ? `<p><b>Tema o destino:</b> ${esc(interest)}</p>` : ''}
        ${country ? `<p><b>País:</b> ${esc(country)}</p>` : ''}
        ${groupSize ? `<p><b>Tamaño de grupo:</b> ${esc(groupSize)}</p>` : ''}
        ${dates ? `<p><b>Fechas tentativas:</b> ${esc(dates)}</p>` : ''}
        <p><b>Mensaje:</b><br>${esc(message).replace(/\n/g, '<br>')}</p>
        ${page ? `<p style="color:#888;font-size:12px">Página: ${esc(page)}</p>` : ''}`,
    };

    // 2) Autorespuesta al remitente
    const t = lang === 'es'
      ? { subj: 'Gracias por contactarnos, The New Global School',
          body: `Hola ${esc(name)},<br><br>Gracias por escribirnos. Hemos recibido tu mensaje y te responderemos muy pronto.<br><br>Un saludo,<br><b>The New Global School</b><br>Educación y Eventos para Líderes Globales` }
      : { subj: 'Thank you for reaching out, The New Global School',
          body: `Hi ${esc(name)},<br><br>Thanks for getting in touch. We've received your message and will get back to you shortly.<br><br>Best regards,<br><b>The New Global School</b><br>Education & Events for Global Leaders` };

    const autoreply = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      replyTo: FROM_EMAIL,
      subject: t.subj,
      headers: { 'List-Unsubscribe': `<mailto:${FROM_EMAIL}?subject=unsubscribe>` },
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${t.body}</div>`,
    };

    try {
      await transporter.sendMail(notify);
      await transporter.sendMail(autoreply);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('submitLead error:', err && err.message, '| code:', err && err.code);
      return res.status(500).json({ ok: false, error: 'send' });
    }
  }
);

// --- Auto-deploy del marketplace ---
// Dispara al crear/editar/borrar una experiencia en Firestore (DB de Aliados) y
// lanza el rebuild+deploy del sitio Astro vía GitHub Actions (repository_dispatch).
// El workflow re-lee Firestore en cada build → publica siempre el estado fresco.
const MARKETPLACE_DB = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const GH_TOKEN = defineSecret('GH_DISPATCH_TOKEN'); // PAT con scope repo (dispara Actions)
// GH_REPO ('owner/repo') se lee de env normal (functions/.env) → sin prompt en deploy.

export const onExperienceChange = onDocumentWritten(
  { document: 'experiences/{expId}', database: MARKETPLACE_DB, region: 'us-central1', secrets: [GH_TOKEN], maxInstances: 3 },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    // Solo redeployar si afecta a lo público (evita builds por borradores).
    if (!after?.publicListed && !before?.publicListed) return;

    const action = !before ? 'created' : !after ? 'deleted' : 'updated';
    const slug = (after || before)?.slug || event.params.expId;
    const repo = process.env.GH_REPO || '';
    const token = GH_TOKEN.value();
    if (!repo || !token) {
      console.error('onExperienceChange: falta GH_REPO o GH_DISPATCH_TOKEN, no se pudo disparar el build.');
      return;
    }

    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'tngs-marketplace-deployer',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: 'marketplace-publish', client_payload: { action, slug } }),
      });
      if (!r.ok) console.error('onExperienceChange: dispatch falló', r.status, await r.text());
      else console.log(`onExperienceChange: build disparado (${action}: ${slug})`);
    } catch (err) {
      console.error('onExperienceChange error:', err && err.message);
    }
  }
);

// --- Actualización en vivo del detalle ("freshen") ---
// GET /api/experience?slug=X&lang=es|en -> { slug, html: {title,summary,meta,price,highlights,sections,collaborators,gallery,testimonials} }
// La página estática se auto-refresca con esto al cargar, así los visitantes ven los
// cambios en segundos sin esperar el rebuild. Fragmentos ya renderizados en HTML (una
// sola fuente de render; el cliente solo hace innerHTML). Cacheado en el CDN (lecturas mínimas).
function fmtDate(iso, locale) {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso || ''; }
}
// Texto de estaciones para el hero: "Verano e Invierno 2027" / "Summer & Winter 2027".
function seasonsText(x, L) {
  const eds = Array.isArray(x.editions) ? x.editions : [];
  if (!eds.length) {
    return x.startDate ? new Date(x.startDate + 'T00:00:00').toLocaleDateString(L ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' }) : '';
  }
  const S = { summer: { es: 'Verano', en: 'Summer' }, winter: { es: 'Invierno', en: 'Winter' } };
  const lang = L ? 'es' : 'en';
  const parts = [];
  if (eds.some((e) => e.season === 'summer')) parts.push(S.summer[lang]);
  if (eds.some((e) => e.season === 'winter')) parts.push(S.winter[lang]);
  const year = new Date(eds[0].startDate + 'T00:00:00').getFullYear();
  const joined = parts.length === 2 ? `${parts[0]} ${L ? 'e' : '&'} ${parts[1]}` : parts.join(', ');
  return `${joined} ${year}`;
}
// Lista estándar "Tu experiencia completa" (viajes), espejo de src/lib/inclusions.ts.
const DEFAULT_INCL = {
  es: {
    included: ['Alojamiento en hoteles con encanto y bien ubicados.', 'Todos los desayunos y los almuerzos o cenas especificados en el itinerario.', 'Guías expertos e historiadores durante todo el recorrido.', 'Entradas a todos los museos, monumentos y sitios históricos del itinerario.', 'Transporte privado cómodo para todos los traslados entre ciudades y actividades.', 'Talleres exclusivos, catas y experiencias inmersivas descritas en el programa.', 'Un paquete de bienvenida con materiales de lectura y un diario de viaje.', 'Seguro de viaje básico.'],
    notIncluded: ['Vuelos internacionales de ida y vuelta al punto de inicio/fin de la expedición.', 'Seguro médico y de cancelación (obligatorio y adicional al básico).', 'Comidas y bebidas no especificadas en el itinerario.', 'Gastos personales, compras y souvenirs.', 'Actividades opcionales durante el tiempo libre.', 'Propinas para guías y conductores.'],
  },
  en: {
    included: ['Accommodation in charming, well-located hotels.', 'All breakfasts and the lunches or dinners specified in the itinerary.', 'Expert guides and historians throughout the journey.', 'Entrance to all museums, monuments and historic sites in the itinerary.', 'Comfortable private transport for all transfers between cities and activities.', 'Exclusive workshops, tastings and immersive experiences described in the program.', 'A welcome pack with reading materials and a travel journal.', 'Basic travel insurance.'],
    notIncluded: ['Round-trip international flights to the expedition start/end point.', 'Medical and cancellation insurance (mandatory, additional to the basic one).', 'Meals and drinks not specified in the itinerary.', 'Personal expenses, purchases and souvenirs.', 'Optional activities during free time.', 'Tips for guides and drivers.'],
  },
};
function renderFragments(x, lang) {
  const L = lang === 'es';
  const locale = L ? 'es-ES' : 'en-US';
  const a = (arr) => (Array.isArray(arr) ? arr : []);
  const dateStr = x.endDate ? `${fmtDate(x.startDate, locale)} – ${fmtDate(x.endDate, locale)}` : fmtDate(x.startDate, locale);

  const meta = `📍 ${x.venue ? esc(x.venue) + ' · ' : ''}${esc(x.city || '')}, ${esc(x.country || '')} &nbsp;·&nbsp; 🗓 ${esc(seasonsText(x, L))} &nbsp;·&nbsp; 🗣 ${esc(x.language || '')}`;
  const price = Number(x.publicPrice) === 0
    ? (L ? 'Gratis' : 'Free')
    : `${esc(x.currency || '')} ${Number(x.publicPrice || 0).toLocaleString()}<span class="cur"> / ${L ? 'persona' : 'person'}</span>`;
  const highlights = a(x.highlights).map((h) => `<li>${esc(h)}</li>`).join('');

  const sections = a(x.sections).length
    ? (x.description ? `<p class="xp-lead">${esc(x.description)}</p>` : '') +
      a(x.sections).map((s, i) => `<details class="acc"${i === 0 ? ' open' : ''}><summary>${esc(s.title)}<span class="acc-icon" aria-hidden="true"></span></summary><div class="acc-body xp-richbody">${marked.parse(s.md || '', { breaks: true })}</div></details>`).join('')
    : '';

  const collaborators = a(x.collaborators).length
    ? `<h2>${L ? 'Colaboradores y Expositores' : 'Collaborators & Speakers'}</h2><div class="collab-grid">` +
      a(x.collaborators).map((c) => `<figure class="collab-tile"${c.name ? ` title="${esc(c.name)}"` : ''}><img src="${esc(c.imageUrl)}" alt="${esc(c.name || 'Colaborador')}" loading="lazy">${c.name ? `<figcaption>${esc(c.name)}</figcaption>` : ''}</figure>`).join('') + `</div>`
    : '';

  const gallery = a(x.eventGallery).length
    ? `<div class="gallery-strip" data-autoplay>` +
      a(x.eventGallery).map((g, i) => `<figure class="gslide"><img src="${esc(g.imageUrl)}" alt="${esc(g.caption || x.title || '')}" loading="${i === 0 ? 'eager' : 'lazy'}" width="1000" height="560"></figure>`).join('') + `</div>`
    : '';

  const testimonials = a(x.testimonials).length
    ? `<h2>${L ? 'Lo que dicen los participantes' : 'What participants say'}</h2><div class="testi-grid">` +
      a(x.testimonials).map((t) => `<figure class="testi-card glass">${t.headline ? `<p class="testi-headline">${esc(t.headline)}</p>` : ''}<blockquote>${esc(t.quote)}</blockquote><figcaption>${t.photo ? `<img class="testi-avatar" src="${esc(t.photo)}" alt="${esc(t.author)}" loading="lazy" width="46" height="46">` : ''}<div><strong>${esc(t.author)}</strong>${t.org ? (t.orgUrl ? `<a href="${esc(t.orgUrl)}" target="_blank" rel="noopener">${esc(t.org)}</a>` : `<span>${esc(t.org)}</span>`) : ''}</div></figcaption></figure>`).join('') + `</div>`
    : '';

  // viaje: listas del programa o el default; evento: solo lo que el aliado llenó.
  const def = x.type === 'viaje' ? DEFAULT_INCL[L ? 'es' : 'en'] : { included: [], notIncluded: [] };
  const incInc = a(x.included).length ? a(x.included) : def.included;
  const incNot = a(x.notIncluded).length ? a(x.notIncluded) : def.notIncluded;
  let inclusions = '';
  if (incInc.length || incNot.length) {
    inclusions = `<h2>${L ? 'Tu experiencia completa' : 'Your complete experience'}</h2><div class="xp-incl">` +
      (incInc.length ? `<div><h4 class="ok">${L ? '✓ Qué incluye' : "✓ What's included"}</h4><ul>${incInc.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '') +
      (incNot.length ? `<div><h4 class="no">${L ? '✕ Qué no incluye' : '✕ Not included'}</h4><ul>${incNot.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '') +
      `</div>`;
  }

  return { title: x.title || '', summary: x.summary || '', meta, price, highlights, sections, collaborators, gallery, testimonials, inclusions };
}

export const experiencePublic = onRequest(
  { region: 'us-central1', cors: ['https://theglobal.school', 'https://es.theglobal.school', 'http://localhost:4321'], maxInstances: 10 },
  async (req, res) => {
    const slug = (req.query.slug || '').toString().trim();
    const lang = req.query.lang === 'en' ? 'en' : 'es';
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(400).json({ error: 'slug' });
    try {
      const db = votesDb();
      // Puede haber 2 docs con el mismo slug (versión ES y EN) → elegir el del idioma pedido.
      const snap = await db.collection('experiences').where('slug', '==', slug).where('publicListed', '==', true).get();
      const doc = snap.docs.find((d) => { const s = d.data().sites; return !s || !s.length || s.includes(lang); });
      if (!doc) { res.set('Cache-Control', 'public, max-age=30'); return res.status(404).json({ error: 'not_found' }); }
      res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
      return res.json({ slug, html: renderFragments(doc.data(), lang) });
    } catch (err) {
      console.error('experiencePublic error:', err && err.message);
      return res.status(500).json({ error: 'server' });
    }
  }
);

// --- Votación del marketplace ("Más votados"), 1 voto por IP ---
// GET  /api/votes           -> { counts: {slug:votes}, voted: [slugs que esta IP ya votó] }
// POST /api/votes {slug}     -> registra 1 voto (dedup por hash de IP), devuelve { ok, votes, already }
// Datos en la DB de Aliados (Admin SDK, sin exponer reglas). IP hasheada (privacidad).
const VOTES_DB = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const VOTE_SALT = 'tngs-mkt-votes-2026';

function votesDb() {
  const app = getApps().length ? getApps()[0] : initializeApp();
  return getFirestore(app, VOTES_DB);
}
function ipHashOf(req) {
  const xf = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  const ip = xf || req.ip || 'unknown';
  return crypto.createHash('sha256').update(ip + VOTE_SALT).digest('hex').slice(0, 40);
}

export const marketplaceVotes = onRequest(
  { region: 'us-central1', cors: ['https://theglobal.school', 'https://es.theglobal.school', 'http://localhost:4321'], maxInstances: 5 },
  async (req, res) => {
    const db = votesDb();
    const hash = ipHashOf(req);

    if (req.method === 'GET') {
      const snap = await db.collection('experience_votes').get();
      const counts = {};
      snap.forEach((d) => { counts[d.id] = d.data().votes || 0; });
      const votedSnap = await db.collection('vote_ips').where('ipHash', '==', hash).get();
      const voted = votedSnap.docs.map((d) => d.data().slug);
      return res.json({ counts, voted });
    }

    if (req.method === 'POST') {
      const slug = (req.body && req.body.slug ? req.body.slug : '').toString().trim();
      if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(400).json({ ok: false, error: 'slug' });
      const ipRef = db.collection('vote_ips').doc(`${slug}__${hash}`);
      const countRef = db.collection('experience_votes').doc(slug);
      try {
        const result = await db.runTransaction(async (tx) => {
          const existing = await tx.get(ipRef);
          const countDoc = await tx.get(countRef);
          const current = countDoc.exists ? (countDoc.data().votes || 0) : 0;
          if (existing.exists) return { already: true, votes: current };
          tx.set(ipRef, { slug, ipHash: hash, at: new Date().toISOString() });
          tx.set(countRef, { slug, votes: current + 1, updatedAt: new Date().toISOString() }, { merge: true });
          return { already: false, votes: current + 1 };
        });
        return res.json({ ok: true, ...result });
      } catch (err) {
        console.error('marketplaceVotes error:', err && err.message);
        return res.status(500).json({ ok: false, error: 'tx' });
      }
    }
    return res.status(405).json({ ok: false });
  }
);
