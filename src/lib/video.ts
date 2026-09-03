// Extrae el ID de un enlace de YouTube (watch, youtu.be, embed, shorts, live) o un ID pelado.
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const s = String(url).trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : null;
}

// Fechas reales de subida de nuestros dos videos por defecto (ES y EN).
// Viven aquí y no en cada página para que las dos versiones no puedan divergir.
export const VIDEO_UPLOAD_DATES: Record<string, string> = {
  x_u3hDVb95o: '2021-02-23', // ES
  Ts5f7VJccmk: '2021-03-16', // EN
};

// Offset de Viena en la fecha de subida de ambos videos (CET; el horario de verano
// de 2021 empezó el 28 de marzo, después de las dos subidas).
const VIENNA_OFFSET = '+01:00';

/**
 * Normaliza una fecha de subida a ISO 8601 **con zona horaria**, que es lo que exige
 * `VideoObject.uploadDate`. Search Console marca una fecha suelta ('2021-02-23') como
 * valor de fecha y hora inválido y avisa de que le falta la zona horaria.
 *
 * Acepta cadena, Date o Timestamp de Firestore (por si el panel llega a guardar el campo).
 * Si el formato no se reconoce devuelve cadena vacía a propósito: quien llama omite
 * entonces el JSON-LD, porque no emitir dato estructurado es mejor que emitirlo mal.
 */
export function videoUploadDateIso(value?: unknown, offset: string = VIENNA_OFFSET): string {
  if (!value) return '';

  // Timestamp de Firestore
  if (typeof value === 'object' && value !== null && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();

  const s = String(value).trim();
  if (!s) return '';
  // Ya trae zona horaria (Z u offset ±HH:MM / ±HHMM)
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)) return s;
  // Fecha suelta: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00${offset}`;
  // Fecha y hora sin zona: YYYY-MM-DDTHH:MM(:SS)
  const dt = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?$/);
  if (dt) return `${dt[1]}${dt[2] || ':00'}${offset}`;

  return '';
}
