// Types du bilan quotidien, partagés client/serveur.
export interface DailyStats {
  date: string
  registrations: number
  registrationsTotal: number
  leads: number
  sessions: {
    title: string
    time: string
    attendances: number
    invited: number
    invitedPresent: number
    questions: number
  }[]
  topQuestions: { panel: string; content: string }[]
  invitations: { total: number; validated: number; sent: number }
}

