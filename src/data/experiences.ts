// M2 — datos de MUESTRA del marketplace (calzan con el schema M1 de Aliados).
// En producción esto lo reemplaza un lector de Firestore (Admin SDK) en build.
export type ExperienceType = 'viaje' | 'evento';
export type PaymentMode = 'platform' | 'direct';

// Estado de una experiencia: en votación (aún no agendada) o agendada (registro abierto).
export type ExperienceStatus = 'voting' | 'scheduled';

export interface Experience {
  slug: string;
  type: ExperienceType;
  title: string;
  summary: string;
  description: string;
  coverImageUrl: string;
  city: string;
  country: string;
  venue?: string;
  format?: 'presencial' | 'online' | 'hibrido';
  startDate: string;      // ISO
  endDate?: string;
  durationDays?: number;
  publicPrice: number;
  currency: string;       // 'EUR' | 'MXN' | 'USD'
  capacity?: number;
  spotsLeft?: number;
  language: string;
  paymentMode: PaymentMode;
  registerUrl?: string;   // override del CTA (p.ej. LALA → awards.pro-latam.org)
  publisher: { name: string; type: 'ally' | 'tgs'; logoUrl?: string };
  highlights: string[];
  agenda?: { label: string; title: string; detail: string }[];

  // --- Campos ricos de EXPEDICIÓN (viaje temático narrado) — opcionales ---
  category?: string;
  cities?: string[];
  leader?: { name: string; title: string; narrative: string };
  rationale?: { importance: string; learning: string; relevance: string };
  itinerary?: { day: number; title: string; description: string; relevance?: string }[];
  pricingTiers?: { threshold: number; discountPercent: number }[];
  preWork?: { title: string; items: { type: string; title: string; author: string }[] };
  // --- Votación (validación de demanda antes de agendar) ---
  status?: ExperienceStatus;   // 'scheduled' (default) | 'voting'
  votes?: number;
  voteThreshold?: number;

  // --- Formato de página (3 diseños) + secciones estructuradas (acordeones) ---
  layout?: 'viaje' | 'evento' | 'programa';
  sections?: { key: string; title: string; md: string }[];
  collaborators?: { imageUrl: string; name?: string }[];
  eventGallery?: { imageUrl: string; caption?: string }[];
  testimonials?: { quote: string; author: string; org?: string; orgUrl?: string; photo?: string; headline?: string }[];
  // "Tu experiencia completa" (viajes) — editable por programa; vacío = lista estándar.
  included?: string[];
  notIncluded?: string[];
}

// 16 expediciones reales importadas de Viajes (generadas por migration/transform_expeditions.mjs).
import generated from './expeditions.generated.json';
export const EXPEDITIONS = generated as unknown as Experience[];
// 3 eventos reales de TNGS (diplomado Viena, mujeres auténticas, LALA).
import tngsEvents from './tngs-events.json';
export const TNGS_EVENTS = tngsEvents as unknown as Experience[];

// Catálogo combinado que consume el marketplace (puente temporal hasta cablear Firestore).
export function getExperiences(): Experience[] {
  return [...TNGS_EVENTS, ...EXPEDITIONS];
}

