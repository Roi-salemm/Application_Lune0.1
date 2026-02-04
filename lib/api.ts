import Constants from 'expo-constants';
import { Platform } from 'react-native';

const FALLBACK_API_BASE_URL = 'http://localhost:8000';

function extractHost(hostUri?: string | null) {
  if (!hostUri) {
    return null;
  }
  const withoutProtocol = hostUri.replace(/^[a-z]+:\/\//i, '');
  const hostPort = withoutProtocol.split('/')[0];
  const host = hostPort.split(':')[0];
  return host || null;
}

function resolveLocalApiBase() {
  const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : undefined;
  if (Platform.OS === 'web' && win?.location) {
    return `${win.location.protocol}//${win.location.hostname}:8000`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // @ts-expect-error - manifest is still available in some Expo runtimes.
    Constants.manifest?.hostUri ??
    null;
  const host = extractHost(hostUri);
  if (host) {
    return `http://${host}:8000`;
  }

  return FALLBACK_API_BASE_URL;
}

const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
export const API_BASE_URL =
  envBase && envBase.trim().length > 0 ? envBase : resolveLocalApiBase();

export function withApiBase(path: string) {
  if (!path) {
    return API_BASE_URL;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
