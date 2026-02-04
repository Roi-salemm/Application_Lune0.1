import type { FeatureComponentDefinition } from '@/core/feature-flags/feature-types';
import { CalendarMain } from '@/features/calendar/features/calendar-main';

export const CALENDAR_REGISTRY: readonly FeatureComponentDefinition[] = [
  {
    id: 'calendar.main',
    feature: 'calendar',
    label: 'Calendar',
    component: CalendarMain,
    defaults: {
      available: true,
      defaultEnabled: true,
      userToggleable: false,
    },
  },
] as const;
