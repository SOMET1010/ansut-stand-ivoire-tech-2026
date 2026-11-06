"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { ACTIVITY_LABELS } from './answer-style'

type T = keyof typeof ACTIVITY_LABELS
const HINTS: Record<T, string> = {
  WORDCLOUD: 'Ex. : En un mot, le numérique pour vous c’est…',
  POLL: 'Ex. : Quel service ANSUT vous intéresse le plus ?',
  SCALE: 'Ex. : Notez la causerie de ce matin',
  OPEN: 'Ex. : Une idée pour connecter les villages ?',
}

// Création d'une activité interactive (nuage, sondage, note, mur d'idées).
export function ActivityForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState<T>('WORDCLOUD')
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState(['', ''])

  const create = async () => {
    const res = await fetch('/api/live/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, prompt, options: type === 'POLL' ? options.map((o) => o.trim()).filter(Boolean) : undefined }),
    })
    const json = await res.json()
    if (!res.ok) return toast({ title: 'Création impossible', description: json.error, variant: 'destructive' })
    toast({ title: `${ACTIVITY_LABELS[type]} créé · code ${json.activity.code}` })
    setPrompt('')
    setOptions(['', ''])
    onCreated()
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type d’activité">
        {(Object.keys(ACTIVITY_LABELS) as T[]).map((t) => (
          <button key={t} role="radio" aria-checked={t === type} onClick={() => setType(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${t === type ? 'bg-itf-navy text-white' : 'bg-itf-sky text-itf-navy'}`}>{ACTIVITY_LABELS[t]}</button>
        ))}
      </div>
      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={HINTS[type]} />
      {type === 'POLL' && (
        <div className="space-y-2">
          {options.map((o, i) => <Input key={i} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Choix ${i + 1}`} />)}
          {options.length < 6 && <Button variant="ghost" size="sm" onClick={() => setOptions([...options, ''])}>+ Ajouter un choix</Button>}
        </div>
      )}
      <Button onClick={create} disabled={prompt.trim().length < 3} className="bg-itf-navy hover:bg-itf-navy-deep">Créer</Button>
    </div>
  )
}
