// Calculs astrologiques tropicaux (sans reseau) pour la carte lune.
// Pourquoi : deriver le signe lunaire et les bornes temporelles a partir des tables locales.
import { initMoonDb } from '@/features/moon/moon-db';
import { formatSqlUtc, parseSqlUtc, toNumber } from '@/features/moon/data/moon-sql-utils';
import type { MoonCard1Tropical } from '@/features/home/ui/moon-card-1-tropical';

type PhaseInfo = {
  phase_key: string;
  phase_change_ts_utc: string | null;
  illum_frac_noon: number | null;
  moon_lon_noon: number;
};

type CanoniquePoint = {
  ts_utc: Date;
  moon_lon: number;
  illum_frac: number | null;
  source: 'canonique_data';
};

const MINUTE_MS = 60_000;
const STEP_MINUTES = 10;
const MAX_SIGN_SCAN_STEPS = 1000;

const moonCardCache = new Map<string, MoonCard1Tropical>();
const phaseInfoCache = new Map<string, PhaseInfo>();
const point10mCache = new Map<string, CanoniquePoint | null>();

const SIGN_NAMES_FR = [
  'Bélier',
  'Taureau',
  'Gémeaux',
  'Cancer',
  'Lion',
  'Vierge',
  'Balance',
  'Scorpion',
  'Sagittaire',
  'Capricorne',
  'Verseau',
  'Poissons',
] as const;

const SIGN_NAMES_EN = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

function formatIsoUtc(date: Date) {
  const iso = date.toISOString();
  return iso.endsWith('.000Z') ? iso.replace('.000Z', 'Z') : iso;
}

function safeNumber(value: number | string | null | undefined) {
  const numeric = toNumber(value);
  return numeric === null ? Number.NaN : numeric;
}

function formatDayKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDeg(deg: number): number {
  if (!Number.isFinite(deg)) {
    return Number.NaN;
  }
  return ((deg % 360) + 360) % 360;
}

export function deltaDegSigned(fromDeg: number, toDeg: number): number {
  if (!Number.isFinite(fromDeg) || !Number.isFinite(toDeg)) {
    return Number.NaN;
  }
  const diff = ((toDeg - fromDeg + 540) % 360) - 180;
  return diff === -180 ? 180 : diff;
}

export function degToDMS(deg: number): string {
  if (!Number.isFinite(deg)) {
    return '...';
  }
  const positive = Math.max(0, deg);
  let degrees = Math.floor(positive);
  const fractional = positive - degrees;
  let totalSeconds = Math.round(fractional * 3600);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;

  if (minutes >= 60) {
    degrees += 1;
    minutes = 0;
    seconds = 0;
  }

  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');
  return `${degrees}°${minStr}'${secStr}"`;
}

export function tropicalSignIndexFromLon(lonDeg: number): number {
  return Math.floor(normalizeDeg(lonDeg) / 30);
}

export function tropicalSignMeta(index: number): { fr: string; en: string; startDeg: number; endDeg: number } {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.min(11, Math.floor(index))) : 0;
  const startDeg = safeIndex * 30;
  const endDeg = startDeg + 30;
  return {
    fr: SIGN_NAMES_FR[safeIndex] ?? '...',
    en: SIGN_NAMES_EN[safeIndex] ?? '...',
    startDeg,
    endDeg,
  };
}

export function degInSignFromLon(lonDeg: number): number {
  const index = tropicalSignIndexFromLon(lonDeg);
  const meta = tropicalSignMeta(index);
  return normalizeDeg(lonDeg) - meta.startDeg;
}

