import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { clientIp, rateLimited } from '@/lib/stand'
import { runAssistant } from '@/lib/agents/assistant'

const ChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === 'user', 'Le dernier message doit venir du visiteur'),
})

// Assistant public du stand (agent c).
export async function POST(request: NextRequest) {
  // Tous les téléphones du salon partagent souvent la même IP : limite large par IP,
  // limite serrée par téléphone (identifiant anonyme envoyé par la page).
  const device = (request.headers.get('x-device-id') ?? '').slice(0, 64) || 'inconnu'
  if (rateLimited(`assistant-ip:${clientIp(request.headers)}`, 1500, 10 * 60 * 1000) || rateLimited(`assistant-device:${device}`, 25, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Beaucoup de questions en peu de temps : réessayez dans quelques minutes.' }, { status: 429 })
  }
  const parsed = ChatSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  try {
    return NextResponse.json(await runAssistant(parsed.data.messages))
  } catch (error) {
    console.error('assistant', error)
    return NextResponse.json({ error: 'L’assistant est momentanément indisponible. L’équipe du stand peut vous répondre.' }, { status: 502 })
  }
}
