// Lector de experiencias en BUILD-TIME.
// Fuente única: colección `experiences` en el Firestore de Aliados (DB no-default).
// Si no hay credenciales disponibles, cae al puente JSON (build siempre funciona).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Experience } from '../data/experiences';
import { getExperiences as bridge } from '../data/experiences';

const DATABASE_ID = 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f';
const COLLECTION = 'experiences';

function loadCredential(): Record<string, any> | null {
  const env = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (env) {
    try { return JSON.parse(env); } catch { /* ignore */ }
  }
  const keyPath = resolve(process.cwd(), 'gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json');
  if (existsSync(keyPath)) {
    try { return JSON.parse(readFileSync(keyPath, 'utf8')); } catch { /* ignore */ }
  }
  return null;
}

// Normaliza un doc a la forma que esperan las plantillas. Las experiencias creadas
// desde el panel de Aliados guardan `publisherType` (string) en vez de `publisher`
// (objeto), y pueden omitir campos → esto evita crashes en build (ej. x.publisher.type).
function normalizeExperience(x: any): Experience {
  const publisher = (x.publisher && typeof x.publisher === 'object')
    ? x.publisher
    : {
        type: x.publisherType === 'ally' ? 'ally' : 'tgs',
        name: x.publisherType === 'ally' ? (x.publisherName || x.allyName || 'Aliado') : 'The New Global School',
      };
  return {
    ...x,
    type: x.type === 'viaje' ? 'viaje' : 'evento',
    publisher,
    highlights: Array.isArray(x.highlights) ? x.highlights : [],
    publicPrice: typeof x.publicPrice === 'number' ? x.publicPrice : (Number(x.publicPrice) || 0),
    currency: x.currency || 'EUR',
  } as Experience;
}

let cache: Promise<Experience[]> | null = null;

async function fetchFromFirestore(): Promise<Experience[]> {
  const cred = loadCredential();
  if (!cred) {
    console.warn('[experiences] Sin credenciales Firestore → usando puente JSON local.');
    return bridge().map(normalizeExperience);
  }
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(cred as any) }, 'experiences-reader');
    const db = getFirestore(app, DATABASE_ID);
    const snap = await db.collection(COLLECTION).where('publicListed', '==', true).get();
    const items = snap.docs.map((d) => normalizeExperience(d.data()));
    if (!items.length) {
      console.warn('[experiences] Firestore vacío → puente JSON.');
      return bridge().map(normalizeExperience);
    }
    // eventos primero, luego viajes; dentro, por fecha ascendente
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'evento' ? -1 : 1;
      return (a.startDate || '').localeCompare(b.startDate || '');
    });
    console.log(`[experiences] ${items.length} experiencias leídas de Firestore.`);
    return items;
  } catch (err) {
    console.warn('[experiences] Error leyendo Firestore → puente JSON:', (err as Error).message);
    return bridge().map(normalizeExperience);
  }
}

export function loadExperiences(): Promise<Experience[]> {
  if (!cache) cache = fetchFromFirestore();
  return cache;
}
