// Réglages de la plateforme saisis dans l'administration et stockés en base.
// Les secrets (clé d'API IA) sont chiffrés en AES-256-GCM avec une clé dérivée de NEXTAUTH_SECRET :
// une copie de la base seule ne suffit pas à les lire.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'

export const SETTING_KEYS = {
  anthropicApiKey: 'ai.anthropic.apiKey',
  anthropicModel: 'ai.anthropic.model',
} as const

function secretKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET manquant : impossible de chiffrer les réglages')
  return createHash('sha256').update(`app-settings:${secret}`).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

export function decryptSecret(stored: string): string | null {
  try {
    const [v, iv, tag, data] = stored.split(':')
    if (v !== 'v1') return null
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    // NEXTAUTH_SECRET changé ou valeur corrompue : la clé est considérée absente
    return null
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function setSetting(key: string, value: string | null, updatedBy?: string) {
  if (value === null || value === '') {
    await db.appSetting.deleteMany({ where: { key } })
    return
  }
  await db.appSetting.upsert({ where: { key }, create: { key, value, updatedBy }, update: { value, updatedBy } })
}
