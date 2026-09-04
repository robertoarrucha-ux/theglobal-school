// Ediciones estacionales de un viaje (Verano / Invierno). Helper compartido por
// las plantillas de detalle, listados y home. Si no hay editions, cae a la fecha simple.
export interface Edition { season: 'summer' | 'winter'; startDate: string; endDate?: string }

const SEASON: Record<string, { es: string; en: string }> = {
  summer: { es: 'Verano', en: 'Summer' },
  winter: { es: 'Invierno', en: 'Winter' },
};

const yearOf = (iso: string) => new Date(iso + 'T00:00:00').getFullYear();

// Texto compacto para hero/tarjetas: "Verano e Invierno 2027" / "Summer & Winter 2027".
export function seasonsText(x: any, es: boolean): string {
  const eds: Edition[] = Array.isArray(x?.editions) ? x.editions : [];
  if (!eds.length) {
    return x?.startDate
      ? new Date(x.startDate + 'T00:00:00').toLocaleDateString(es ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })
      : '';
  }
  const lang = es ? 'es' : 'en';
  const parts: string[] = [];
  if (eds.some((e) => e.season === 'summer')) parts.push(SEASON.summer[lang]);
  if (eds.some((e) => e.season === 'winter')) parts.push(SEASON.winter[lang]);
  const year = yearOf(eds[0].startDate);
  const joined = parts.length === 2 ? `${parts[0]} ${es ? 'e' : '&'} ${parts[1]}` : parts.join(', ');
  return `${joined} ${year}`;
}

// Filas por edición para la caja lateral: { season: 'summer', label: "Verano 2027", range: "14 – 23 jul" }.
// `season` lo necesita la lista de espera, que cuenta interesados por salida.
export function editionRows(x: any, es: boolean): { season: 'summer' | 'winter'; label: string; range: string }[] {
  const eds: Edition[] = Array.isArray(x?.editions) ? x.editions : [];
  const loc = es ? 'es-ES' : 'en-US';
  const fmtS = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  // Verano primero, luego Invierno.
  const order = { summer: 0, winter: 1 } as Record<string, number>;
  return [...eds]
    .sort((a, b) => (order[a.season] ?? 9) - (order[b.season] ?? 9))
    .map((e) => ({
      season: e.season,
      label: `${SEASON[e.season] ? SEASON[e.season][es ? 'es' : 'en'] : ''} ${yearOf(e.startDate)}`.trim(),
      range: e.endDate ? `${fmtS(e.startDate)} – ${fmtS(e.endDate)}` : fmtS(e.startDate),
    }));
}