// (Eventos de muestra originales — ya no se usan, reemplazados por TNGS_EVENTS.)
const SAMPLE_EVENTS: Experience[] = [
  {
    slug: 'summit-liderazgo-regenerativo-viena-2026',
    type: 'evento',
    title: 'Summit de Liderazgo Regenerativo · Viena 2026',
    summary: 'Dos días con líderes de gobierno y empresa sobre liderazgo regenerativo y ciudades inteligentes.',
    description:
      'Un encuentro internacional en el corazón de Viena para explorar el liderazgo regenerativo, la innovación social y las ciudades inteligentes. Conferencias magistrales, paneles y networking con tomadores de decisión de Europa y América Latina.',
    coverImageUrl: '/media/2022/10/Viena-Latin-American-Leaders-Awards.webp',
    city: 'Viena',
    country: 'Austria',
    venue: 'Impact Hub Vienna',
    format: 'presencial',
    startDate: '2026-09-22',
    endDate: '2026-09-23',
    publicPrice: 490,
    currency: 'EUR',
    capacity: 120,
    spotsLeft: 38,
    language: 'Español / Inglés',
    paymentMode: 'platform',
    publisher: { name: 'The New Global School', type: 'tgs' },
    highlights: [
      'Certificado internacional de participación',
      'Acceso a la red de líderes TNGS',
      'Coffee breaks y cena de gala incluidos',
    ],
    agenda: [
      { label: 'Día 1', title: 'Liderazgo Regenerativo', detail: 'Conferencias magistrales y panel de gobierno.' },
      { label: 'Día 2', title: 'Ciudades Inteligentes', detail: 'Casos Viena + taller de innovación social.' },
    ],
  },
  {
    slug: 'viaje-educativo-innovacion-social-berlin',
    type: 'viaje',
    title: 'Viaje Educativo: Innovación Social en Berlín',
    summary: 'Programa de 6 días visitando startups de impacto, ONGs y gobierno en Berlín.',
    description:
      'Una inmersión de una semana en el ecosistema de innovación social de Berlín: visitas a startups de impacto, organizaciones civiles, agencias de gobierno y espacios de co-creación. Incluye mentorías y un proyecto aplicado.',
    coverImageUrl: '/media/2023/04/Impact-Hub-Vienna-Logo-webp.webp',
    city: 'Berlín',
    country: 'Alemania',
    format: 'presencial',
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    durationDays: 6,
    publicPrice: 2450,
    currency: 'EUR',
    capacity: 25,
    spotsLeft: 11,
    language: 'Español',
    paymentMode: 'direct',
    publisher: { name: 'Aliado: Latam Impact Tours', type: 'ally' },
    highlights: [
      'Alojamiento y traslados incluidos',
      'Certificado TNGS + carta de recomendación',
      'Mentoría 1:1 con líderes locales',
    ],
    agenda: [
      { label: 'Días 1-2', title: 'Ecosistema de impacto', detail: 'Startups sociales y aceleradoras.' },
      { label: 'Días 3-4', title: 'Gobierno y sociedad civil', detail: 'Visitas y mesas de trabajo.' },
      { label: 'Días 5-6', title: 'Proyecto aplicado', detail: 'Diseño y pitch final.' },
    ],
  },
  {
    slug: 'webinar-financiamiento-proyectos-sostenibles',
    type: 'evento',
    title: 'Webinar: Financiamiento para Proyectos Sostenibles',
    summary: 'Sesión online de 2h sobre acceso a fondos internacionales de desarrollo.',
    description:
      'Aprende a estructurar y presentar proyectos para acceder a fondos internacionales de desarrollo sostenible. Sesión práctica en vivo con casos reales y plantillas descargables.',
    coverImageUrl: '/media/2023/06/Logo-CAGG.webp',
    city: 'Online',
    country: 'Global',
    format: 'online',
    startDate: '2026-08-15',
    publicPrice: 0,
    currency: 'EUR',
    capacity: 500,
    spotsLeft: 240,
    language: 'Español',
    paymentMode: 'platform',
    publisher: { name: 'The New Global School', type: 'tgs' },
    highlights: ['Gratuito con registro', 'Grabación y plantillas incluidas', 'Certificado de asistencia'],
  },
  {
    slug: 'mision-diplomatica-ginebra-derechos-humanos',
    type: 'viaje',
    title: 'Misión Diplomática: Derechos Humanos en Ginebra',
    summary: 'Programa ejecutivo de 4 días en la ONU y organismos internacionales en Ginebra.',
    description:
      'Programa ejecutivo para líderes de gobierno y sociedad civil: sesiones en la ONU, reuniones con misiones diplomáticas y organismos de derechos humanos en Ginebra.',
    coverImageUrl: '/media/2023/03/Programas-Agu-Rob-ONU-.webp',
    city: 'Ginebra',
    country: 'Suiza',
    format: 'presencial',
    startDate: '2026-11-03',
    endDate: '2026-11-06',
    durationDays: 4,
    publicPrice: 3200,
    currency: 'CHF',
    capacity: 18,
    spotsLeft: 6,
    language: 'Español / Inglés',
    paymentMode: 'platform',
    publisher: { name: 'The New Global School', type: 'tgs' },
    highlights: ['Acceso a sesiones ONU', 'Networking diplomático', 'Certificado ejecutivo TNGS'],
  },
];
