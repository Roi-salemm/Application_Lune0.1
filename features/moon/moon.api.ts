// API lune : appels HTTP aux endpoints lunaires et typage des reponses.
// Pourquoi : isoler les contrats reseau et centraliser les formats.
import { withApiBase } from '@/lib/api';

export type MoonPhaseResponse = {
  phaseLabel: string;
  percentage?: number | string;
  asOf?: string;
};

export type MoonEphemerisRow = {
  ts_utc: string;
  phase_deg?: number | string | null;
  illum_pct?: number | string | null;
  age_days?: number | string | null;
  diam_km?: number | string | null;
  dist_km?: number | string | null;
  ra_hours?: number | string | null;
  dec_deg?: number | string | null;
  slon_deg?: number | string | null;
  slat_deg?: number | string | null;
  sub_obs_lon_deg?: number | string | null;
  sub_obs_lat_deg?: number | string | null;
  elon_deg?: number | string | null;
  elat_deg?: number | string | null;
  axis_a_deg?: number | string | null;
  delta_au?: number | string | null;
  deldot_km_s?: number | string | null;
  sun_elong_deg?: number | string | null;
  sun_target_obs_deg?: number | string | null;
  sun_ra_hours?: number | string | null;
  sun_dec_deg?: number | string | null;
  sun_ecl_lon_deg?: number | string | null;
  sun_ecl_lat_deg?: number | string | null;
  sun_dist_au?: number | string | null;
  sun_trail?: string | null;
  constellation?: string | null;
  delta_t_sec?: number | string | null;
  dut1_sec?: number | string | null;
  pressure_hpa?: number | string | null;
  temperature_c?: number | string | null;
};

export type MoonPhaseEventRow = {
  ts_utc?: string;
  display_at_utc?: string | null;
  event_type?: string | null;
  phase_name?: string | null;
  phase_deg?: number | string | null;
  illum_pct?: number | string | null;
  precision_sec?: number | string | null;
  source?: string | null;
  [key: string]: unknown;
};

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

export type MoonEphemerisResponse = {
  count: number;
  items: MoonEphemerisRow[];
};

export type MoonCanoniqueResponse = {
  count: number;
  items: MoonCanoniqueRow[];
};

export type MoonPhaseEventsResponse = {
  range: {
    start_utc: string;
    end_utc: string;
  };
  phase_event_count: number;
  phase_events: MoonPhaseEventRow[];
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

export async function fetchCurrentMoonPhase(signal?: AbortSignal) {
  const response = await fetch(withApiBase('/api/moon/phase/current'), { signal });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new Error(
      `Moon phase request failed: ${response.status}${detail ? ` - ${detail}` : ''}`
    );
  }

  return (await response.json()) as MoonPhaseResponse;
}

export async function fetchMoonEphemerisRange(start: string, end: string, signal?: AbortSignal) {
  const url = withApiBase(
    `/api/moon/ephemeris?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new Error(
      `Moon ephemeris request failed: ${response.status}${detail ? ` - ${detail}` : ''}`
    );
  }

  return (await response.json()) as MoonEphemerisResponse;
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

export async function fetchMoonPhaseEventsRange(
  start: string,
  end: string,
  signal?: AbortSignal
) {
  const url = withApiBase(
    `/api/moon/phase-events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new Error(
      `Moon phase events request failed: ${response.status}${detail ? ` - ${detail}` : ''}`
    );
  }

  return (await response.json()) as MoonPhaseEventsResponse;
}
