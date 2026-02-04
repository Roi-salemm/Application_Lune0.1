import type { ComponentType } from 'react';

export type FeatureKey =
  | 'home'
  | 'calendar'
  | 'lunar-calendar'
  | 'mancy'
  | 'profile'
  | 'settings';

export type FeatureComponentDefaults = {
  available: boolean;
  defaultEnabled: boolean;
  userToggleable: boolean;
  disabledFromUtc?: string | null;
  disabledUntilUtc?: string | null;
};

export type FeatureComponentDefinition = {
  id: string;
  feature: FeatureKey;
  label: string;
  component: ComponentType;
  defaults: FeatureComponentDefaults;
};

export type FeatureDevFlag = Partial<FeatureComponentDefaults>;

export type FeatureDevFlagMap = Record<string, FeatureDevFlag>;

export type FeatureUserFlagMap = Record<string, boolean>;

export type ResolvedComponentState = {
  available: boolean;
  visible: boolean;
  userToggleable: boolean;
  defaultEnabled: boolean;
  disabledFromUtc?: string | null;
  disabledUntilUtc?: string | null;
};
