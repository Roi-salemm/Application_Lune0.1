import { FeatureSectionList } from '@/core/feature-flags/feature-renderer';
import { CALENDAR_REGISTRY } from '@/features/calendar/registry';

export default function CalendarFeatureScreen() {
  return <FeatureSectionList components={CALENDAR_REGISTRY} />;
}
