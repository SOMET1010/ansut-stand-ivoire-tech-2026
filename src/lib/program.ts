// Programme du stand : lu en base (table panels), modifiable par l'équipe
// depuis Espace équipe › Programme. Heure d'Abidjan = UTC.
import { db } from '@/lib/db'
import { EVENT } from '@/config/event'

export interface ProgramItem {
  id: string
  title: string
  date: string // AAAA-MM-JJ
  day: string // « Mercredi 11 novembre »
  time: string // « 11h00 – 11h30 », « Toute la journée »
  startTime: string
  endTime: string | null
  allDay: boolean
  location: string | null
  speaker: string | null
  category: string | null
  description: string | null
  hidden: boolean
  order: number
}

const pad = (n: number) => String(n).padStart(2, '0')
export const hhmm = (d: Date) => `${pad(d.getUTCHours())}h${pad(d.getUTCMinutes())}`

export function dayLabel(d: Date): string {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type PanelRow = {
  id: string; title: string; startTime: Date; endTime: Date | null; allDay: boolean; location: string | null
  speaker: string | null; category: string | null; description: string | null; hidden: boolean; order: number
}

export function toProgramItem(p: PanelRow): ProgramItem {
  return {
    id: p.id,
    title: p.title,
    date: p.startTime.toISOString().slice(0, 10),
    day: dayLabel(p.startTime),
    time: p.allDay ? 'Toute la journée' : p.endTime ? `${hhmm(p.startTime)} – ${hhmm(p.endTime)}` : hhmm(p.startTime),
    startTime: p.startTime.toISOString(),
    endTime: p.endTime?.toISOString() ?? null,
    allDay: p.allDay,
    location: p.location,
    speaker: p.speaker,
    category: p.category,
    description: p.description,
    hidden: p.hidden,
    order: p.order,
  }
}

/** Séquences triées par jour, « toute la journée » en tête, puis par heure. */
export async function getProgram(opts: { includeHidden?: boolean } = {}): Promise<ProgramItem[]> {
  const panels = await db.panel.findMany({
    where: { eventId: EVENT.id, ...(opts.includeHidden ? {} : { hidden: false }) },
    orderBy: [{ startTime: 'asc' }, { order: 'asc' }],
  })
  return panels.map(toProgramItem).sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date)
    : a.allDay !== b.allDay ? (a.allDay ? -1 : 1)
    : a.startTime.localeCompare(b.startTime) || a.order - b.order,
  )
}

/** Regroupe par jour en gardant l'ordre. */
export function groupByDay(items: ProgramItem[]): { date: string; day: string; items: ProgramItem[] }[] {
  const days: { date: string; day: string; items: ProgramItem[] }[] = []
  for (const it of items) {
    const last = days[days.length - 1]
    if (last?.date === it.date) last.items.push(it)
    else days.push({ date: it.date, day: it.day, items: [it] })
  }
  return days
}

/** Programme en texte, pour les agents IA (seule source autorisée). */
export async function programAsText(): Promise<string> {
  const items = await getProgram()
  return items
    .map((s) => `- ${s.day} · ${s.time} · ${s.location ?? 'Stand ANSUT'} : ${s.title}${s.category ? ` [${s.category}]` : ''}${s.speaker ? ` (pilote : ${s.speaker})` : ''}`)
    .join('\n')
}
