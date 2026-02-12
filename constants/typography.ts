// Regles typographiques globales pour l'application.
// Pourquoi : centraliser tailles, interlignes et styles pour une coherence d'ensemble.
export const TYPO = {
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  superTitre: {
    fontSize: 25,
    lineHeight: 40,
    fontWeight: '600',
  },
  baseline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  texte: {
    fontSize: 15.5,
    lineHeight: 24,
    fontWeight: '400',
  },
  petitTexte: {
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '400',
  },
  citation: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  calendarDay: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
  },
  calendarInfo: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '400',
  },
  calendarInfoTight: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '400',
  },
} as const;

export type TypoVariant = keyof typeof TYPO;
