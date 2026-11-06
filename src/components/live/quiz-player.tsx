"use client"

import { useEffect, useState } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ANSWER_STYLES } from './answer-style'
import { useCountdown, usePoll } from './use-poll'

interface QuizState {
  title: string
  status: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'FINISHED'
  index: number
  total: number
  question: { id: string; text: string; options: string[]; deadline: number | null; correctIndex: number | null } | null
  me: { nickname: string; score: number; rank: number; answer: { choice: number; correct: boolean; points: number } | null } | null
  podium: { nickname: string; score: number }[] | null
}

const key = (code: string) => `itf-quiz-${code}`

// Vue joueur du quiz : pseudo, réponses chronométrées, score et classement.
export function QuizPlayer({ code }: { code: string }) {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => { try { setPlayerId(localStorage.getItem(key(code))) } catch { /* stockage indisponible */ } }, [code])
  const { data, refresh, serverNow } = usePoll<QuizState>(`/api/live/play/${code}${playerId ? `?playerId=${playerId}` : ''}`, 1000)
  const left = useCountdown(data?.status === 'QUESTION' ? data.question?.deadline : null, serverNow)

  const join = async () => {
    setJoinError(null)
    const res = await fetch(`/api/live/play/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', nickname }) })
    const json = await res.json()
    if (!res.ok) return setJoinError(json.error)
    try { localStorage.setItem(key(code), json.playerId) } catch { /* ignore */ }
    setPlayerId(json.playerId)
  }

  const answer = async (choice: number) => {
    if (!data?.question || !playerId || sending) return
    setSending(true)
    await fetch(`/api/live/play/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'answer', playerId, questionId: data.question.id, choice }) })
    await refresh()
    setSending(false)
  }

  if (!data) return <Loader2 className="mx-auto h-10 w-10 animate-spin text-itf-cyan" />

  if (!playerId || !data.me) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); join() }} className="space-y-4 text-center">
        <h1 className="text-2xl font-extrabold text-itf-navy">{data.title}</h1>
        <Input autoFocus required minLength={2} maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Votre pseudo" className="h-12 text-center text-lg" />
        {joinError && <p className="text-sm text-destructive">{joinError}</p>}
        <Button type="submit" size="lg" className="w-full bg-itf-navy hover:bg-itf-navy-deep">Je joue !</Button>
      </form>
    )
  }

  const { me, question } = data
  const header = (
    <div className="mb-4 flex justify-between text-sm font-semibold text-itf-navy">
      <span>{me.nickname}</span>
      <span>{me.score} pts · {me.rank}<sup>{me.rank === 1 ? 're' : 'e'}</sup></span>
    </div>
  )

  if (data.status === 'LOBBY') return <div className="text-center">{header}<p className="text-xl font-bold text-itf-navy">Vous êtes inscrit·e !</p><p className="mt-2 text-muted-foreground">Le quiz va commencer, regardez l’écran.</p></div>

  if (data.status === 'FINISHED') {
    return (
      <div className="text-center">
        {header}
        <Trophy className="mx-auto h-14 w-14 text-itf-orange" />
        <p className="mt-2 text-3xl font-extrabold text-itf-navy">{me.rank}<sup>{me.rank === 1 ? 're' : 'e'}</sup> place</p>
        <p className="text-lg text-muted-foreground">{me.score} points</p>
        {data.podium && <ol className="mt-6 space-y-1 text-left">{data.podium.map((p, i) => <li key={p.nickname} className="rounded-xl bg-itf-sky px-4 py-2 font-semibold text-itf-navy">{['🥇', '🥈', '🥉'][i]} {p.nickname} · {p.score}</li>)}</ol>}
      </div>
    )
  }

  if (!question) return null
  const answered = me.answer
  const reveal = data.status === 'REVEAL'

  return (
    <div>
      {header}
      <p className="text-xs uppercase tracking-wider text-itf-orange">Question {data.index + 1} / {data.total}{!reveal && ` · ${left} s`}</p>
      <h2 className="mb-5 mt-1 text-xl font-bold text-itf-navy">{question.text}</h2>
      {reveal || answered || left === 0 ? (
        <div className="rounded-2xl bg-itf-sky p-6 text-center">
          {!answered && <p className="text-lg font-bold text-itf-navy">{reveal ? 'Pas de réponse' : 'Temps écoulé'}</p>}
          {answered && !reveal && <p className="text-lg font-bold text-itf-navy">Réponse envoyée, suspense…</p>}
          {answered && reveal && (
            <p className={`text-2xl font-extrabold ${answered.correct ? 'text-[#3d7f1f]' : 'text-destructive'}`}>
              {answered.correct ? `Bravo ! +${answered.points}` : 'Raté !'}
            </p>
          )}
          {reveal && question.correctIndex !== null && <p className="mt-2 text-sm text-itf-navy">Bonne réponse : {question.options[question.correctIndex]}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt, i) => (
            <button key={i} disabled={sending} onClick={() => answer(i)} className={`flex min-h-24 flex-col items-center justify-center rounded-2xl p-3 text-white shadow-md active:scale-95 ${ANSWER_STYLES[i].bg}`}>
              <span aria-hidden className="text-2xl">{ANSWER_STYLES[i].shape}</span>
              <span className="mt-1 text-sm font-semibold">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
