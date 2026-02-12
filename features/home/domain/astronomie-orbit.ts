// Calculs d'orbite pour la card astronomie.
// Pourquoi : isoler le mapping des donnees canonique vers un angle utilisable en UI.
// Info : 0 rad correspond a l'extreme droite de l'orbite.
const DEG_TO_RAD = Math.PI / 180;

function normalizeDeg(value: number) {
  return ((value % 360) + 360) % 360;
}

export function moonLongitudeToOrbitAngleRad(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  const normalized = normalizeDeg(value);
  return normalized * DEG_TO_RAD;
}
