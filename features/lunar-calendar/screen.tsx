import { FeatureSectionList } from '@/core/feature-flags/feature-renderer';
import { LUNAR_CALENDAR_REGISTRY } from '@/features/lunar-calendar/registry';

export default function LunarCalendarScreen() {
  return <FeatureSectionList components={LUNAR_CALENDAR_REGISTRY} />;
}
