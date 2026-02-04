import { useMemo } from 'react';

import type { FeatureComponentDefinition } from '@/core/feature-flags/feature-types';
import { useFeatureSettings } from '@/core/feature-flags/feature-settings';

type FeatureSectionListProps = {
  components: readonly FeatureComponentDefinition[];
};

export function FeatureSectionList({ components }: FeatureSectionListProps) {
  const { resolved } = useFeatureSettings();
  const visibleComponents = useMemo(
    () => components.filter((def) => resolved[def.id]?.visible),
    [components, resolved]
  );

  return (
    <>
      {visibleComponents.map((def) => {
        const Component = def.component;
        return <Component key={def.id} />;
      })}
    </>
  );
}
