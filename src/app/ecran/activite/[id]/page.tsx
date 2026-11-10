"use client"

import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AnsutLogo, EventBadge } from '@/components/brand/brand'
import { JoinBanner } from '@/components/live/join-banner'
import { ResultsView, type ActivityResults } from '@/components/live/results-view'
import { ACTIVITY_LABELS } from '@/components/live/answer-style'
import { usePoll } from '@/components/live/use-poll'

// Écran de projection d'une activité (résultats en direct).
export default function ActivityScreen() {
  const { id } = useParams<{ id: string }>()
  const { data, error, refresh } = usePoll<ActivityResults>(`/api/live/activities/${id}`, 2000)

  const patch = async (body: object) => {
    await fetch(`/api/live/activities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    refresh()
  }

  if (error) return <p className="p-10 text-destructive">{error} — connectez-vous à l’espace équipe.</p>
  if (!data) return null
  const { activity } = data

  return (
    <div className="itf-hero-bg flex min-h-screen flex-col p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4"><AnsutLogo className="h-14 w-auto" /><EventBadge /></div>
        <JoinBanner code={activity.code} compact />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 py-8">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-itf-orange">{ACTIVITY_LABELS[activity.type]} · {data.voters} participant(s)</p>
        <h1 className="mb-8 mt-2 text-center text-4xl font-extrabold text-itf-navy md:text-5xl">{activity.prompt}</h1>
        <div className="rounded-3xl bg-white/80 p-6 shadow-xl"><ResultsView results={data} /></div>
      </main>
      <footer className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => patch({ open: !activity.open })}>{activity.open ? 'Fermer les réponses' : 'Rouvrir les réponses'}</Button>
        <Button variant="ghost" onClick={() => confirm('Effacer toutes les réponses ?') && patch({ reset: true })}>Remettre à zéro</Button>
      </footer>
    </div>
  )
}
