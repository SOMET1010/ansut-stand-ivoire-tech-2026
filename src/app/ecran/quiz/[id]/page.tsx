"use client"

import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AnsutLogo, EventBadge } from '@/components/brand/brand'
import { JoinBanner } from '@/components/live/join-banner'
import { BarsView } from '@/components/live/results-view'
import { ANSWER_STYLES } from '@/components/live/answer-style'
import { useCountdown, usePoll } from '@/components/live/use-poll'

interface HostState {
  quiz: { id: string; title: string; code: string; status: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'FINISHED'; currentIndex: number; total: number; players: number }
  question: { text: string; options: string[]; correctIndex: number; deadline: number | null; answered: number; distribution: number[] } | null
  leaderboard: { id: string; nickname: string; score: number }[]
}

// Écran animateur / projection du quiz.
export default function QuizScreen() {
  const { id } = useParams<{ id: string }>()
  const { data, error, refresh, serverNow } = usePoll<HostState>(`/api/live/quizzes/${id}`, 1000)
  const left = useCountdown(data?.quiz.status === 'QUESTION' ? data.question?.deadline : null, serverNow)

  const control = async (action: string) => {
    await fetch(`/api/live/quizzes/${id}/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    refresh()
  }

  if (error) return <p className="p-10 text-destructive">{error} — connectez-vous à l’espace équipe.</p>
  if (!data) return null
  const { quiz, question, leaderboard } = data
  const last = quiz.currentIndex + 1 >= quiz.total

  return (
    <div className="itf-hero-bg flex min-h-screen flex-col p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4"><AnsutLogo className="h-14 w-auto" /><EventBadge /></div>
        <h1 className="text-2xl font-bold text-itf-navy">{quiz.title}</h1>
        {quiz.status !== 'LOBBY' && <JoinBanner code={quiz.code} compact />}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-6">
        {quiz.status === 'LOBBY' && (
          <div className="text-center">
            <JoinBanner code={quiz.code} />
            <p className="mt-8 text-6xl font-extrabold text-itf-navy">{quiz.players}</p>
            <p className="text-xl text-itf-navy/70">joueur(s) connecté(s)</p>
          </div>
        )}

        {question && (quiz.status === 'QUESTION' || quiz.status === 'REVEAL') && (
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between text-itf-navy">
              <span className="text-lg font-semibold">Question {quiz.currentIndex + 1} / {quiz.total}</span>
              {quiz.status === 'QUESTION' && <span className="flex h-20 w-20 items-center justify-center rounded-full bg-itf-navy text-4xl font-extrabold text-white">{left}</span>}
              <span className="text-lg font-semibold">{question.answered} / {quiz.players} réponses</span>
            </div>
            <h2 className="my-8 text-center text-4xl font-extrabold text-itf-navy md:text-5xl">{question.text}</h2>
            {quiz.status === 'QUESTION' ? (
              <div className="grid grid-cols-2 gap-4">
                {question.options.map((o, i) => (
                  <div key={i} className={`flex items-center gap-4 rounded-2xl p-6 text-2xl font-bold text-white ${ANSWER_STYLES[i].bg}`}><span aria-hidden>{ANSWER_STYLES[i].shape}</span>{o}</div>
                ))}
              </div>
            ) : (
              <BarsView colored bars={question.options.map((o, i) => ({ label: (i === question.correctIndex ? '✔ ' : '') + o, count: question.distribution[i] }))} />
            )}
          </div>
        )}

        {quiz.status === 'FINISHED' && (
          <div className="w-full max-w-2xl text-center">
            <p className="text-5xl font-extrabold text-itf-navy">Classement final</p>
          </div>
        )}

        {(quiz.status === 'REVEAL' || quiz.status === 'FINISHED') && leaderboard.length > 0 && (
          <ol className="mt-8 w-full max-w-2xl space-y-2">
            {leaderboard.slice(0, quiz.status === 'FINISHED' ? 10 : 5).map((p, i) => (
              <li key={p.id} className={`flex justify-between rounded-2xl px-6 py-3 text-xl font-bold ${i === 0 ? 'bg-itf-orange text-white' : 'bg-white text-itf-navy'}`}>
                <span>{i + 1}. {p.nickname}</span><span>{p.score}</span>
              </li>
            ))}
          </ol>
        )}
      </main>

      <footer className="flex flex-wrap justify-center gap-3">
        {quiz.status === 'LOBBY' && <Button size="lg" disabled={quiz.total === 0} onClick={() => control('start')} className="bg-itf-green hover:bg-itf-green/90">Lancer le quiz</Button>}
        {quiz.status === 'QUESTION' && <Button size="lg" onClick={() => control('reveal')} className="bg-itf-navy hover:bg-itf-navy-deep">Afficher la réponse</Button>}
        {quiz.status === 'REVEAL' && <Button size="lg" onClick={() => control(last ? 'finish' : 'next')} className="bg-itf-navy hover:bg-itf-navy-deep">{last ? 'Classement final' : 'Question suivante'}</Button>}
        {quiz.status === 'FINISHED' && <Button size="lg" variant="outline" onClick={() => confirm('Rejouer : les joueurs et scores seront effacés.') && control('reset')}>Rejouer</Button>}
      </footer>
    </div>
  )
}
