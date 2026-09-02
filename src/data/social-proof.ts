// Prueba social transversal de The Global School.
//
// Los 16 viajes nuevos (historia, gastronomía) todavía no se han operado, así que no
// tienen testimonios propios y no se inventan. Lo que sí es cierto y comprobable es el
// historial de la escuela: 15 años, +200 viajes y eventos, +600 ex participantes, y
// testimonios reales de participantes de programas anteriores en Viena.
//
// Regla: aquí solo entra material verificable. Los testimonios están tomados tal cual
// de Firestore (programa "Diplomado Ejecutivo en Viena"); la versión EN es traducción
// y se marca como tal en la interfaz. Las fotos y logos son los archivos ya migrados.

export interface ProofStat { value: string; es: string; en: string }
export interface ProofQuote {
  quote: string;        // texto original (español), literal
  quoteEn: string;      // traducción para el sitio EN
  author: string;
  org: string;
  orgEn: string;
  photo: string;
}
export interface ProofLogo { name: string; src: string }

/** Historial de la escuela. Cifras dadas por dirección, usadas también en la página institucional. */
export const PROOF_STATS: ProofStat[] = [
  { value: '15', es: 'años operando en Europa', en: 'years operating in Europe' },
  { value: '+200', es: 'viajes y eventos realizados', en: 'trips and events delivered' },
  { value: '+600', es: 'ex participantes', en: 'past participants' },
  { value: '4', es: 'premios y reconocimientos', en: 'awards and recognitions' },
];

/**
 * Testimonios reales del Diplomado Ejecutivo en Viena. Se muestran en fichas que aún no
 * tienen testimonios propios, siempre indicando de qué programa provienen: hablan de la
 * escuela, no del viaje concreto que el visitante está mirando.
 */
export const PROOF_QUOTES: ProofQuote[] = [
  {
    quote: 'Es fascinante la forma en que las herramientas ayudan a resolver problemas reales.',
    quoteEn: 'It is fascinating how the tools help solve real problems.',
    author: 'Billy Batware',
    org: 'Academia Regional de las Naciones Unidas',
    orgEn: 'United Nations Regional Academy',
    photo: '/media/2020/07/Billy-crop-circle-150x150.webp',
  },
  {
    quote: 'Es una excelente organización que brinda una gran oportunidad de vivir ésta magnífica experiencia, adquirir conocimientos y nuevas amistades.',
    quoteEn: 'An excellent organization that gives you a great opportunity to live this magnificent experience, gain knowledge and make new friends.',
    author: 'Marcela Mejía',
    org: 'Oficina de Naciones Unidas contra la Droga y el Delito, Colombia',
    orgEn: 'United Nations Office on Drugs and Crime, Colombia',
    photo: '/media/2019/06/Liz-Marcela-Summit-circle-cropped-150x150.webp',
  },
  {
    quote: 'Gracias por todas las herramientas y enseñanzas, un programa práctico donde conocí a personas maravillosas.',
    quoteEn: 'Thank you for all the tools and lessons, a hands-on program where I met wonderful people.',
    author: 'Natalia Lever',
    org: 'The Climate Reality Project Latin America',
    orgEn: 'The Climate Reality Project Latin America',
    photo: '/media/2019/05/Natalia-Lever-Circle-Alumni-150x150.webp',
  },
];

/** Instituciones y organizaciones con las que se ha trabajado. Logos ya migrados a /media. */
export const PROOF_LOGOS: ProofLogo[] = [
  { name: 'Vienna School of Quality & Innovation', src: '/media/2026/01/Vienna-School-logo-black.webp' },
  { name: 'Impact Hub Vienna', src: '/media/2023/04/Impact-Hub-Vienna-Logo-webp.webp' },
  { name: 'The Climate Reality Project', src: '/media/2023/06/climate-reality-project-logo.webp' },
  { name: 'MDV', src: '/media/2022/11/MDV_Logo_RGB_white_red.webp' },
  { name: 'CAGG', src: '/media/2023/06/Logo-CAGG.webp' },
  { name: 'Champions of Our Planet', src: '/media/2023/09/Logo-champions.webp' },
  { name: 'Booster IIT', src: '/media/2023/11/LOGO-BOOSTERIIT-OFICIAL.webp' },
  { name: 'iSCAN', src: '/media/2023/10/iSCAN-Logo-1.webp' },
  { name: '1MillionStartups', src: '/media/2021/11/1MillionStartups-Logo.webp' },
];
