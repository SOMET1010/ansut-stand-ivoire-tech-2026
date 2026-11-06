"use client"

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SiteHeader } from '@/components/brand/brand'
import { QuizPlayer } from '@/components/live/quiz-player'
import { ActivityPlayer } from '@/components/live/activity-player'

function Play() {
  const router = useRouter()
  const code = useSearchParams().get('code') ?? ''
  const [input, setInput] = useState(code)
  const [kind, setKind] = useState<'quiz' | 'activity' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setKind(null)
    setError(null)
    if (!/^\d{6}$/.test(code)) return
    fetch(`/api/live/play/${code}`).then(async (r) => {
      const j = await r.json()
      if (r.ok) setKind(j.kind)
      else setError(j.error ?? 'Code inconnu')
    })
  }, [code])

  return (
    <main className="itf-hero-bg flex min-h-[calc(100vh-64px)] items-start justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-itf-cyan/20">
        {kind === 'quiz' && <QuizPlayer code={code} />}
        {kind === 'activity' && <ActivityPlayer code={code} />}
        {!kind && (
          <form onSubmit={(e) => { e.preventDefault(); router.push(`/jouer?code=${input.trim()}`) }} className="space-y-4 text-center">
            <h1 className="text-2xl font-extrabold text-itf-navy">Participer en direct</h1>
            <p className="text-sm text-muted-foreground">Saisissez le code affiché sur l’écran du stand.</p>
            <Input inputMode="numeric" pattern="\d{6}" maxLength={6} value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} placeholder="123 456" className="h-14 text-center text-3xl font-bold tracking-[0.3em]" aria-label="Code à 6 chiffres" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={input.length !== 6} className="w-full bg-itf-navy hover:bg-itf-navy-deep">Entrer</Button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function JouerPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <Suspense><Play /></Suspense>
    </div>
  )
}
