"use client"

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ANSWER_STYLES, ACTIVITY_LABELS } from './answer-style'
import { usePoll, voterId } from './use-poll'

interface ActivityState {
  type: keyof typeof ACTIVITY_LABELS
  prompt: string
  options: string[]
  open: boolean
  remaining: number
}

// Vue visiteur d'une activité : nuage de mots, sondage, note ou mur d'idées.
export function ActivityPlayer({ code }: { code: string }) {
  const voter = useMemo(() => voterId(), [])
  const { data, refresh } = usePoll<ActivityState>(`/api/live/play/${code}?voterId=${voter}`, 4000)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = async (value: string) => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/live/play/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'respond', voterId: voter, value }) })
    const json = await res.json()
    if (!res.ok) setError(json.error)
    else setText('')
    await refresh()
    setBusy(false)
  }

  if (!data) return <Loader2 className="mx-auto h-10 w-10 animate-spin text-itf-cyan" />

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-itf-orange">{ACTIVITY_LABELS[data.type]}</p>
      <h1 className="mb-5 mt-1 text-2xl font-extrabold text-itf-navy">{data.prompt}</h1>

      {!data.open && <p className="rounded-2xl bg-muted p-4 text-center">Les réponses sont fermées. Regardez l’écran !</p>}

      {data.open && data.remaining === 0 && (
        <div className="rounded-2xl bg-itf-sky p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-itf-green" />
          <p className="mt-2 font-bold text-itf-navy">Merci pour votre participation !</p>
        </div>
      )}

      {data.open && data.remaining > 0 && (
        <>
          {data.type === 'POLL' && (
            <div className="grid gap-3">
              {data.options.map((opt, i) => (
                <button key={i} disabled={busy} onClick={() => send(String(i))} className={`flex items-center gap-3 rounded-2xl p-4 text-left font-semibold text-white active:scale-95 ${ANSWER_STYLES[i % 4].bg}`}>
                  <span aria-hidden>{ANSWER_STYLES[i % 4].shape}</span>{opt}
                </button>
              ))}
            </div>
          )}
          {data.type === 'SCALE' && (
            <div className="flex justify-center gap-2" role="group" aria-label="Note de 1 à 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} disabled={busy} onClick={() => send(String(n))} aria-label={`${n} sur 5`} className="rounded-xl p-2 text-itf-orange hover:bg-itf-sky active:scale-90">
                  <Star className="h-10 w-10" fill="currentColor" />
                  <span className="block text-sm font-bold text-itf-navy">{n}</span>
                </button>
              ))}
            </div>
          )}
          {(data.type === 'WORDCLOUD' || data.type === 'OPEN') && (
            <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="space-y-3">
              {data.type === 'WORDCLOUD'
                ? <Input autoFocus maxLength={30} value={text} onChange={(e) => setText(e.target.value)} placeholder="Un mot ou une courte expression" className="h-12 text-lg" />
                : <Textarea autoFocus maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre idée…" rows={4} />}
              <Button type="submit" size="lg" disabled={busy || text.trim().length < 2} className="w-full bg-itf-navy hover:bg-itf-navy-deep">Envoyer</Button>
              {data.remaining > 1 && <p className="text-center text-xs text-muted-foreground">Encore {data.remaining} réponse(s) possible(s)</p>}
            </form>
          )}
        </>
      )}
      {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
    </div>
  )
}
