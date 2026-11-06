"use client"

import { useRef, useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Turn { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Quel est le programme de demain ?',
  'Quand a lieu le lancement du PASS ?',
  'Je souhaite être recontacté pour un partenariat',
]

const WELCOME: Turn = {
  role: 'assistant',
  content: 'Bonjour et bienvenue sur le stand de l’ANSUT ! Je peux vous renseigner sur le programme du stand ou transmettre vos coordonnées à l’équipe.',
}

// Fenêtre de discussion avec l'assistant du stand (agent c).
export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([WELCOME])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiOff, setAiOff] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const next: Turn[] = [...turns, { role: 'user', content }]
    setTurns(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/agents/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Le message d'accueil local n'est pas envoyé : l'historique commence par le visiteur.
        body: JSON.stringify({ messages: next.slice(1) }),
      })
      const data = await res.json()
      setAiOff(data.usedAI === false)
      setTurns([...next, { role: 'assistant', content: res.ok ? data.answer : data.error }])
    } catch {
      setTurns([...next, { role: 'assistant', content: 'Connexion impossible. L’équipe du stand reste à votre disposition.' }])
    } finally {
      setBusy(false)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-3xl border bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Sparkles className="h-5 w-5 text-itf-orange" />
        <span className="font-semibold text-itf-navy">Assistant du stand ANSUT</span>
        {aiOff && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Mode sans IA</span>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm ${t.role === 'user' ? 'bg-itf-navy text-white' : 'bg-itf-sky text-itf-navy'}`}>
              {t.content}
            </p>
          </div>
        ))}
        {busy && <Loader2 className="h-5 w-5 animate-spin text-itf-cyan" />}
        <div ref={endRef} />
      </div>
      {turns.length === 1 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-itf-cyan/40 px-3 py-1 text-xs text-itf-navy hover:bg-itf-sky">
              {s}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 border-t p-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Votre question…" maxLength={2000} aria-label="Votre question" />
        <Button type="submit" disabled={busy || !input.trim()} className="bg-itf-navy hover:bg-itf-navy-deep" aria-label="Envoyer">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
