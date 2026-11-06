// Animations prêtes à l'emploi pour le stand (faits issus de la configuration de l'événement).
// Idempotent par titre / question.   npx tsx scripts/seed-animations-itf2026.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function code(): Promise<string> {
  for (;;) {
    const c = String(Math.floor(100000 + Math.random() * 900000))
    const [q, a] = await Promise.all([prisma.quiz.findUnique({ where: { code: c } }), prisma.liveActivity.findUnique({ where: { code: c } })])
    if (!q && !a) return c
  }
}

const QUIZ = {
  title: 'Le stand ANSUT en 5 questions',
  questions: [
    { text: 'Que signifie le « SU » de ANSUT ?', options: ['Service Universel', 'Système Unifié', 'Sécurité Urbaine', 'Satellite Universel'], correctIndex: 0 },
    { text: 'Où se tient l’Ivoire Tech Forum 2026 ?', options: ['Palais de la Culture', 'Sofitel Hôtel Ivoire', 'Plateau Dokui', 'Parc des expositions'], correctIndex: 1 },
    { text: 'Quelles sont les dates de l’ITF 2026 ?', options: ['1er – 3 novembre', '11 – 13 novembre', '20 – 22 novembre', '4 – 6 décembre'], correctIndex: 1 },
    { text: 'Quel jour a lieu le lancement institutionnel du PASS sur le stand ?', options: ['Mercredi 11 novembre', 'Jeudi 12 novembre', 'Vendredi 13 novembre', 'Samedi 14 novembre'], correctIndex: 1 },
    { text: 'Complétez la signature : « Connecter le présent, … »', options: ['… innover demain', '… bâtir le futur du numérique', '… relier les villages', '… inventer l’Afrique'], correctIndex: 1 },
  ],
}

const ACTIVITIES = [
  { type: 'WORDCLOUD', prompt: 'En un mot, le numérique de demain pour vous ?' },
  { type: 'POLL', prompt: 'Quel thème du stand vous intéresse le plus ?', options: ['Cybersécurité', 'Connecter les villages', 'Inclusion numérique', 'Femmes et numérique'] },
  { type: 'SCALE', prompt: 'Notez votre visite du stand ANSUT' },
  { type: 'OPEN', prompt: 'Une idée pour connecter tous les villages de Côte d’Ivoire ?' },
]

async function main() {
  if (!(await prisma.quiz.findFirst({ where: { title: QUIZ.title } }))) {
    await prisma.quiz.create({
      data: {
        title: QUIZ.title,
        code: await code(),
        questions: { create: QUIZ.questions.map((q, order) => ({ order, text: q.text, options: JSON.stringify(q.options), correctIndex: q.correctIndex, timeLimit: 20 })) },
      },
    })
  }
  for (const a of ACTIVITIES) {
    if (await prisma.liveActivity.findFirst({ where: { prompt: a.prompt } })) continue
    await prisma.liveActivity.create({ data: { type: a.type, prompt: a.prompt, options: a.options ? JSON.stringify(a.options) : null, code: await code() } })
  }
  const [q, act] = await Promise.all([prisma.quiz.count(), prisma.liveActivity.count()])
  console.log(`OK : ${q} quiz, ${act} activité(s)`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
