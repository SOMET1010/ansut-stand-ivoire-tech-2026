// Couleurs et formes des réponses (charte ITF 2026), accessibles sans la couleur seule.
export const ANSWER_STYLES = [
  { bg: 'bg-itf-navy', shape: '▲', label: 'Triangle' },
  { bg: 'bg-itf-green', shape: '◆', label: 'Losange' },
  { bg: 'bg-itf-cyan', shape: '●', label: 'Rond' },
  { bg: 'bg-itf-orange', shape: '■', label: 'Carré' },
] as const

export const ACTIVITY_LABELS = {
  WORDCLOUD: 'Nuage de mots',
  POLL: 'Sondage',
  SCALE: 'Note sur 5',
  OPEN: 'Mur d’idées',
} as const
