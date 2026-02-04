import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchRemoteFeatureFlags } from '@/core/feature-flags/feature-flags';
import { DEFAULT_DEV_FLAGS } from '@/core/feature-flags/registries';
import {
  type FeatureDevFlag,
  type FeatureDevFlagMap,
  type FeatureUserFlagMap,
  type ResolvedComponentState,
} from '@/core/feature-flags/feature-types';
import { DEV_FLAGS_STORAGE_KEY, USER_FLAGS_STORAGE_KEY } from '@/core/feature-flags/storage';

type FeatureSettingsContextValue = {
  ready: boolean;
  resolved: Record<string, ResolvedComponentState>;
  userFlags: FeatureUserFlagMap;
  setUserFlag: (id: string, enabled: boolean) => void;
  refreshDevFlags: () => Promise<void>;
};

const FeatureSettingsContext = createContext<FeatureSettingsContextValue | null>(null);

function isWithinDisabledWindow(flag: FeatureDevFlag, now = Date.now()) {
  const disabledFrom = flag.disabledFromUtc ? Date.parse(flag.disabledFromUtc) : null;
  const disabledUntil = flag.disabledUntilUtc ? Date.parse(flag.disabledUntilUtc) : null;

  if (disabledFrom && Number.isNaN(disabledFrom)) {
    return false;
  }
  if (disabledUntil && Number.isNaN(disabledUntil)) {
    return false;
  }

  if (disabledFrom && disabledUntil) {
    return now >= disabledFrom && now < disabledUntil;
  }
  if (disabledFrom) {
    return now >= disabledFrom;
  }
  if (disabledUntil) {
    return now < disabledUntil;
  }

  return false;
}

function mergeDevFlags(defaults: FeatureDevFlagMap, overrides: FeatureDevFlagMap) {
  const merged: FeatureDevFlagMap = { ...defaults };
  const keys = Object.keys(overrides);
  for (const key of keys) {
    if (!merged[key]) {
      continue;
    }
    merged[key] = {
      ...merged[key],
      ...overrides[key],
    };
  }
  return merged;
}

function resolveComponent(
  devFlag: FeatureDevFlag,
  userValue: boolean | undefined
): ResolvedComponentState {
  const available = devFlag.available !== false && !isWithinDisabledWindow(devFlag);
  const userToggleable = devFlag.userToggleable === true;
  const defaultEnabled = devFlag.defaultEnabled === true;

  let visible = defaultEnabled;
  if (userToggleable) {
    visible = userValue ?? defaultEnabled;
  }
  if (!available) {
    visible = false;
  }

  return {
    available,
    visible,
    userToggleable,
    defaultEnabled,
    disabledFromUtc: devFlag.disabledFromUtc ?? null,
    disabledUntilUtc: devFlag.disabledUntilUtc ?? null,
  };
}

export function FeatureSettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userFlags, setUserFlags] = useState<FeatureUserFlagMap>({});
  const [devFlags, setDevFlags] = useState<FeatureDevFlagMap>(DEFAULT_DEV_FLAGS);

  useEffect(() => {
    let cancelled = false;

    const loadLocalFlags = async () => {
      try {
        const [userRaw, devRaw] = await Promise.all([
          AsyncStorage.getItem(USER_FLAGS_STORAGE_KEY),
          AsyncStorage.getItem(DEV_FLAGS_STORAGE_KEY),
        ]);

        if (!cancelled && userRaw) {
          setUserFlags(JSON.parse(userRaw) as FeatureUserFlagMap);
        }
        if (!cancelled && devRaw) {
          const parsed = JSON.parse(devRaw) as FeatureDevFlagMap;
          setDevFlags(mergeDevFlags(DEFAULT_DEV_FLAGS, parsed));
        }
      } catch (error) {
        console.warn('Failed to load feature flags from storage', error);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void loadLocalFlags();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDevFlags = useCallback(async () => {
    try {
      const payload = await fetchRemoteFeatureFlags();
      const remote = (payload.components ?? {}) as FeatureDevFlagMap;
      const merged = mergeDevFlags(DEFAULT_DEV_FLAGS, remote);
      setDevFlags(merged);
      await AsyncStorage.setItem(DEV_FLAGS_STORAGE_KEY, JSON.stringify(remote));
    } catch (error) {
      console.warn('Failed to refresh dev feature flags', error);
    }
  }, []);

  useEffect(() => {
    void refreshDevFlags();
  }, [refreshDevFlags]);

  const resolved = useMemo(() => {
    const result: Record<string, ResolvedComponentState> = {};
    const keys = Object.keys(devFlags);
    for (const key of keys) {
      result[key] = resolveComponent(devFlags[key], userFlags[key]);
    }
    return result;
  }, [devFlags, userFlags]);

  const setUserFlag = useCallback((id: string, enabled: boolean) => {
    setUserFlags((prev) => {
      const next = { ...prev, [id]: enabled };
      void AsyncStorage.setItem(USER_FLAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      resolved,
      userFlags,
      setUserFlag,
      refreshDevFlags,
    }),
    [ready, resolved, userFlags, setUserFlag, refreshDevFlags]
  );

  return (
    <FeatureSettingsContext.Provider value={value}>{children}</FeatureSettingsContext.Provider>
  );
}

export function useFeatureSettings() {
  const ctx = useContext(FeatureSettingsContext);
  if (!ctx) {
    throw new Error('useFeatureSettings must be used within FeatureSettingsProvider');
  }
  return ctx;
}
