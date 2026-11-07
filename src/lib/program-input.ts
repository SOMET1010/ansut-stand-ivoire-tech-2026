import { z } from 'zod'

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure au format HH:MM')
const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null)

/** Saisie d'une séquence depuis l'éditeur de programme. */
export const ProgramInput = z
  .object({
    title: z.string().trim().min(2, 'Titre requis').max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format AAAA-MM-JJ'),
    allDay: z.boolean().default(false),
    start: time.optional().nullable(),
    end: time.optional().nullable(),
    location: opt(120),
    speaker: opt(160),
    category: opt(80),
    description: opt(1000),
    hidden: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!v.allDay && !v.start) ctx.addIssue({ code: 'custom', path: ['start'], message: 'Heure de début requise' })
    if (!v.allDay && v.start && v.end && v.end <= v.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'La fin doit suivre le début' })
  })

export function toPanelData(v: z.infer<typeof ProgramInput>) {
  const [y, m, d] = v.date.split('-').map(Number)
  const at = (t: string) => { const [h, min] = t.split(':').map(Number); return new Date(Date.UTC(y, m - 1, d, h, min)) }
  return {
    title: v.title,
    startTime: v.allDay || !v.start ? new Date(Date.UTC(y, m - 1, d, 0, 0)) : at(v.start),
    endTime: v.allDay || !v.end ? null : at(v.end),
    allDay: v.allDay,
    location: v.location,
    speaker: v.speaker,
    category: v.category,
    description: v.description,
    hidden: v.hidden,
  }
}
