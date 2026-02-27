// Gestionnaire global de polling adaptatif.
// Pourquoi : centraliser les rafraichissements, appliquer des delais adaptes et couper en background.
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useMemo } from 'react';

export type AdaptivePollingJobConfig = {
  id: string;
  run: () => Promise<number | void>;
  defaultDelayMs: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  errorDelayMs?: number;
  immediate?: boolean;
};

type AdaptiveJob = {
  id: string;
  config: AdaptivePollingJobConfig;
  activeCount: number;
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
};

const jobs = new Map<string, AdaptiveJob>();
let currentAppState: AppStateStatus = AppState.currentState ?? 'active';
let appIsActive = currentAppState === 'active';
let appListenerReady = false;

const clampDelay = (value: number, minDelay?: number, maxDelay?: number) => {
  const min = Number.isFinite(minDelay) ? (minDelay as number) : 0;
  const max = Number.isFinite(maxDelay) ? (maxDelay as number) : Number.POSITIVE_INFINITY;
  return Math.max(min, Math.min(max, value));
};

const ensureAppListener = () => {
  if (appListenerReady) {
    return;
  }
  appListenerReady = true;
  AppState.addEventListener('change', (nextState) => {
    currentAppState = nextState;
    appIsActive = nextState === 'active';
    if (!appIsActive) {
      for (const job of jobs.values()) {
        if (job.timer) {
          clearTimeout(job.timer);
          job.timer = null;
        }
      }
      return;
    }
    for (const job of jobs.values()) {
      if (job.activeCount > 0 && !job.timer && !job.running) {
        scheduleJob(job, 0);
      }
    }
  });
};

const getJob = (config: AdaptivePollingJobConfig) => {
  let job = jobs.get(config.id);
  if (!job) {
    job = {
      id: config.id,
      config,
      activeCount: 0,
      timer: null,
      running: false,
    };
    jobs.set(config.id, job);
  } else {
    job.config = config;
  }
  return job;
};

const canRun = (job: AdaptiveJob) => appIsActive && job.activeCount > 0;

const scheduleJob = (job: AdaptiveJob, delayMs: number) => {
  if (!canRun(job)) {
    return;
  }
  if (job.timer) {
    clearTimeout(job.timer);
  }
  job.timer = setTimeout(() => {
    void runJob(job);
  }, delayMs);
};

const runJob = async (job: AdaptiveJob) => {
  if (!canRun(job) || job.running) {
    return;
  }
  job.running = true;
  let nextDelay = job.config.defaultDelayMs;

  try {
    const result = await job.config.run();
    if (typeof result === 'number' && Number.isFinite(result)) {
      nextDelay = result;
    }
  } catch {
    nextDelay = job.config.errorDelayMs ?? job.config.defaultDelayMs;
  } finally {
    job.running = false;
  }

  if (!canRun(job)) {
    return;
  }

  const clampedDelay = clampDelay(nextDelay, job.config.minDelayMs, job.config.maxDelayMs);
  scheduleJob(job, clampedDelay);
};

const activateJob = (config: AdaptivePollingJobConfig) => {
  ensureAppListener();
  const job = getJob(config);
  job.activeCount += 1;
  if (canRun(job) && !job.timer && !job.running) {
    const shouldRunNow = job.config.immediate !== false;
    scheduleJob(job, shouldRunNow ? 0 : job.config.defaultDelayMs);
  }
};

const deactivateJob = (id: string) => {
  const job = jobs.get(id);
  if (!job) {
    return;
  }
  job.activeCount = Math.max(0, job.activeCount - 1);
  if (job.activeCount === 0 && job.timer) {
    clearTimeout(job.timer);
    job.timer = null;
  }
};

export function useAdaptivePollingJob(config: AdaptivePollingJobConfig, isActive: boolean) {
  const stableConfig = useMemo(() => config, [config]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    activateJob(stableConfig);
    return () => {
      deactivateJob(stableConfig.id);
    };
  }, [isActive, stableConfig]);

  useEffect(() => {
    if (!jobs.has(stableConfig.id)) {
      return;
    }
    const job = getJob(stableConfig);
    if (job.activeCount > 0 && canRun(job) && !job.timer && !job.running) {
      scheduleJob(job, 0);
    }
  }, [stableConfig]);
}
