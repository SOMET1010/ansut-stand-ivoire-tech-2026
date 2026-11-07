"use client"

import { useCallback, useEffect, useState } from 'react'
import { Monitor, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuizEditor } from '@/components/live/quiz-editor'
import { ActivityForm } from '@/components/live/activity-form'
import { ACTIVITY_LABELS } from '@/components/live/answer-style'

interface QuizRow { id: string; title: string; code: string; status: string; _count: { questions: number; players: number } }
interface ActivityRow { id: string; type: keyof typeof ACTIVITY_LABELS; prompt: string; code: string; open: boolean; _count: { responses: number } }

// Animations du stand : quiz en direct et activités interactives.
export default function AnimationsPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])

  const load = useCallback(async () => {
    const [q, a] = await Promise.all([fetch('/api/live/quizzes').then((r) => r.json()), fetch('/api/live/activities').then((r) => r.json())])
    setQuizzes(q.quizzes ?? [])
    setActivities(a.activities ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  const remove = async (url: string) => {
    if (!confirm('Supprimer définitivement ?')) return
    await fetch(url, { method: 'DELETE' })
    load()
  }
  const screen = (url: string) => window.open(url, '_blank', 'noopener')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-itf-navy">Animations en direct</h1>
        <p className="text-muted-foreground">Les visiteurs participent depuis leur téléphone sur <strong>/jouer</strong> avec le code affiché à l’écran.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-itf-navy">Quiz</h2>
        {quizzes.map((q) => (
          <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3">
            <span className="flex-1 font-semibold">{q.title}</span>
            <Badge variant="outline">{q._count.questions} questions</Badge>
            <Badge variant="outline">{q._count.players} joueur{q._count.players > 1 ? 's' : ''}</Badge>
            <Badge className="border-0 bg-itf-sky text-itf-navy">Code {q.code}</Badge>
            <Button size="sm" onClick={() => screen(`/ecran/quiz/${q.id}`)} className="bg-itf-navy hover:bg-itf-navy-deep"><Monitor className="mr-2 h-4 w-4" /> Écran animateur</Button>
            <Button size="icon" variant="ghost" onClick={() => remove(`/api/live/quizzes/${q.id}`)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <QuizEditor onCreated={load} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-itf-navy">Nuage de mots · Sondage · Note · Mur d’idées</h2>
        {activities.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3">
            <Badge className="border-0 bg-itf-orange/15 text-itf-orange">{ACTIVITY_LABELS[a.type]}</Badge>
            <span className="flex-1 font-semibold">{a.prompt}</span>
            <Badge variant="outline">{a._count.responses} réponse{a._count.responses > 1 ? 's' : ''}</Badge>
            <Badge variant="outline">{a.open ? 'Ouvert' : 'Fermé'}</Badge>
            <Badge className="border-0 bg-itf-sky text-itf-navy">Code {a.code}</Badge>
            <Button size="sm" onClick={() => screen(`/ecran/activite/${a.id}`)} className="bg-itf-navy hover:bg-itf-navy-deep"><Monitor className="mr-2 h-4 w-4" /> Projeter</Button>
            <Button size="icon" variant="ghost" onClick={() => remove(`/api/live/activities/${a.id}`)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <ActivityForm onCreated={load} />
      </section>
    </div>
  )
}
