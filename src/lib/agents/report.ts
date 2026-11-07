// Agent (e) : bilan quotidien du stand pour le DG.
import { db } from '@/lib/db'
import { generateText, logAgentRun, withAI } from '@/lib/ai'
import { EVENT } from '@/config/event'

import type { DailyStats } from './report-types'
export type { DailyStats }

/** Chiffres réels de la journée (base de données), sans IA. */
export async function collectDailyStats(date: string): Promise<DailyStats> {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(start.getTime() + 24 * 3600 * 1000)
  const inDay = { gte: start, lt: end }

  const [registrations, registrationsTotal, leads, panels, allInvitations] = await Promise.all([
    db.eventRegistration.count({ where: { eventId: EVENT.id, createdAt: inDay } }),
    db.eventRegistration.count({ where: { eventId: EVENT.id } }),
    db.lead.count({ where: { createdAt: inDay } }),
    db.panel.findMany({
      where: { eventId: EVENT.id, startTime: inDay },
      orderBy: [{ startTime: 'asc' }, { order: 'asc' }],
      include: {
        attendances: true,
        invitations: true,
        questions: { include: { votes: true } },
      },
    }),
    db.invitation.findMany({ where: { panel: { eventId: EVENT.id } } }),
  ])

  const topQuestions = panels
    .flatMap((p) => p.questions.map((q) => ({ panel: p.title, content: q.content, score: q.votes.filter((v) => v.type === 'UP').length })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ panel, content }) => ({ panel, content }))

  return {
    date,
    registrations,
    registrationsTotal,
    leads,
    sessions: panels.map((p) => ({
      title: p.title,
      time: p.allDay ? 'toute la journée' : p.startTime.toISOString().slice(11, 16).replace(':', 'h'),
      attendances: p.attendances.length,
      invited: p.invitations.length,
      invitedPresent: p.invitations.filter((i) => i.attended).length,
      questions: p.questions.length,
    })),
    topQuestions,
    invitations: {
      total: allInvitations.length,
      validated: allInvitations.filter((i) => i.dgValidation === 'VALIDE').length,
      sent: allInvitations.filter((i) => i.letterStatus === 'ENVOYE').length,
    },
  }
}

const SYSTEM = `Tu rédiges la note de bilan quotidien du stand ANSUT (Ivoire Tech Forum 2026) destinée au Directeur Général.
Format : 3 sections courtes — « Faits marquants », « Points d'attention », « Recommandations pour demain ». Puces, français sobre, 200 mots maximum.
Appuie-toi uniquement sur les chiffres fournis ; n'en invente aucun. Si une donnée vaut 0, signale-le comme point d'attention plutôt que de l'interpréter.`

export async function dailyReport(date: string) {
  const stats = await collectDailyStats(date)
  const { value: summary, usedAI, aiError } = await withAI<string | null>(
    () => generateText({ system: SYSTEM, prompt: JSON.stringify(stats, null, 2), effort: 'medium' }),
    () => null,
  )
  await logAgentRun('bilan', usedAI, { date }, { stats, summary })
  return { stats, summary, usedAI, aiError }
}
