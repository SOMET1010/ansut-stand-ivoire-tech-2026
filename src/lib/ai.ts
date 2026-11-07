// Couche IA commune aux agents du stand (SDK officiel Anthropic).
// La clé et le modèle se règlent dans l'administration (Réglages IA) ; à défaut, ANTHROPIC_API_KEY
// et ANTHROPIC_MODEL de l'environnement. Sans clé, chaque agent bascule sur un modèle de texte
// déterministe et l'indique explicitement (usedAI = false) : jamais de faux succès.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { db } from '@/lib/db'
import { SETTING_KEYS, decryptSecret, getSetting } from '@/lib/settings'

export const DEFAULT_AI_MODEL = 'claude-opus-5-5'

// Bascule automatique vers un autre modèle si une requête est déclinée par les garde-fous.
export const FALLBACK = {
  betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: 'default' as const,
}

export type AIConfig = { apiKey: string | null; model: string; source: 'admin' | 'env' | 'none' }

// Les réglages sont relus au plus toutes les 30 s (plusieurs instances possibles en production).
let cached: { at: number; config: AIConfig } | null = null
let client: { apiKey: string; instance: Anthropic } | null = null

export function invalidateAIConfig() {
  cached = null
}

export async function getAIConfig(): Promise<AIConfig> {
  if (cached && Date.now() - cached.at < 30_000) return cached.config
  let adminKey: string | null = null
  let adminModel: string | null = null
  try {
    const stored = await getSetting(SETTING_KEYS.anthropicApiKey)
    adminKey = stored ? decryptSecret(stored) : null
    adminModel = await getSetting(SETTING_KEYS.anthropicModel)
  } catch (error) {
    console.error('Lecture des réglages IA impossible, repli sur l’environnement :', error instanceof Error ? error.message : error)
  }
  const envKey = process.env.ANTHROPIC_API_KEY || null
  const config: AIConfig = {
    apiKey: adminKey || envKey,
    model: adminModel || process.env.ANTHROPIC_MODEL || DEFAULT_AI_MODEL,
    source: adminKey ? 'admin' : envKey ? 'env' : 'none',
  }
  cached = { at: Date.now(), config }
  return config
}

export async function isAIEnabled(): Promise<boolean> {
  return Boolean((await getAIConfig()).apiKey)
}

// Budget d'appels IA par heure (toutes routes confondues) : protège la facture si le stand
// est très fréquenté ou si une route publique est abusée. Au-delà : mode sans IA.
const MAX_CALLS_PER_HOUR = Number(process.env.AI_MAX_CALLS_PER_HOUR ?? 400)
let budget = { start: Date.now(), used: 0 }
function takeBudget(): boolean {
  if (Date.now() - budget.start > 3600_000) budget = { start: Date.now(), used: 0 }
  if (budget.used >= MAX_CALLS_PER_HOUR) return false
  budget.used++
  return true
}

export type AIOutcome<T> = { value: T; usedAI: boolean; aiError?: 'disabled' | 'budget' | 'failed' }

/**
 * Exécute un appel IA avec repli déterministe : clé absente, budget horaire atteint
 * ou API indisponible / en erreur → fallback(), signalé par usedAI = false.
 */
export async function withAI<T>(ai: () => Promise<T>, fallback: () => T | Promise<T>): Promise<AIOutcome<T>> {
  if (!(await isAIEnabled())) return { value: await fallback(), usedAI: false, aiError: 'disabled' }
  if (!takeBudget()) return { value: await fallback(), usedAI: false, aiError: 'budget' }
  try {
    return { value: await ai(), usedAI: true }
  } catch (error) {
    console.error('Appel IA en échec, bascule en mode sans IA :', error instanceof Error ? error.message : error)
    return { value: await fallback(), usedAI: false, aiError: 'failed' }
  }
}

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 })
}

/** Client et modèle à jour des réglages (le client est recréé si la clé change). */
export async function getClient(): Promise<{ client: Anthropic; model: string }> {
  const { apiKey, model } = await getAIConfig()
  if (!apiKey) throw new Error('Aucune clé d’API IA configurée')
  if (!client || client.apiKey !== apiKey) client = { apiKey, instance: makeClient(apiKey) }
  return { client: client.instance, model }
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
  const { client, model } = await getClient()
  const response = await client.beta.messages.create({
    model,
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
  const { client, model } = await getClient()
  const response = await client.beta.messages.parse({
    model,
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
