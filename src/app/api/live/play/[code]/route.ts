import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { clientIp, rateLimited } from '@/lib/stand'
import { deadlineOf, leaderboard, submitAnswer } from '@/lib/quiz'
import { MAX_RESPONSES, normalizeValue, type ActivityType } from '@/lib/live'

type Ctx = { params: Promise<{ code: string }> }

// État public d'un code : quiz (vue joueur, sans la bonne réponse avant révélation) ou activité.
export async function GET(request: NextRequest, { params }: Ctx) {
  const { code } = await params
  const playerId = request.nextUrl.searchParams.get('playerId')
  const voterId = request.nextUrl.searchParams.get('voterId')

  const quiz = await db.quiz.findUnique({ where: { code }, include: { questions: { orderBy: { order: 'asc' } } } })
  if (quiz) {
    const q = quiz.questions[quiz.currentIndex]
    const player = playerId ? await db.quizPlayer.findFirst({ where: { id: playerId, quizId: quiz.id } }) : null
    const myAnswer = player && q ? await db.quizAnswer.findUnique({ where: { questionId_playerId: { questionId: q.id, playerId: player.id } } }) : null
    const revealed = quiz.status === 'REVEAL' || quiz.status === 'FINISHED'
    // Question ouverte : scores et rangs calculés SANS la question en cours, sinon la hausse
    // du score révélerait la bonne réponse (pseudos jetables → triche).
    const pending = !revealed && q ? await db.quizAnswer.findMany({ where: { questionId: q.id }, select: { playerId: true, points: true } }) : []
    const pendingPoints = new Map(pending.map((a) => [a.playerId, a.points]))
    const board = (await leaderboard(quiz.id, 1000))
      .map((b) => ({ ...b, score: b.score - (pendingPoints.get(b.id) ?? 0) }))
      .sort((a, b) => b.score - a.score)
    return NextResponse.json({
      kind: 'quiz',
      title: quiz.title,
      status: quiz.status,
      index: quiz.currentIndex,
      total: quiz.questions.length,
      question: q && quiz.status !== 'LOBBY' ? {
        id: q.id,
        text: q.text,
        options: JSON.parse(q.options),
        timeLimit: q.timeLimit,
        deadline: deadlineOf(quiz.questionStartedAt, q.timeLimit),
        correctIndex: quiz.status === 'REVEAL' || quiz.status === 'FINISHED' ? q.correctIndex : null,
      } : null,
      me: player ? {
        nickname: player.nickname,
        score: board.find((b) => b.id === player.id)?.score ?? 0,
        rank: board.findIndex((b) => b.id === player.id) + 1,
        // Avant la révélation : seulement « a répondu », jamais juste/faux ni les points
        answer: myAnswer ? (revealed ? { choice: myAnswer.choice, correct: myAnswer.correct, points: myAnswer.points } : { choice: myAnswer.choice }) : null,
      } : null,
      podium: quiz.status === 'FINISHED' ? board.slice(0, 3).map(({ nickname, score }) => ({ nickname, score })) : null,
      serverNow: Date.now(),
    })
  }

  const activity = await db.liveActivity.findUnique({ where: { code } })
  if (activity) {
    const mine = voterId ? await db.liveResponse.count({ where: { activityId: activity.id, voterId } }) : 0
    const type = activity.type as ActivityType
    return NextResponse.json({
      kind: 'activity',
      type,
      prompt: activity.prompt,
      options: activity.options ? JSON.parse(activity.options) : [],
      open: activity.open,
      remaining: Math.max(MAX_RESPONSES[type] - mine, 0),
    })
  }
  return NextResponse.json({ error: 'Code inconnu' }, { status: 404 })
}

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('join'), nickname: z.string().trim().min(2).max(20) }),
  z.object({ action: z.literal('answer'), playerId: z.string(), questionId: z.string(), choice: z.number().int() }),
  z.object({ action: z.literal('respond'), voterId: z.string().min(8).max(64), value: z.string().max(300) }),
])

export async function POST(request: NextRequest, { params }: Ctx) {
  if (rateLimited(`play:${clientIp(request.headers)}`, 10000, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de requêtes, patientez un instant' }, { status: 429 })
  }
  const { code } = await params
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  const body = parsed.data

  if (body.action === 'join') {
    const quiz = await db.quiz.findUnique({ where: { code } })
    if (!quiz) return NextResponse.json({ error: 'Code inconnu' }, { status: 404 })
    if (quiz.status === 'FINISHED') return NextResponse.json({ error: 'Ce quiz est terminé' }, { status: 409 })
    const taken = await db.quizPlayer.findUnique({ where: { quizId_nickname: { quizId: quiz.id, nickname: body.nickname } } })
    if (taken) return NextResponse.json({ error: 'Pseudo déjà pris, choisissez-en un autre' }, { status: 409 })
    const player = await db.quizPlayer.create({ data: { quizId: quiz.id, nickname: body.nickname } })
    return NextResponse.json({ playerId: player.id }, { status: 201 })
  }

  if (body.action === 'answer') {
    const res = await submitAnswer(code, body.playerId, body.questionId, body.choice)
    return 'error' in res ? NextResponse.json({ error: res.error }, { status: res.status }) : NextResponse.json(res)
  }

  const activity = await db.liveActivity.findUnique({ where: { code } })
  if (!activity) return NextResponse.json({ error: 'Code inconnu' }, { status: 404 })
  if (!activity.open) return NextResponse.json({ error: 'Les réponses sont fermées' }, { status: 409 })
  const type = activity.type as ActivityType
  const options: string[] = activity.options ? JSON.parse(activity.options) : []
  const value = normalizeValue(type, body.value, options.length)
  if (!value) return NextResponse.json({ error: 'Réponse invalide' }, { status: 400 })
  const mine = await db.liveResponse.count({ where: { activityId: activity.id, voterId: body.voterId } })
  if (mine >= MAX_RESPONSES[type]) return NextResponse.json({ error: 'Vous avez déjà répondu' }, { status: 409 })
  await db.liveResponse.create({ data: { activityId: activity.id, voterId: body.voterId, value } })
  return NextResponse.json({ ok: true, remaining: MAX_RESPONSES[type] - mine - 1 }, { status: 201 })
}
