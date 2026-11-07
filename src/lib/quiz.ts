// Logique métier du quiz en direct (chronométré, points à la rapidité, classement).
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateJSON, isAIEnabled, logAgentRun } from '@/lib/ai'
import { publicKnowledge } from '@/lib/stand'

export const QuestionInput = z.object({
  text: z.string().trim().min(3).max(300),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(4),
  correctIndex: z.number().int().min(0).max(3),
  timeLimit: z.number().int().min(5).max(120).default(20),
})
export type QuestionInput = z.infer<typeof QuestionInput>

export const QuizInput = z.object({
  title: z.string().trim().min(3).max(150),
  questions: z.array(QuestionInput).min(1).max(30),
})

/** Code numérique à 6 chiffres, unique parmi les quiz ET les activités (même écran de saisie). */
export async function uniqueCode(): Promise<string> {
  for (;;) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const [quiz, activity] = await Promise.all([db.quiz.findUnique({ where: { code } }), db.liveActivity.findUnique({ where: { code } })])
    if (!quiz && !activity) return code
  }
}

/** Points : 500 pour une bonne réponse + jusqu'à 500 selon la rapidité. */
export function scoreFor(correct: boolean, elapsedMs: number, timeLimitS: number): number {
  if (!correct) return 0
  const ratio = Math.min(Math.max(elapsedMs / (timeLimitS * 1000), 0), 1)
  return Math.round(500 + 500 * (1 - ratio))
}

export function deadlineOf(startedAt: Date | null, timeLimitS: number): number | null {
  return startedAt ? startedAt.getTime() + timeLimitS * 1000 : null
}

export async function leaderboard(quizId: string, take = 10) {
  return db.quizPlayer.findMany({
    where: { quizId },
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    take,
    select: { id: true, nickname: true, score: true },
  })
}

export type QuizAction = 'start' | 'next' | 'reveal' | 'finish' | 'reset'

/** Transitions pilotées par l'animateur. */
export async function controlQuiz(quizId: string, action: QuizAction) {
  const quiz = await db.quiz.findUnique({ where: { id: quizId }, include: { questions: { orderBy: { order: 'asc' } } } })
  if (!quiz) throw new Error('Quiz introuvable')
  const total = quiz.questions.length

  switch (action) {
    case 'start':
    case 'next': {
      const nextIndex = action === 'start' ? 0 : quiz.currentIndex + 1
      if (nextIndex >= total) return db.quiz.update({ where: { id: quizId }, data: { status: 'FINISHED' } })
      return db.quiz.update({ where: { id: quizId }, data: { status: 'QUESTION', currentIndex: nextIndex, questionStartedAt: new Date() } })
    }
    case 'reveal':
      return db.quiz.update({ where: { id: quizId }, data: { status: 'REVEAL' } })
    case 'finish':
      return db.quiz.update({ where: { id: quizId }, data: { status: 'FINISHED' } })
    case 'reset':
      await db.quizPlayer.deleteMany({ where: { quizId } })
      return db.quiz.update({ where: { id: quizId }, data: { status: 'LOBBY', currentIndex: -1, questionStartedAt: null } })
  }
}

/** Enregistre la réponse d'un joueur (une seule par question, dans le temps imparti). */
export async function submitAnswer(code: string, playerId: string, questionId: string, choice: number) {
  const quiz = await db.quiz.findUnique({ where: { code }, include: { questions: { orderBy: { order: 'asc' } } } })
  if (!quiz) return { error: 'Quiz introuvable', status: 404 } as const
  const question = quiz.questions[quiz.currentIndex]
  if (quiz.status !== 'QUESTION' || !question || question.id !== questionId) return { error: 'Question fermée', status: 409 } as const

  const player = await db.quizPlayer.findFirst({ where: { id: playerId, quizId: quiz.id } })
  if (!player) return { error: 'Joueur inconnu', status: 404 } as const

  const elapsed = Date.now() - (quiz.questionStartedAt?.getTime() ?? Date.now())
  if (elapsed > question.timeLimit * 1000 + 1000) return { error: 'Temps écoulé', status: 409 } as const
  const options: string[] = JSON.parse(question.options)
  if (choice < 0 || choice >= options.length) return { error: 'Réponse invalide', status: 400 } as const

  const existing = await db.quizAnswer.findUnique({ where: { questionId_playerId: { questionId, playerId } } })
  if (existing) return { error: 'Déjà répondu', status: 409 } as const

  const correct = choice === question.correctIndex
  const points = scoreFor(correct, elapsed, question.timeLimit)
  await db.$transaction([
    db.quizAnswer.create({ data: { questionId, playerId, choice, correct, points } }),
    db.quizPlayer.update({ where: { id: playerId }, data: { score: { increment: points } } }),
  ])
  return { ok: true } as const
}

// ─── Agent : génération des questions ────────────────────────────────

const GeneratedQuiz = z.object({
  questions: z.array(
    z.object({
      text: z.string(),
      options: z.array(z.string()).describe('Exactement 4 réponses courtes'),
      correctIndex: z.number().int().describe('Index (0 à 3) de la bonne réponse'),
    }),
  ),
})

/** Génère des questions à partir d'un thème, en se limitant aux faits fournis quand ils existent. */
export async function generateQuestions(theme: string, count: number): Promise<QuestionInput[]> {
  if (!(await isAIEnabled())) throw new Error('La génération de questions nécessite l’IA (clé à saisir dans Administration › Réglages IA).')
  const result = await generateJSON({
    effort: 'medium',
    schema: GeneratedQuiz,
    system: `Tu crées des quiz grand public, ludiques et pédagogiques, pour le stand de l'ANSUT à l'Ivoire Tech Forum 2026.
Questions courtes (moins de 120 caractères), 4 réponses plausibles de moins de 60 caractères, une seule bonne réponse, en français.
Pour tout ce qui concerne l'ANSUT ou le stand, n'utilise que les informations fournies. Pour un thème général (cybersécurité, numérique, inclusion), utilise uniquement des notions largement établies et non datées ; aucun chiffre ni statistique.`,
    prompt: `Thème : ${theme}\nNombre de questions : ${count}\n\nInformations sur le stand :\n${await publicKnowledge()}`,
  })
  const questions = result.questions
    .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
    .slice(0, count)
    .map((q) => ({ text: q.text, options: q.options.slice(0, 4), correctIndex: q.correctIndex, timeLimit: 20 }))
  await logAgentRun('quiz', true, { theme, count }, questions)
  return questions
}
