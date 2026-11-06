import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { deadlineOf, leaderboard } from '@/lib/quiz'

type Ctx = { params: Promise<{ id: string }> }

// Vue animateur : question courante, répartition des réponses, classement.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' }, include: { answers: { select: { choice: true } } } }, _count: { select: { players: true } } },
  })
  if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 })
  const q = quiz.questions[quiz.currentIndex]
  const options: string[] = q ? JSON.parse(q.options) : []
  return NextResponse.json({
    quiz: { id: quiz.id, title: quiz.title, code: quiz.code, status: quiz.status, currentIndex: quiz.currentIndex, total: quiz.questions.length, players: quiz._count.players },
    question: q ? { text: q.text, options, correctIndex: q.correctIndex, timeLimit: q.timeLimit, deadline: deadlineOf(quiz.questionStartedAt, q.timeLimit), answered: q.answers.length, distribution: options.map((_, i) => q.answers.filter((a) => a.choice === i).length) } : null,
    leaderboard: await leaderboard(id),
    serverNow: Date.now(),
  })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  await db.quiz.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
