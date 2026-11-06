// Agent (c) : assistant public du stand, avec enregistrement de contact (outil).
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { db } from '@/lib/db'
import { AI_MODEL, FALLBACK, getClient, isAIEnabled, logAgentRun } from '@/lib/ai'
import { publicKnowledge } from '@/lib/stand'
import { STAND_SESSIONS } from '@/config/event'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM = `Tu es l'assistant numérique du stand de l'ANSUT à l'Ivoire Tech Forum 2026.
Tu réponds en français, en 2 à 5 phrases, avec chaleur et précision.
Tu réponds UNIQUEMENT à partir des informations ci-dessous. Si une information n'y figure pas (chiffres, budgets, noms, projets non listés), dis que l'équipe présente sur le stand pourra répondre, sans rien inventer.
Si le visiteur souhaite être recontacté, recevoir de la documentation ou un partenariat, demande son nom, son organisation et un email ou téléphone, puis appelle l'outil save_contact. N'appelle l'outil qu'avec des informations données par le visiteur.

INFORMATIONS :
${publicKnowledge()}`

const saveContact = betaZodTool({
  name: 'save_contact',
  description: "Enregistre le contact d'un visiteur qui souhaite être recontacté par l'ANSUT.",
  inputSchema: z.object({
    name: z.string().describe('Nom complet du visiteur'),
    organization: z.string().optional().describe('Organisation du visiteur'),
    email: z.string().optional(),
    phone: z.string().optional(),
    interest: z.string().describe('Sujet d’intérêt en une phrase'),
  }),
  run: async (input) => {
    if (!input.email && !input.phone) return 'Erreur : un email ou un téléphone est nécessaire.'
    await db.lead.create({ data: { ...input, source: 'assistant' } })
    return 'Contact enregistré.'
  },
})

/** Réponse de secours sans IA : orientation vers le programme. */
function fallbackAnswer(question: string): string {
  const q = question.toLowerCase()
  const match = STAND_SESSIONS.filter((s) =>
    s.title.toLowerCase().split(/[\s,:+/]+/).some((w) => w.length > 4 && q.includes(w)),
  )
  if (match.length) {
    return match.map((s) => `« ${s.title} » : ${s.day}, ${s.time}, ${s.location}.`).join(' ') +
      ' Pour toute autre question, l’équipe du stand vous accueille.'
  }
  return 'L’assistant intelligent n’est pas activé pour le moment. Consultez le programme (/program) ou adressez-vous à l’équipe présente sur le stand ANSUT.'
}

export async function runAssistant(history: ChatTurn[]) {
  const last = history[history.length - 1]?.content ?? ''
  if (!isAIEnabled()) {
    const answer = fallbackAnswer(last)
    await logAgentRun('assistant', false, { question: last }, answer)
    return { answer, usedAI: false }
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-12).map((t) => ({ role: t.role, content: t.content }))
  const final = await getClient().beta.messages.toolRunner({
    model: AI_MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: 'low' },
    system: SYSTEM,
    tools: [saveContact],
    max_iterations: 3,
    messages,
  })
  const answer =
    final.stop_reason === 'refusal'
      ? 'Je ne peux pas répondre à cette demande. L’équipe du stand reste à votre disposition.'
      : final.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
  await logAgentRun('assistant', true, { question: last }, answer)
  return { answer, usedAI: true }
}
