import sessions from '../../data/itf2026-sessions.json'

// Configuration centrale de l'événement affiché sur la plateforme.
// Stand ANSUT – Ivoire Tech Forum 2026.

export const EVENT = {
  id: 'itf-2026-ansut',
  slug: 'ivoire-tech-forum-2026-ansut',
  title: 'Stand ANSUT – Ivoire Tech Forum 2026',
  shortTitle: 'Ivoire Tech Forum 2026',
  organizer: 'ANSUT',
  organizerLong: 'Agence Nationale du Service Universel des Télécommunications-TIC',
  tagline: 'Connecter le présent, bâtir le futur du numérique',
  dates: '11 – 13 novembre 2026',
  startDate: '2026-11-11T08:00:00.000Z',
  endDate: '2026-11-13T18:00:00.000Z',
  location: 'Sofitel Hôtel Ivoire, Abidjan',
  website: 'https://www.ansut.ci',
  // Liens réseaux sociaux : À DÉFINIR (comptes officiels à confirmer par l'ANSUT)
} as const

export type ProgramType = 'ceremony' | 'conference' | 'workshop' | 'networking' | 'break'

// Séquence issue de la matrice « Invitations et présence ANSUT ITF 2026 » (data/).
export interface StandSession {
  id: string
  date: string // JJ/MM/AAAA
  day: string
  time: string
  location: string
  title: string
  pilot: string
}
// Les partenaires invités, statuts courrier et validations DG restent dans
// data/private/ (non versionné, repo public).

export const STAND_SESSIONS: StandSession[] = sessions as StandSession[]

export function sessionType(title: string): ProgramType {
  const t = title.toLowerCase()
  if (t.startsWith('keynote') || t.startsWith('lancement')) return 'ceremony'
  if (t.startsWith('pitch') || t.startsWith('plateau')) return 'workshop'
  if (t.includes('networking') || t.startsWith('afterwork')) return 'networking'
  return 'conference'
}

export const PROGRAM_DAYS = Array.from(new Set(STAND_SESSIONS.map((s) => s.day)))
