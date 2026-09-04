// Qué incluye / No incluye, lista ESTÁNDAR para expediciones (type='viaje'),
// portada de Viajes (Inclusions.tsx). Bilingüe.
import type { Lang } from './site';

const ES = {
  included: [
    'Alojamiento en hoteles con encanto y bien ubicados.',
    'Todos los desayunos y los almuerzos o cenas especificados en el itinerario.',
    'Guías expertos e historiadores durante todo el recorrido.',
    'Entradas a todos los museos, monumentos y sitios históricos del itinerario.',
    'Transporte privado cómodo para todos los traslados entre ciudades y actividades.',
    'Talleres exclusivos, catas y experiencias inmersivas descritas en el programa.',
    'Un paquete de bienvenida con materiales de lectura y un diario de viaje.',
    'Seguro de viaje básico.',
  ],
  notIncluded: [
    'Vuelos internacionales de ida y vuelta al punto de inicio/fin de la expedición.',
    'Comidas y bebidas no especificadas en el itinerario.',
    'Gastos personales, compras y souvenirs.',
    'Actividades opcionales durante el tiempo libre.',
    'Propinas (opcionales).',
  ],
};

const EN = {
  included: [
    'Accommodation in charming, well-located hotels.',
    'All breakfasts and the lunches or dinners specified in the itinerary.',
    'Expert guides and historians throughout the journey.',
    'Entrance to all museums, monuments and historic sites in the itinerary.',
    'Comfortable private transport for all transfers between cities and activities.',
    'Exclusive workshops, tastings and immersive experiences described in the program.',
    'A welcome pack with reading materials and a travel journal.',
    'Basic travel insurance.',
  ],
  notIncluded: [
    'Round-trip international flights to the expedition start/end point.',
    'Meals and drinks not specified in the itinerary.',
    'Personal expenses, purchases and souvenirs.',
    'Optional activities during free time.',
    'Tips (optional).',
  ],
};

export function getInclusions(lang: Lang) {
  return lang === 'es' ? ES : EN;
}
