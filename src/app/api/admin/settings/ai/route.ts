import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DEFAULT_AI_MODEL, getAIConfig, invalidateAIConfig, makeClient } from '@/lib/ai'
import { SETTING_KEYS, encryptSecret, setSetting } from '@/lib/settings'

// Réglages IA (Direction générale uniquement). La clé n'est jamais renvoyée en clair.

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé à la Direction générale' }, { status: 403 })
  }
  return session
}

function mask(key: string | null) {
  if (!key) return null
  return `${key.slice(0, 7)}…${key.slice(-4)}`
}

async function status() {
  invalidateAIConfig()
  const config = await getAIConfig()
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEYS.anthropicApiKey } })
  return {
    enabled: Boolean(config.apiKey),
    source: config.source,
    maskedKey: mask(config.apiKey),
    model: config.model,
    defaultModel: DEFAULT_AI_MODEL,
    updatedAt: config.source === 'admin' ? row?.updatedAt ?? null : null,
    updatedBy: config.source === 'admin' ? row?.updatedBy ?? null : null,
  }
}

const apiKeySchema = z.string().trim().min(20, 'Clé trop courte').max(300).regex(/^\S+$/, 'La clé ne doit pas contenir d’espace')
const modelSchema = z.string().trim().min(3).max(100).regex(/^[\w.\-:]+$/, 'Nom de modèle invalide')

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(await status())
}

// Enregistre la clé et/ou le modèle. clearKey retire la clé saisie (retour à l'environnement).
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const parsed = z
    .object({ apiKey: apiKeySchema.optional(), model: z.union([modelSchema, z.literal('')]).optional(), clearKey: z.boolean().optional() })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })
  const by = auth.user?.email ?? undefined
  const { apiKey, model, clearKey } = parsed.data
  if (clearKey) await setSetting(SETTING_KEYS.anthropicApiKey, null)
  else if (apiKey) await setSetting(SETTING_KEYS.anthropicApiKey, encryptSecret(apiKey), by)
  if (model !== undefined) await setSetting(SETTING_KEYS.anthropicModel, model || null, by)
  return NextResponse.json(await status())
}

// Teste une clé (celle saisie, sinon celle en vigueur) sans rien enregistrer ni consommer de jetons.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => ({}))
  const parsed = z.object({ apiKey: apiKeySchema.optional(), model: z.union([modelSchema, z.literal('')]).optional() }).safeParse(body ?? {})
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })
  invalidateAIConfig()
  const current = await getAIConfig()
  const apiKey = parsed.data.apiKey || current.apiKey
  const model = parsed.data.model || current.model
  if (!apiKey) return NextResponse.json({ ok: false, error: 'Aucune clé à tester' }, { status: 400 })
  try {
    const info = await makeClient(apiKey).models.retrieve(model, {}, { timeout: 15_000, maxRetries: 0 })
    return NextResponse.json({ ok: true, model: info.id, modelName: info.display_name })
  } catch (error) {
    const statusCode = (error as { status?: number }).status
    const message =
      statusCode === 401 ? 'Clé refusée par Anthropic (invalide ou révoquée)'
      : statusCode === 403 ? 'Clé sans droit d’accès à ce modèle'
      : statusCode === 404 ? `Modèle « ${model} » introuvable pour cette clé`
      : 'Service Anthropic injoignable depuis le serveur'
    return NextResponse.json({ ok: false, error: message })
  }
}