function buildPhaseChangeIso(day: Date, phaseHour: string | null | undefined) {
  if (!phaseHour) {
    return null;
  }
  const trimmed = phaseHour.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? formatIsoUtc(parsed) : null;
  }
  if (trimmed.includes('-')) {
    const parsed = parseSqlUtc(trimmed);
    return parsed ? formatIsoUtc(parsed) : null;
  }
  const [hhRaw, mmRaw] = trimmed.split(':');
  const hours = Number(hhRaw);
  const minutes = Number(mmRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  const dayIso = formatDayKey(day);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${dayIso}T${hh}:${mm}:00Z`;
}

export async function getPhaseInfoFromMsMapping(tsUtc: Date): Promise<{
  phase_key: string;
  phase_change_ts_utc: string | null;
  illum_frac_noon: number | null;
  moon_lon_noon: number;
}> {
  const dayKey = formatDayKey(tsUtc);
  const cached = phaseInfoCache.get(dayKey);
  if (cached) {
    return cached;
  }

  const dayStart = startOfUtcDay(tsUtc);
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const db = await initMoonDb();
  const row = await db.getFirstAsync<{
    ts_utc: string;
    phase?: number | string | null;
    phase_hour?: string | null;
    m10_illum_frac?: number | string | null;
    m31_ecl_lon_deg?: number | string | null;
  }>(
    `SELECT ts_utc, phase, phase_hour, m10_illum_frac, m31_ecl_lon_deg
     FROM ms_mapping
     WHERE ts_utc >= ? AND ts_utc < ?
     ORDER BY ts_utc ASC
     LIMIT 1`,
    [formatSqlUtc(dayStart), formatSqlUtc(dayEnd)]
  );
  const fallbackRow =
    row?.ts_utc
      ? row
      : await db.getFirstAsync<{
          ts_utc: string;
          phase?: number | string | null;
          phase_hour?: string | null;
          m10_illum_frac?: number | string | null;
          m31_ecl_lon_deg?: number | string | null;
        }>(
          `SELECT ts_utc, phase, phase_hour, m10_illum_frac, m31_ecl_lon_deg
           FROM ms_mapping
           WHERE ts_utc LIKE ?
           ORDER BY ts_utc ASC
           LIMIT 1`,
          [`${dayKey}%`]
        );

  const phaseKey =
    fallbackRow?.phase !== null && fallbackRow?.phase !== undefined && fallbackRow?.phase !== ''
      ? String(fallbackRow.phase)
      : '...';

  const phaseChangeIso = buildPhaseChangeIso(dayStart, fallbackRow?.phase_hour ?? null);
  const illumNoon = toNumber(fallbackRow?.m10_illum_frac);
  const moonLonNoon = safeNumber(fallbackRow?.m31_ecl_lon_deg);

  const result: PhaseInfo = {
    phase_key: phaseKey,
    phase_change_ts_utc: phaseChangeIso,
    illum_frac_noon: illumNoon,
    moon_lon_noon: moonLonNoon,
  };

  phaseInfoCache.set(dayKey, result);
  return result;
}

async function fetchCanoniquePointAt(tsUtc: Date): Promise<CanoniquePoint | null> {
  const key = formatSqlUtc(tsUtc);
  const cached = point10mCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const db = await initMoonDb();
  const row = await db.getFirstAsync<{
    ts_utc: string;
    m31_ecl_lon_deg?: number | string | null;
    m10_illum_frac?: number | string | null;
  }>(
    `SELECT ts_utc, m31_ecl_lon_deg, m10_illum_frac
     FROM canonique_data
     WHERE ts_utc = ?
     LIMIT 1`,
    [key]
  );

  if (!row?.ts_utc) {
    point10mCache.set(key, null);
    return null;
  }

  const asOf = parseSqlUtc(row.ts_utc);
  const moonLon = safeNumber(row.m31_ecl_lon_deg);
  if (!asOf || !Number.isFinite(moonLon)) {
    point10mCache.set(key, null);
    return null;
  }

  const point: CanoniquePoint = {
    ts_utc: asOf,
    moon_lon: moonLon,
    illum_frac: toNumber(row.m10_illum_frac),
    source: 'canonique_data',
  };
  point10mCache.set(key, point);
  return point;
}

export async function getBestPoint10m(tsUtc: Date): Promise<{
  ts_utc: Date;
  moon_lon: number;
  illum_frac: number | null;
  source: 'canonique_data';
} | null> {
  const key = formatSqlUtc(tsUtc);
  const cached = point10mCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const db = await initMoonDb();
  let row = await db.getFirstAsync<{
    ts_utc: string;
    m31_ecl_lon_deg?: number | string | null;
    m10_illum_frac?: number | string | null;
  }>(
    `SELECT ts_utc, m31_ecl_lon_deg, m10_illum_frac
     FROM canonique_data
     WHERE ts_utc <= ?
     ORDER BY ts_utc DESC
     LIMIT 1`,
    [key]
  );

  if (!row?.ts_utc) {
    row = await db.getFirstAsync(
      `SELECT ts_utc, m31_ecl_lon_deg, m10_illum_frac
       FROM canonique_data
       WHERE ts_utc >= ?
       ORDER BY ts_utc ASC
       LIMIT 1`,
      [key]
    );
  }

  if (!row?.ts_utc) {
    point10mCache.set(key, null);
    return null;
  }

  const asOf = parseSqlUtc(row.ts_utc);
  const moonLon = safeNumber(row.m31_ecl_lon_deg);
  if (!asOf || !Number.isFinite(moonLon)) {
    point10mCache.set(key, null);
    return null;
  }

  const point: CanoniquePoint = {
    ts_utc: asOf,
    moon_lon: moonLon,
    illum_frac: toNumber(row.m10_illum_frac),
    source: 'canonique_data',
  };

  point10mCache.set(key, point);
  return point;
}

export async function ensureRemote10mDataCached(_fromUtc: Date, _toUtc: Date): Promise<void> {
  return;
}

function interpolateBoundary(params: {
  t0: Date;
  lon0: number;
  t1: Date;
  lon1: number;
  boundaryDeg: number;
}) {
  const lon0n = normalizeDeg(params.lon0);
  const lon1n = normalizeDeg(params.lon1);
  const lon1u = lon0n + deltaDegSigned(lon0n, lon1n);
  const boundaryN = normalizeDeg(params.boundaryDeg);
  const boundaryU = lon0n + deltaDegSigned(lon0n, boundaryN);
  const denom = lon1u - lon0n;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) {
    return null;
  }
  const ratio = (boundaryU - lon0n) / denom;
  const clamped = Math.max(0, Math.min(1, ratio));
  const t0ms = params.t0.getTime();
  const t1ms = params.t1.getTime();
  const crossed = t0ms + clamped * (t1ms - t0ms);
  return new Date(crossed);
}

export async function findSignIngressUtcByInterpolation(tsUtc: Date, signIndex: number): Promise<Date> {
  const startPoint = await getBestPoint10m(tsUtc);
  if (!startPoint) {
    return startOfUtcDay(tsUtc);
  }

  let current = startPoint;
  const boundaryDeg = signIndex * 30;

  for (let step = 0; step < MAX_SIGN_SCAN_STEPS; step += 1) {
    const prevTime = addMinutes(current.ts_utc, -STEP_MINUTES);
    const prevPoint = await fetchCanoniquePointAt(prevTime);
    if (!prevPoint) {
      return startOfUtcDay(tsUtc);
    }

    const prevSign = tropicalSignIndexFromLon(prevPoint.moon_lon);
    if (prevSign !== signIndex) {
      const interpolated = interpolateBoundary({
        t0: prevPoint.ts_utc,
        lon0: prevPoint.moon_lon,
        t1: current.ts_utc,
        lon1: current.moon_lon,
        boundaryDeg,
      });
      return interpolated ?? prevPoint.ts_utc;
    }

    current = prevPoint;
  }

  return startOfUtcDay(tsUtc);
}

export async function findSignEgressUtcByInterpolation(tsUtc: Date, signIndex: number): Promise<Date> {
  const startPoint = await getBestPoint10m(tsUtc);
  if (!startPoint) {
    return endOfUtcDay(tsUtc);
  }

  let current = startPoint;
  const boundaryDeg = (signIndex + 1) * 30 >= 360 ? 0 : (signIndex + 1) * 30;

  for (let step = 0; step < MAX_SIGN_SCAN_STEPS; step += 1) {
    const nextTime = addMinutes(current.ts_utc, STEP_MINUTES);
    const nextPoint = await fetchCanoniquePointAt(nextTime);
    if (!nextPoint) {
      return endOfUtcDay(tsUtc);
    }

    const nextSign = tropicalSignIndexFromLon(nextPoint.moon_lon);
    if (nextSign !== signIndex) {
      const interpolated = interpolateBoundary({
        t0: current.ts_utc,
        lon0: current.moon_lon,
        t1: nextPoint.ts_utc,
        lon1: nextPoint.moon_lon,
        boundaryDeg,
      });
      return interpolated ?? nextPoint.ts_utc;
    }

    current = nextPoint;
  }

  return endOfUtcDay(tsUtc);
}

export async function buildMoonCard1Tropical(tsUtc: Date): Promise<MoonCard1Tropical> {
  const key = formatSqlUtc(tsUtc);
  const cached = moonCardCache.get(key);
  if (cached) {
    return cached;
  }

  const phaseInfo = await getPhaseInfoFromMsMapping(tsUtc);
  let point10m = await getBestPoint10m(tsUtc);
  if (!point10m) {
    await ensureRemote10mDataCached(addMinutes(tsUtc, -6 * 60), addMinutes(tsUtc, 6 * 60));
    point10m = await getBestPoint10m(tsUtc);
  }

  const lon = point10m?.moon_lon ?? phaseInfo.moon_lon_noon;
  const illum = point10m?.illum_frac ?? phaseInfo.illum_frac_noon ?? null;
  const precision: 'minute' | 'day' = point10m ? 'minute' : 'day';

  const lonNormalized = Number.isFinite(lon) ? normalizeDeg(lon) : Number.NaN;
  const signIndex = Number.isFinite(lonNormalized) ? tropicalSignIndexFromLon(lonNormalized) : Number.NaN;
  const meta = Number.isFinite(signIndex)
    ? tropicalSignMeta(signIndex)
    : { fr: '...', en: '...', startDeg: Number.NaN, endDeg: Number.NaN };
  const degInSign = Number.isFinite(lonNormalized) ? degInSignFromLon(lonNormalized) : Number.NaN;
  const dms = Number.isFinite(degInSign) ? degToDMS(degInSign) : '...';

  let ingress: Date | null = null;
  let egress: Date | null = null;

  if (Number.isFinite(signIndex) && precision === 'minute') {
    ingress = await findSignIngressUtcByInterpolation(tsUtc, signIndex);
    egress = await findSignEgressUtcByInterpolation(tsUtc, signIndex);
  } else if (Number.isFinite(signIndex)) {
    ingress = startOfUtcDay(tsUtc);
    egress = endOfUtcDay(tsUtc);
  }

  const result: MoonCard1Tropical = {
    ts_utc: formatIsoUtc(tsUtc),
    phase_key: phaseInfo.phase_key ?? '...',
    phase_change_ts_utc: phaseInfo.phase_change_ts_utc ?? null,
    illumination_frac: illum,
    sign_index: Number.isFinite(signIndex) ? signIndex : Number.NaN,
    sign_name_fr: meta.fr,
    sign_name_en: meta.en,
    lon_tropical_deg: lonNormalized,
    deg_in_sign: Number.isFinite(degInSign) ? degInSign : Number.NaN,
    deg_in_sign_dms: dms,
    sign_ingress_ts_utc: ingress ? formatIsoUtc(ingress) : '...',
    sign_egress_ts_utc: egress ? formatIsoUtc(egress) : '...',
    voc_status: 'unavailable',
    is_void_of_course: false,
    voc_start_ts_utc: null,
    voc_end_ts_utc: null,
    precision,
  };

  moonCardCache.set(key, result);
  return result;
}
