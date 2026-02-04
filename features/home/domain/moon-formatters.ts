// Formatage des donnees lunaires pour la home.
// Pourquoi : isoler les regles de presentation afin de les reutiliser et tester facilement.
// Info : les libelles de jour/mois reutilisent ceux du calendrier pour coherence visuelle.

import { formatDisplay, formatTimeValue } from '@/features/calendar/domain/CalendarDateUtils';
import { MONTHS, WEEKDAY_LONG } from '@/features/calendar/ui/CalendarConstants';

// Transforme l'age lunaire (jours) en libelle "X eme / Lune" pour la pastille gauche.
export function formatLunarDay(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const dayNumber = Math.max(0, Math.round(numeric));
  return {
    top: `${dayNumber} eme`,
    bottom: 'Lune',
  };
}

// Formate le pourcentage d'illumination en texte court (ex: "73%" ou "73.5%").
export function formatPercentage(value: number | string | undefined | null) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const fixed = numeric.toFixed(1);
  const trimmed = fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  return `${trimmed}%`;
}

// Construit le libelle de date sans l'heure (ex: "Mercredi 14 Janvier").
export function formatAsOfLabel(date: Date | null | undefined) {
  if (!date) {
    return undefined;
  }

  const weekdayIndex = (date.getDay() + 6) % 7;
  const weekday = WEEKDAY_LONG[weekdayIndex];
  const month = MONTHS[date.getMonth()];
  if (!weekday || !month) {
    return undefined;
  }

  const day = date.getDate();
  return `${weekday} ${day} ${month}`;
}

// Formate l'age de la lunaison en jours (ex: "18,2j").
export function formatAgeDaysLabel(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  const fixed = numeric.toFixed(1).replace('.', ',');
  return `${fixed}j`;
}

// Calcule l'age de la lunaison (jours) a partir de axis_a_deg et des nouvelles lunes encadrantes.
// Pourquoi : s'appuyer sur un angle 0-360 degres pour parcourir la lunaison complete.
export function computeAgeDaysFromAxisDeg(params: {
  axisADeg?: number | string | null;
  previousNewMoon?: Date | null;
  nextNewMoon?: Date | null;
}) {
  const axisRaw = params.axisADeg;
  const axisNumeric = typeof axisRaw === 'string' ? Number(axisRaw) : axisRaw;
  if (!Number.isFinite(axisNumeric as number)) {
    return null;
  }

  const previous = params.previousNewMoon;
  const next = params.nextNewMoon;
  if (!previous || !next) {
    return null;
  }

  const cycleMs = next.getTime() - previous.getTime();
  if (!Number.isFinite(cycleMs) || cycleMs <= 0) {
    return null;
  }

  const normalized = (((axisNumeric as number) % 360) + 360) % 360;
  const cycleDays = cycleMs / (1000 * 60 * 60 * 24);
  return (normalized / 360) * cycleDays;
}

// Formate la distance Terre-Lune en kilometres avec separateur d'espace.
export function formatDistanceKmLabel(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  const fixed = numeric.toFixed(3);
  const [intPart, fracPart] = fixed.split('.');
  const spaced = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimals = fracPart ? `,${fracPart}` : '';
  return `${spaced}${decimals} Km`;
}

// Formate la date de prochaine nouvelle lune en local (ex: "14/01/2026 15h00").
export function formatNextNewMoonDateLabel(date: Date | null | undefined) {
  if (!date) {
    return undefined;
  }
  const timeValue = formatTimeValue(date);
  const [hours = '00', minutes = '00'] = timeValue.split(':');
  return `${formatDisplay(date)} ${hours}h${minutes}`;
}

// Formate un delai (en jours) avant le prochain cycle (ex: "7,55j").
export function formatRemainingDaysLabel(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const fixed = value.toFixed(2).replace('.', ',');
  return `${fixed}j`;
}

// Determine la phase lunaire en texte parmi les 8 libelles attendus.
// Pourquoi : fournir un titre court et lisible pour le hero.
// Rafraichissement : ce libelle est recalculé par use-home-moon (lecture SQLite + interval parametre).
export function formatMoonPhaseLabel(params: {
  illuminationPct?: number | string | null;
  phaseDeg?: number | string | null;
  ageDays?: number | string | null;
}) {
  const pctRaw = params.illuminationPct;
  const pctNumeric = typeof pctRaw === 'string' ? Number(pctRaw) : pctRaw;
  const pct = Number.isFinite(pctNumeric as number) ? Math.max(0, Math.min(100, pctNumeric as number)) : null;

  const phaseRaw = params.phaseDeg;
  const phaseNumeric = typeof phaseRaw === 'string' ? Number(phaseRaw) : phaseRaw;
  const phaseDeg = Number.isFinite(phaseNumeric as number)
    ? ((phaseNumeric as number) % 360 + 360) % 360
    : null;

  const ageRaw = params.ageDays;
  const ageNumeric = typeof ageRaw === 'string' ? Number(ageRaw) : ageRaw;
  const ageDays = Number.isFinite(ageNumeric as number) ? (ageNumeric as number) : null;

  if (pct === null) {
    return undefined;
  }

  const waxingByPhase = phaseDeg !== null ? phaseDeg < 180 : null;
  const waxingByAge = ageDays !== null ? ageDays < 14.77 : null;
  const waxing = waxingByPhase ?? waxingByAge ?? pct <= 50;

  if (pct <= 1) {
    return 'Nouvelle Lune';
  }
  if (pct >= 99) {
    return 'Pleine Lune';
  }
  if (pct >= 45 && pct <= 55) {
    return waxing ? 'Premier quartier' : 'Dernier quartier';
  }
  if (pct < 50) {
    return waxing ? 'Premier croissant' : 'Dernier croissant';
  }
  return waxing ? 'Gibbeuse croissante' : 'Gibbeuse décroissante';
}
