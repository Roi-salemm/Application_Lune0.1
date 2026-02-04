// Acces SQLite aux evenements de phase (nouvelle lune, quartiers, pleine lune).
// Pourquoi : determiner la fenetre de nouvelles lunes autour d'une date.

import { initMoonDb } from '@/features/moon/moon-db';
import { formatSqlUtc, parseSqlUtc, toNumber } from '@/features/moon/data/moon-sql-utils';

type MoonPhaseEventRow = {
  ts_utc?: string | null;
  display_at_utc?: string | null;
  event_type?: string | null;
  phase_name?: string | null;
  phase_deg?: number | string | null;
};

export type MoonPhaseEventSnapshot = {
  asOf: Date;
  phaseDeg: number | null;
  phaseName: string | null;
  eventType: string | null;
};

export type NewMoonWindow = {
  previous: MoonPhaseEventSnapshot | null;
  next: MoonPhaseEventSnapshot | null;
};

function isLikelyNewMoon(row: MoonPhaseEventRow) {
  const name = row.phase_name?.toLowerCase() ?? '';
  const type = row.event_type?.toLowerCase() ?? '';
  if (name.includes('new') || name.includes('nouvelle')) {
    return true;
  }
  if (type.includes('new') || type.includes('nouvelle')) {
    return true;
  }
  const deg = toNumber(row.phase_deg);
  return deg !== null && (deg <= 1 || deg >= 359);
}

function toSnapshot(row: MoonPhaseEventRow) {
  if (!row.ts_utc) {
    return null;
  }
  const eventDate = parseSqlUtc(row.display_at_utc ?? row.ts_utc);
  if (!eventDate) {
    return null;
  }
  return {
    asOf: eventDate,
    phaseDeg: toNumber(row.phase_deg),
    phaseName: row.phase_name ?? null,
    eventType: row.event_type ?? null,
  } satisfies MoonPhaseEventSnapshot;
}

async function fetchNewMoonCandidate(
  targetUtc: string,
  comparator: '<=' | '>=',
  order: 'ASC' | 'DESC'
) {
  const db = await initMoonDb();
  const rows = await db.getAllAsync<MoonPhaseEventRow>(
    `SELECT ts_utc, display_at_utc, event_type, phase_name, phase_deg
     FROM moon_phase_event
     WHERE ts_utc ${comparator} ?
     ORDER BY ts_utc ${order}
     LIMIT 48`,
    [targetUtc],
  );

  const next = rows.find(isLikelyNewMoon);
  if (!next?.ts_utc) {
    return null;
  }
  return toSnapshot(next);
}

export async function fetchNewMoonWindow(targetDate: Date): Promise<NewMoonWindow> {
  const targetUtc = formatSqlUtc(targetDate);
  const [previous, next] = await Promise.all([
    fetchNewMoonCandidate(targetUtc, '<=', 'DESC'),
    fetchNewMoonCandidate(targetUtc, '>=', 'ASC'),
  ]);

  return {
    previous,
    next,
  };
}

export async function fetchNextNewMoonEvent(targetDate: Date) {
  const { next } = await fetchNewMoonWindow(targetDate);
  return next;
}
