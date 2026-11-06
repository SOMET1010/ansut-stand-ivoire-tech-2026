// Activités interactives en direct : nuage de mots, sondage, note sur 5, mur d'idées.
import { z } from 'zod'
import { db } from '@/lib/db'

export const ACTIVITY_TYPES = ['WORDCLOUD', 'POLL', 'SCALE', 'OPEN'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

/** Réponses autorisées par visiteur et par activité. */
export const MAX_RESPONSES: Record<ActivityType, number> = { WORDCLOUD: 3, POLL: 1, SCALE: 1, OPEN: 2 }

export const ActivityInput = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    prompt: z.string().trim().min(3).max(200),
    options: z.array(z.string().trim().min(1).max(80)).max(6).optional(),
  })
  .refine((a) => a.type !== 'POLL' || (a.options?.length ?? 0) >= 2, 'Un sondage demande au moins 2 choix')

/** Valide et normalise une réponse selon le type d'activité ; null si invalide. */
export function normalizeValue(type: ActivityType, raw: string, optionsCount: number): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  switch (type) {
    case 'WORDCLOUD':
      return v.length >= 2 && v.length <= 30 ? v.toLowerCase() : null
    case 'POLL': {
      const i = Number(v)
      return Number.isInteger(i) && i >= 0 && i < optionsCount ? String(i) : null
    }
    case 'SCALE': {
      const n = Number(v)
      return Number.isInteger(n) && n >= 1 && n <= 5 ? String(n) : null
    }
    case 'OPEN':
      return v.length >= 2 && v.length <= 280 ? v : null
  }
}

/** Résultats agrégés pour l'écran de projection. */
export async function activityResults(activityId: string) {
  const activity = await db.liveActivity.findUnique({ where: { id: activityId } })
  if (!activity) return null
  const responses = await db.liveResponse.findMany({ where: { activityId }, orderBy: { createdAt: 'desc' }, take: 2000 })
  const voters = new Set(responses.map((r) => r.voterId)).size
  const options: string[] = activity.options ? JSON.parse(activity.options) : []
  const type = activity.type as ActivityType

  const counts = new Map<string, number>()
  for (const r of responses) counts.set(r.value, (counts.get(r.value) ?? 0) + 1)

  let data: unknown
  if (type === 'WORDCLOUD') {
    data = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([word, count]) => ({ word, count }))
  } else if (type === 'POLL') {
    data = options.map((label, i) => ({ label, count: counts.get(String(i)) ?? 0 }))
  } else if (type === 'SCALE') {
    const dist = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), count: counts.get(String(n)) ?? 0 }))
    const total = dist.reduce((s, d) => s + d.count, 0)
    const average = total ? dist.reduce((s, d) => s + Number(d.label) * d.count, 0) / total : 0
    data = { dist, average: Math.round(average * 10) / 10 }
  } else {
    data = responses.slice(0, 60).map((r) => ({ id: r.id, text: r.value, at: r.createdAt }))
  }
  return { activity: { ...activity, options }, voters, total: responses.length, data }
}
