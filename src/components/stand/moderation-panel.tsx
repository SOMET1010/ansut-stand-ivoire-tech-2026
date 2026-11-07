"use client"

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { api, type PanelRow } from './use-stand'

interface Result {
  usedAI: boolean
  total: number
  themes: { theme: string; questionIds: string[]; synthesis: string }[]
  recommended: string[]
  flagged: { questionId: string; reason: string }[]
  questions: { id: string; content: string; authorName: string }[]
}

// Agent (d) : regroupement et priorisation des questions du public.
export function ModerationPanel({ panels }: { panels: PanelRow[] }) {
  // Par défaut : la séquence qui a reçu le plus de questions
  const busiest = [...panels].sort((a, b) => b._count.questions - a._count.questions)[0]
  const [panelId, setPanelId] = useState(busiest?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const run = async () => {
    setBusy(true)
    try {
      setResult(await api<Result>('/api/agents/moderation', { method: 'POST', body: JSON.stringify({ panelId }) }))
    } catch (e) {
      toast({ title: 'Modération impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }
  const text = (id: string) => result?.questions.find((q) => q.id === id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={panelId} onChange={(e) => { setPanelId(e.target.value); setResult(null) }} className="h-9 rounded-md border px-3 text-sm" aria-label="Séquence">
          {panels.map((p) => <option key={p.id} value={p.id}>{p.title} ({p._count.questions} questions)</option>)}
        </select>
        <Button onClick={run} disabled={busy || !panelId} className="bg-itf-navy hover:bg-itf-navy-deep">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Analyser les questions
        </Button>
      </div>
      {result && result.total === 0 && <p className="text-sm text-muted-foreground">Aucune question pour cette séquence.</p>}
      {result && result.total > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border bg-white p-4">
            <h3 className="font-bold text-itf-navy">À poser en priorité</h3>
            {!result.usedAI && <p className="text-xs text-muted-foreground">Mode sans IA : tri par votes.</p>}
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
              {result.recommended.map((id) => <li key={id}>{text(id)?.content} <span className="text-muted-foreground">— {text(id)?.authorName}</span></li>)}
            </ol>
            {result.flagged.length > 0 && (
              <>
                <h4 className="mt-4 font-semibold text-destructive">Signalées</h4>
                <ul className="mt-1 space-y-1 text-sm">{result.flagged.map((f) => <li key={f.questionId}>{text(f.questionId)?.content} <Badge variant="outline">{f.reason}</Badge></li>)}</ul>
              </>
            )}
          </section>
          <section className="rounded-2xl border bg-white p-4">
            <h3 className="font-bold text-itf-navy">Thèmes ({result.total} questions)</h3>
            {result.themes.length === 0 && <p className="text-sm text-muted-foreground">Regroupement disponible avec l’IA activée.</p>}
            <ul className="mt-2 space-y-3 text-sm">
              {result.themes.map((t) => (
                <li key={t.theme}><Badge className="border-0 bg-itf-sky text-itf-navy">{t.theme} · {t.questionIds.length}</Badge><p className="mt-1">{t.synthesis}</p></li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
