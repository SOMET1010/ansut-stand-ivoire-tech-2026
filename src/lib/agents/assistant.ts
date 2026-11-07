// Agent (c) : assistant public du stand, avec enregistrement de contact (outil).
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { db } from '@/lib/db'
import { FALLBACK, getClient, logAgentRun, withAI } from '@/lib/ai'
import { publicKnowledge } from '@/lib/stand'
import { getProgram } from '@/lib/program'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const systemPrompt = async () => `Tu es l'assistant numérique du stand de l'ANSUT à l'Ivoire Tech Forum 2026.
Tu réponds en français, en 2 à 5 phrases, avec chaleur et précision.
Tu réponds UNIQUEMENT à partir des informations ci-dessous. Si une information n'y figure pas (chiffres, budgets, noms, projets non listés), dis que l'équipe présente sur le stand pourra répondre, sans rien inventer.
Si le visiteur souhaite être recontacté, recevoir de la documentation ou un partenariat, demande son nom, son organisation et un email ou téléphone, puis appelle l'outil save_contact. N'appelle l'outil qu'avec des informations données par le visiteur.

INFORMATIONS :
${await publicKnowledge()}`

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

// Mots trop courants pour identifier une séquence
const STOPWORDS = new Set(['dans', 'pour', 'avec', 'puis', 'tous', 'toute', 'sont', 'quand', 'quel', 'quelle', 'lieu', 'heure', 'officielle', 'officiel', 'ouverture'])
const keywords = (t: string) => t.toLowerCase().split(/[^\p{L}\d]+/u).filter((w) => w.length >= 4 && !STOPWORDS.has(w))

/** Réponse de secours sans IA : orientation vers le programme. */
async function fallbackAnswer(question: string): Promise<string> {
  const asked = new Set(keywords(question))
  const match = (await getProgram()).filter((s) => !s.allDay && keywords(s.title).some((w) => asked.has(w)))
  if (match.length) {
    return match.map((s) => `« ${s.title} » : ${s.day}, ${s.time}${s.location ? `, ${s.location}` : ''}.`).join(' ') +
      ' Pour toute autre question, l’équipe du stand vous accueille.'
  }
  return 'L’assistant intelligent n’est pas activé pour le moment. Consultez le programme (/program) ou adressez-vous à l’équipe présente sur le stand ANSUT.'
}

const AI_OFF_NOTICE = {
  budget: 'L’assistant intelligent est très sollicité : réponse simplifiée.',
  failed: 'L’assistant intelligent est momentanément indisponible : réponse simplifiée.',
  disabled: null,
} as const

export async function runAssistant(history: ChatTurn[]) {
  const last = history[history.length - 1]?.content ?? ''
  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-12).map((t) => ({ role: t.role, content: t.content }))

  const { value, usedAI, aiError } = await withAI(
    async () => {
      const { client, model } = await getClient()
      const final = await client.beta.messages.toolRunner({
        model,
        max_tokens: 1500,
        ...FALLBACK,
        output_config: { effort: 'low' },
        system: await systemPrompt(),
        tools: [saveContact],
        max_iterations: 3,
        messages,
      })
      if (final.stop_reason === 'refusal') return 'Je ne peux pas répondre à cette demande. L’équipe du stand reste à votre disposition.'
      return final.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
    },
    () => fallbackAnswer(last),
  )
  const notice = aiError ? AI_OFF_NOTICE[aiError] : null
  const answer = notice ? `${notice} ${value}` : value
  await logAgentRun('assistant', usedAI, { question: last.slice(0, 500), aiError }, answer)
  return { answer, usedAI }
}
