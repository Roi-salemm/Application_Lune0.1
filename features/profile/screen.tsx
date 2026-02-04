import { FeatureSectionList } from '@/core/feature-flags/feature-renderer';
import { PROFILE_REGISTRY } from '@/features/profile/registry';

export default function ProfileScreen() {
  return <FeatureSectionList components={PROFILE_REGISTRY} />;
}
