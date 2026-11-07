"use client"

import { useState } from 'react'
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { ANSWER_STYLES } from './answer-style'

interface Q { text: string; options: string[]; correctIndex: number; timeLimit: number }
const blank = (): Q => ({ text: '', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20 })

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Erreur')
  return json
}

// Création d'un quiz : saisie manuelle ou génération par l'agent IA.
export function QuizEditor({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Q[]>([blank()])
  const [theme, setTheme] = useState('')
  const [busy, setBusy] = useState<'gen' | 'save' | null>(null)

  const update = (i: number, patch: Partial<Q>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)))

  const generate = async () => {
    setBusy('gen')
    try {
      const { questions: gen } = await post<{ questions: Q[] }>('/api/live/quizzes/generate', { theme, count: 5 })
      setQuestions(gen.map((q) => ({ ...q, options: [...q.options, '', '', ''].slice(0, 4) })))
      if (!title) setTitle(`Quiz – ${theme}`)
      toast({ title: `${gen.length} questions générées : relisez-les avant d’enregistrer` })
    } catch (e) {
      toast({ title: 'Génération impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    setBusy('save')
    try {
      const clean = questions.map((q) => {
        const filled = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o)
        return { text: q.text, options: filled.map((x) => x.o), correctIndex: Math.max(0, filled.findIndex((x) => x.i === q.correctIndex)), timeLimit: q.timeLimit }
      })
      await post('/api/live/quizzes', { title, questions: clean })
      toast({ title: 'Quiz enregistré' })
      setTitle('')
      setQuestions([blank()])
      onCreated()
    } catch (e) {
      toast({ title: 'Enregistrement impossible', description: e instanceof Error ? e.message : 'Vérifiez les questions et réponses', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Thème pour l’agent IA (ex. : cybersécurité, programme du stand)" className="min-w-[14rem] flex-1" />
        <Button variant="outline" onClick={generate} disabled={busy !== null || theme.trim().length < 3}>
          {busy === 'gen' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-itf-orange" />} Générer 5 questions
        </Button>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du quiz" className="font-semibold" />
      {questions.map((q, i) => (
        <fieldset key={i} className="space-y-2 rounded-xl bg-itf-sky/40 p-3">
          <div className="flex gap-2">
            <Input value={q.text} onChange={(e) => update(i, { text: e.target.value })} placeholder={`Question ${i + 1}`} />
            <Input type="number" min={5} max={120} value={q.timeLimit} onChange={(e) => update(i, { timeLimit: Number(e.target.value) })} className="w-20" aria-label="Durée (s)" title="Durée en secondes" />
            <Button variant="ghost" size="icon" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} disabled={questions.length === 1} aria-label="Supprimer la question"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={q.correctIndex === k} onChange={() => update(i, { correctIndex: k })} aria-label={`Bonne réponse : choix ${k + 1}`} />
                <span aria-hidden className={`flex h-7 w-7 items-center justify-center rounded text-white ${ANSWER_STYLES[k].bg}`}>{ANSWER_STYLES[k].shape}</span>
                <Input value={o} onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} placeholder={k < 2 ? `Réponse ${k + 1}` : `Réponse ${k + 1} (facultatif)`} />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, blank()])}><Plus className="mr-2 h-4 w-4" /> Question</Button>
        <Button onClick={save} disabled={busy !== null || title.trim().length < 3} className="bg-itf-navy hover:bg-itf-navy-deep">Enregistrer le quiz</Button>
      </div>
      <p className="text-xs text-muted-foreground">Cochez le rond de la bonne réponse. Les questions générées par l’IA sont à relire avant usage.</p>
    </div>
  )
}
