// Date helpers used by calendar UI and hooks.
export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getStartOffset(year: number, month: number) {
  const sundayBased = new Date(year, month, 1).getDay();
  return (sundayBased + 6) % 7;
}

export function formatKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplay(date: Date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getWeekStart(date: Date) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

export function formatTimeValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimeLabel(timeValue: string) {
  const [hours = '00', minutes = '00'] = timeValue.split(':');
  return `${hours.padStart(2, '0')}H${minutes.padStart(2, '0')}`;
}

export function parseTimeValue(timeValue: string) {
  const [hours = '0', minutes = '0'] = timeValue.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

export function applyTimeToDate(date: Date, timeValue: string) {
  const [hours = '0', minutes = '0'] = timeValue.split(':');
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return next;
}
