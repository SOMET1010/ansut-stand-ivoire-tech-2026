"use client"

import { ANSWER_STYLES } from './answer-style'

type Bars = { label: string; count: number }[]
export type ActivityResults = {
  activity: { type: 'WORDCLOUD' | 'POLL' | 'SCALE' | 'OPEN'; prompt: string; options: string[]; open: boolean; code: string }
  voters: number
  total: number
  data: unknown
}

const CLOUD_COLORS = ['text-itf-navy', 'text-itf-green', 'text-itf-cyan', 'text-itf-orange', 'text-itf-navy-deep']

function WordCloudView({ words }: { words: { word: string; count: number }[] }) {
  if (!words.length) return <Empty />
  const max = words[0].count
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 p-6">
      {words.map((w, i) => (
        <span
          key={w.word}
          className={`font-extrabold leading-none transition-all ${CLOUD_COLORS[i % CLOUD_COLORS.length]}`}
          style={{ fontSize: `${1 + (w.count / max) * 3.5}rem` }}
          title={`${w.count} fois`}
        >
          {w.word}
        </span>
      ))}
    </div>
  )
}

export function BarsView({ bars, colored = false }: { bars: Bars; colored?: boolean }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  const total = bars.reduce((s, b) => s + b.count, 0)
  return (
    <ul className="space-y-3">
      {bars.map((b, i) => (
        <li key={b.label + i}>
          <div className="mb-1 flex justify-between text-lg font-semibold text-itf-navy">
            <span>{colored && <span aria-hidden className="mr-2">{ANSWER_STYLES[i]?.shape}</span>}{b.label}</span>
            <span>{b.count} · {total ? Math.round((b.count / total) * 100) : 0} %</span>
          </div>
          <div className="h-8 rounded-full bg-itf-sky">
            <div className={`h-8 rounded-full transition-all duration-500 ${colored ? ANSWER_STYLES[i]?.bg : 'bg-itf-cyan'}`} style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Empty() {
  return <p className="py-16 text-center text-xl text-muted-foreground">En attente des premières réponses…</p>
}

// Affichage des résultats d'une activité (écran de projection et tableau de bord).
export function ResultsView({ results }: { results: ActivityResults }) {
  const { type } = results.activity
  if (type === 'WORDCLOUD') return <WordCloudView words={results.data as { word: string; count: number }[]} />
  if (type === 'POLL') return <BarsView bars={results.data as Bars} colored />
  if (type === 'SCALE') {
    const d = results.data as { dist: Bars; average: number }
    return (
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="text-center">
          <p className="text-8xl font-extrabold text-itf-navy">{d.average || '–'}</p>
          <p className="text-itf-orange" aria-label={`Moyenne ${d.average} sur 5`}>{'★'.repeat(Math.round(d.average))}{'☆'.repeat(5 - Math.round(d.average))}</p>
          <p className="text-sm text-muted-foreground">moyenne sur 5</p>
        </div>
        <BarsView bars={d.dist} />
      </div>
    )
  }
  const wall = results.data as { id: string; text: string }[]
  if (!wall.length) return <Empty />
  return (
    <div className="columns-1 gap-4 md:columns-3">
      {wall.map((m, i) => (
        <p key={m.id} className={`mb-4 break-inside-avoid rounded-2xl p-4 text-lg text-white ${ANSWER_STYLES[i % 4].bg}`}>{m.text}</p>
      ))}
    </div>
  )
}
