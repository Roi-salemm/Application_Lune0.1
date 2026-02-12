// Utilitaires SQL pour les timestamps et conversions numeriques des tables lunaires.
// Pourquoi : partager les helpers entre les lectures canonique et ms_mapping.

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function formatLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatSqlUtc(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(
    date.getUTCSeconds(),
  )}`;
}

export function parseSqlUtc(value: string) {
  const trimmed = value.trim();
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(trimmed);
  const isIso = trimmed.includes('T');
  if (isIso && hasTimezone) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const normalized = trimmed.replace('T', ' ').replace(/Z$/, '').split('.')[0];
  const [datePart, timePart] = normalized.split(' ');
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}

export function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}
