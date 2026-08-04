// Configuración de idioma activo del build (lee SITE_LANG en build/dev).
export type Lang = 'en' | 'es';
export const LANG: Lang = (import.meta.env.SITE_LANG === 'es' ? 'es' : 'en');

export const OTHER_ORIGIN: Record<Lang, string> = {
  en: 'https://es.theglobal.school',
  es: 'https://theglobal.school',
};
export const SELF_ORIGIN: Record<Lang, string> = {
  en: 'https://theglobal.school',
  es: 'https://es.theglobal.school',
};

export const BRAND = 'The New Global School';

export const UI: Record<Lang, {
  tagline: string;
  nav: { label: string; href: string }[];
  latest: string;
  footer: string;
  langSwitch: string;
}> = {
  en: {
    tagline: 'Education & Events for Global Leaders',
    nav: [
      { label: 'Home', href: '/' },
      { label: 'Blog', href: '/#blog' },
      { label: 'About', href: '/about-us/' },
      { label: 'Europe', href: '/europe/' },
    ],
    latest: 'Latest articles',
    footer: 'Education and events for leaders in government and business. Since 2010, Vienna.',
    langSwitch: 'Español',
  },
  es: {
    tagline: 'Educación y Eventos para Líderes Globales',
    nav: [
      { label: 'Inicio', href: '/' },
      { label: 'Blog', href: '/#blog' },
      { label: 'Nosotros', href: '/about-us/' },
      { label: 'Alianzas', href: '/alianzas/' },
    ],
    latest: 'Últimos artículos',
    footer: 'Educación y eventos para líderes de gobierno y empresa. Desde 2010, Viena.',
    langSwitch: 'English',
  },
};
