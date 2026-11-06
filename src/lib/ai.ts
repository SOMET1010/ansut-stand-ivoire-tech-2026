// Couche IA commune aux agents du stand (SDK officiel Anthropic).
// Sans ANTHROPIC_API_KEY, chaque agent bascule sur un modèle de texte
// déterministe et l'indique explicitement (usedAI = false) : jamais de faux succès.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { db } from '@/lib/db'

export const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'

// Bascule automatique vers un autre modèle si une requête est déclinée par les garde-fous.
export const FALLBACK = {
  betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: 'default' as const,
}

let client: Anthropic | null = null

export function isAIEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

type Effort = 'low' | 'medium' | 'high'

function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

/** Génération de texte libre (courrier, synthèse). */
export async function generateText(opts: { system: string; prompt: string; effort?: Effort }): Promise<string> {
  const response = await getClient().beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: opts.effort ?? 'medium' },
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  })
  if (response.stop_reason === 'refusal') throw new Error('Requête déclinée par le modèle')
  return textOf(response.content)
}

/** Génération structurée validée par un schéma Zod. */
export async function generateJSON<T extends z.ZodType>(opts: {
  system: string
  prompt: string
  schema: T
  effort?: Effort
}): Promise<z.infer<T>> {
  const response = await getClient().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: opts.effort ?? 'low', format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error('Réponse structurée indisponible')
  }
  return response.parsed_output as z.infer<T>
}

/** Journalise chaque exécution d'agent (audit et bilan). */
export async function logAgentRun(kind: string, usedAI: boolean, input: unknown, output: unknown) {
  await db.agentRun.create({
    data: {
      kind,
      usedAI,
      input: input === undefined ? null : JSON.stringify(input).slice(0, 20000),
      output: typeof output === 'string' ? output : JSON.stringify(output),
    },
  })
}
