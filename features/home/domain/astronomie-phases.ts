// Mapping des libelles de phase vers un index de position.
// Pourquoi : aligner les pictos et le point dore avec la phase affichée dans le hero.
// Info : les libelles sont normalises en minuscules sans accents.
const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function phaseLabelToIndex(label?: string | null): number | null {
  if (!label) {
    return null;
  }
  const text = normalizeLabel(label);
  if (text.includes('nouvelle')) {
    return 0;
  }
  if (text.includes('premier croissant')) {
    return 1;
  }
  if (text.includes('premier quartier')) {
    return 2;
  }
  if (text.includes('gibbeuse croissante')) {
    return 3;
  }
  if (text.includes('pleine')) {
    return 4;
  }
  if (text.includes('gibbeuse decroissante')) {
    return 5;
  }
  if (text.includes('dernier quartier')) {
    return 6;
  }
  if (text.includes('dernier croissant')) {
    return 7;
  }
  return null;
}
