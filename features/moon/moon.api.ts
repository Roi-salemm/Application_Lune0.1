// API lune : appels HTTP aux endpoints lunaires et typage des reponses.
// Pourquoi : isoler les contrats reseau et centraliser les formats.
import { withApiBase } from '@/lib/api';

export type MoonCanoniqueRow = {
  ts_utc: string;
  m1_ra_ast_deg?: number | string | null;
  m1_dec_ast_deg?: number | string | null;
  m2_ra_app_deg?: number | string | null;
  m2_dec_app_deg?: number | string | null;
  m10_illum_frac?: number | string | null;
  m20_range_km?: number | string | null;
  m20_range_rate_km_s?: number | string | null;
  m31_ecl_lon_deg?: number | string | null;
  m31_ecl_lat_deg?: number | string | null;
  m43_pab_lon_deg?: number | string | null;
  m43_pab_lat_deg?: number | string | null;
  m43_phi_deg?: number | string | null;
  s31_ecl_lon_deg?: number | string | null;
  s31_ecl_lat_deg?: number | string | null;
  created_at_utc?: string | null;
  [key: string]: unknown;
};

export type MoonMsMappingRow = {
  id?: number | string | null;
  ts_utc: string;
  m43_pab_lon_deg?: number | string | null;
  m10_illum_frac?: number | string | null;
  m31_ecl_lon_deg?: number | string | null;
  s31_ecl_lon_deg?: number | string | null;
  phase?: number | string | null;
  phase_hour?: string | null;
  [key: string]: unknown;
};

export type MoonCanoniqueResponse = {
  count: number;
  items: MoonCanoniqueRow[];
};

export type MoonMsMappingResponse = {
  count: number;
  items: MoonMsMappingRow[];
};

async function readErrorBody(response: Response) {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    return trimmed.length ? trimmed.slice(0, 400) : null;
  } catch {
    return null;
  }
}

export async function fetchMoonCanoniqueRange(start: string, end: string, signal?: AbortSignal) {
  const url = withApiBase(
    `/api/moon/canonique?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new Error(
      `Moon canonique request failed: ${response.status}${detail ? ` - ${detail}` : ''}`
    );
  }

  return (await response.json()) as MoonCanoniqueResponse;
}

export async function fetchMoonMsMappingRange(
  start?: string,
  end?: string,
  signal?: AbortSignal
) {
  const query =
    start && end
      ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      : '';
  const url = withApiBase(`/api/moon/ms_mapping${query}`);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new Error(
      `Moon ms_mapping request failed: ${response.status}${detail ? ` - ${detail}` : ''}`
    );
  }

  return (await response.json()) as MoonMsMappingResponse;
}
