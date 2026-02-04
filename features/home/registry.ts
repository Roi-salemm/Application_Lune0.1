// Registre home : declare les blocs affiches sur l'accueil via feature flags.
// Pourquoi : isoler l'activation de modules (ex: debug) sans modifier l'ecran.
import type { FeatureComponentDefinition } from '@/core/feature-flags/feature-types';
import { HomeDebugControls } from '@/features/home/features/home-debug-controls';

export const HOME_REGISTRY: readonly FeatureComponentDefinition[] = [
  {
    id: 'home.debug-sqlite',
    feature: 'home',
    label: 'Debug SQLite',
    component: HomeDebugControls,
    defaults: {
      available: true,
      defaultEnabled: true,
      userToggleable: false,
    },
  },
] as const;
