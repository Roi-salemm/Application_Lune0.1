import { FeatureSectionList } from '@/core/feature-flags/feature-renderer';
import { MANCY_REGISTRY } from '@/features/mancy/registry';

export default function MancyScreen() {
  return <FeatureSectionList components={MANCY_REGISTRY} />;
}
