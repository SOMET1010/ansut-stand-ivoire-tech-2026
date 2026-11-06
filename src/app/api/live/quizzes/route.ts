import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { QuizInput, uniqueCode } from '@/lib/quiz'

export async function GET() {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const quizzes = await db.quiz.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { questions: true, players: true } } } })
  return NextResponse.json({ quizzes })
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const parsed = QuizInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Quiz invalide', details: parsed.error.issues }, { status: 400 })
  const { title, questions } = parsed.data
  if (questions.some((q) => q.correctIndex >= q.options.length)) return NextResponse.json({ error: 'Bonne réponse hors des choix' }, { status: 400 })
  const quiz = await db.quiz.create({
    data: {
      title,
      code: await uniqueCode(),
      questions: { create: questions.map((q, order) => ({ order, text: q.text, options: JSON.stringify(q.options), correctIndex: q.correctIndex, timeLimit: q.timeLimit })) },
    },
  })
  return NextResponse.json({ quiz }, { status: 201 })
}
