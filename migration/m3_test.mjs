import { readFileSync } from 'node:fs';
const cred = JSON.parse(readFileSync('gen-lang-client-0345505794-firebase-adminsdk-fbsvc-c4b77a5ab8.json','utf8'));
const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const app = initializeApp({ credential: cert(cred) });
const db = getFirestore(app, 'ai-studio-6aba9233-6f6c-455d-be53-29923fe66f0f');
const id = 'test-m3-delete-me';
await db.collection('experiences').doc(id).set({
  slug: id, type: 'evento', title: 'PRUEBA M3 (borrar)', publicListed: true,
  publisherType: 'tgs', updatedAt: new Date().toISOString(),
}, { merge: true });
console.log('✓ doc de prueba creado:', id);
process.exit(0);
