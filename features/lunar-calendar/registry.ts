import type { FeatureComponentDefinition } from '@/core/feature-flags/feature-types';
import { LunarCalendarMain } from '@/features/lunar-calendar/features/lunar-calendar-main';

export const LUNAR_CALENDAR_REGISTRY: readonly FeatureComponentDefinition[] = [
  {
    id: 'lunar-calendar.main',
    feature: 'lunar-calendar',
    label: 'Lunar Calendar',
    component: LunarCalendarMain,
    defaults: {
      available: true,
      defaultEnabled: true,
      userToggleable: false,
    },
  },
] as const;
