// Couleurs globales de l'app (light/dark) centralisees en tokens semantiques.
// Pourquoi : garantir une coherance visuelle et permettre de changer un theme sans toucher chaque composant.

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1D21',
    title: '#111318',
    annex: '#5E6672',
    background: '#F7F5F0',
    border: '#D9D4CC',
    'unselected-border': '#D0CAC2',
    surface: '#FFFFFF',
    'moon-default': '#E2E2E2',
    'btn-action': '#D3B658',
    'btn-nav': '#5E6672',
  },
  dark: {
    text: '#ECEDEE',
    title: '#F5F6F7',
    annex: '#C9CDD2',
    background: '#000000',
    border: '#434344',
    'unselected-border': '#55595F',
    surface: '#222324',
    'moon-default': '#E2E2E2',
    'btn-action': '#D3B658',
    'btn-nav': '#C7CBD1',
  },
};

export function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) {
    return color;
  }

  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((value) => `${value}${value}`)
      .join('');
  }
  if (hex.length !== 6) {
    return color;
  }

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
