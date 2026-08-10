// Extrae el ID de un enlace de YouTube (watch, youtu.be, embed, shorts, live) o un ID pelado.
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const s = String(url).trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : null;
}
