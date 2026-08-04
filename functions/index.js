import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

// Secrets de Acumbamail DEDICADOS a theglobal.school (desacoplados de Aliados,
// que usa SMTP_PASS en el mismo project). Mismo valor de cuenta Acumbamail.
const SMTP_USER = defineSecret('TGS_SMTP_USER');
const SMTP_PASS = defineSecret('TGS_SMTP_PASS');

const SMTP_HOST = 'smtp.acumbamail.com';
const SMTP_PORT = 465; // SSL — config probada en awards.pro-latam.org
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
      subject: `Nuevo contacto web: ${name}${interest ? ` — ${interest}` : ''}`,
      html: `<h3>Nuevo mensaje desde el sitio (${lang.toUpperCase()})</h3>
        <p><b>Nombre:</b> ${esc(name)}</p>
        <p><b>Email:</b> ${esc(email)}</p>
        ${phone ? `<p><b>Teléfono:</b> ${esc(phone)}</p>` : ''}
        ${interest ? `<p><b>Interés:</b> ${esc(interest)}</p>` : ''}
        <p><b>Mensaje:</b><br>${esc(message).replace(/\n/g, '<br>')}</p>
        ${page ? `<p style="color:#888;font-size:12px">Página: ${esc(page)}</p>` : ''}`,
    };

    // 2) Autorespuesta al remitente
    const t = lang === 'es'
      ? { subj: 'Gracias por contactarnos — The New Global School',
          body: `Hola ${esc(name)},<br><br>Gracias por escribirnos. Hemos recibido tu mensaje y te responderemos muy pronto.<br><br>Un saludo,<br><b>The New Global School</b><br>Educación y Eventos para Líderes Globales` }
      : { subj: 'Thank you for reaching out — The New Global School',
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
const GH_REPO = defineString('GH_REPO', { default: '' }); // 'owner/repo' (set en functions/.env)

export const onExperienceChange = onDocumentWritten(
  { document: 'experiences/{expId}', database: MARKETPLACE_DB, region: 'us-central1', secrets: [GH_TOKEN], maxInstances: 3 },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    // Solo redeployar si afecta a lo público (evita builds por borradores).
    if (!after?.publicListed && !before?.publicListed) return;

    const action = !before ? 'created' : !after ? 'deleted' : 'updated';
    const slug = (after || before)?.slug || event.params.expId;
    const repo = GH_REPO.value();
    const token = GH_TOKEN.value();
    if (!repo || !token) {
      console.error('onExperienceChange: falta GH_REPO o GH_DISPATCH_TOKEN — no se pudo disparar el build.');
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
