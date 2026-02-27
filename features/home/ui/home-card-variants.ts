// Variantes visuelles des cards de la home.
// Pourquoi : centraliser le blur, l'opacite et les couleurs de fond pour garder un controle rapide.
// Info : chaque variante ajuste une teinte/alpha pour permettre des fonds differents par card.
import { Colors } from '@/constants/theme';

export type HomeCardVariant =
  | 'default'
  | 'astronomie-primary'
  | 'astronomie-secondary'
  | 'moon-daily'
  | 'astro-daily';

export type HomeCardVariantConfig = {
  intensity: number;
  overlayAlpha: number;
  borderAlpha: number;
  overlayColorName: keyof typeof Colors.dark;
};

export const HOME_CARD_VARIANTS: Record<HomeCardVariant, HomeCardVariantConfig> = {
  default: {
    intensity: 1,
    overlayAlpha: 0.75,
    borderAlpha: 0.45,
    overlayColorName: 'surface',
  },
  'astronomie-primary': {
    intensity: 9,
    overlayAlpha: 0.75,
    borderAlpha: 0.55,
    overlayColorName: 'surface',
  },
  'astronomie-secondary': {
    intensity: 20,
    overlayAlpha: 0.75,
    borderAlpha: 0.5,
    overlayColorName: 'border',
  },
  'moon-daily': {
    intensity: 20,
    overlayAlpha: 0.75,
    borderAlpha: 0.45,
    // overlayColorName: 'btn-action',
    overlayColorName: 'surface',
  },
  'astro-daily': {
    intensity: 20,
    overlayAlpha: 0.75,
    borderAlpha: 0.5,
    // overlayColorName: 'earth',
    overlayColorName: 'surface',
  },
};
