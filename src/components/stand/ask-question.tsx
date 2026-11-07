"use client"

import { useState } from 'react'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EVENT } from '@/config/event'

// Question du public sur une séquence : enregistrée en base, vue par le modérateur (onglet Questions).
export function AskQuestion({ panelId }: { panelId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setState('sending')
    setError(null)
    const res = await fetch(`/api/events/${EVENT.id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panelId, authorName: name.trim() || 'Anonyme', content: content.trim() }),
    })
    if (res.ok) {
      setState('sent')
      setContent('')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Envoi impossible, réessayez.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-[#3d7f1f]">
        <CheckCircle2 className="h-4 w-4" /> Question envoyée au modérateur.
        <button className="underline" onClick={() => setState('idle')}>En poser une autre</button>
      </p>
    )
  }
  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3 h-11 border-itf-cyan/50 text-itf-navy" onClick={() => setOpen(true)}>
        <MessageSquare className="mr-2 h-4 w-4" /> Poser une question
      </Button>
    )
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); send() }} className="mt-3 space-y-2">
      <Textarea required minLength={5} maxLength={500} rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Votre question pour les intervenants…" aria-label="Votre question" />
      <Input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom (facultatif)" aria-label="Votre prénom" />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={state === 'sending' || content.trim().length < 5} className="h-11 bg-itf-navy hover:bg-itf-navy-deep">Envoyer</Button>
        <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </form>
  )
}
