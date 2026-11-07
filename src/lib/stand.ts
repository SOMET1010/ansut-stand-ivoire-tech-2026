// Logique métier du stand ANSUT : accès équipe, statuts, base de connaissance publique.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EVENT, STAND_SESSIONS } from '@/config/event'


export type StaffRole = 'ADMIN' | 'ORGANIZER'

export interface SessionUser { id: string; email: string; role: string }

/** Utilisateur connecté (identité prise dans la session, jamais dans la requête), ou une réponse 401. */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user?.id || !user.email) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  return { id: user.id, email: user.email, role: user.role ?? 'ATTENDEE' }
}

/** Membre de l'équipe (ADMIN ou ORGANIZER) connecté, ou une réponse 401/403. */
export async function requireStaff(): Promise<{ id: string; role: StaffRole; email: string } | NextResponse> {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') return NextResponse.json({ error: 'Accès réservé à l’équipe' }, { status: 403 })
  return { id: user.id, role: user.role, email: user.email }
}

/** L'événement du stand ne peut pas être supprimé (cascade : séquences, invitations, présences). */
export function protectedEventResponse(eventId: string): NextResponse | null {
  return eventId === EVENT.id
    ? NextResponse.json({ error: 'L’événement du stand ANSUT ne peut pas être supprimé' }, { status: 409 })
    : null
}

/** Seul le DG (rôle ADMIN) peut valider ou refuser une invitation. */
export function canValidate(role: StaffRole) {
  return role === 'ADMIN'
}

/** Rate limit mémoire simple par clé (IP) pour les routes publiques. */
const buckets = new Map<string, { count: number; start: number }>()
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { count: 1, start: now })
    return false
  }
  b.count++
  return b.count > max
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
}

/** Seules informations que l'assistant public a le droit d'utiliser. */
export function publicKnowledge(): string {
  const program = STAND_SESSIONS.map((s) => `- ${s.day} · ${s.time} · ${s.location} : ${s.title} (pilote : ${s.pilot})`).join('\n')
  return [
    `Événement : ${EVENT.shortTitle}, ${EVENT.dates}, ${EVENT.location}.`,
    `Organisateur du stand : ${EVENT.organizer} (${EVENT.organizerLong}). Site : ${EVENT.website}.`,
    `Signature : « ${EVENT.tagline} ».`,
    'Programme du stand :',
    program,
    'Services de la plateforme : inscription au stand (/register), programme (/program), questions en direct, sondages, pointage par QR code à chaque séquence, attestation de visite.',
  ].join('\n')
}

/** Courrier d'invitation par modèle (sans IA). */
export function templateLetter(p: { partner: string; contact?: string | null; title: string; day: string; time: string; location: string }) {
  const destinataire = p.contact ? `${p.contact}, ${p.partner}` : p.partner
  return `À l’attention de : ${destinataire}

Objet : Invitation – ${p.title} – Stand ANSUT, Ivoire Tech Forum 2026

Madame, Monsieur,

L’Agence Nationale du Service Universel des Télécommunications-TIC (ANSUT) a le plaisir de vous convier, au titre de ${p.partner}, à la séquence « ${p.title} » organisée dans le cadre de l’Ivoire Tech Forum 2026.

Date et heure : ${p.day}, ${p.time}
Lieu : ${p.location}, ${EVENT.location}

Votre participation contribuera à la réussite de ce temps fort placé sous le thème « ${EVENT.tagline} ».

Dans l’attente de votre confirmation, nous vous prions d’agréer, Madame, Monsieur, l’expression de notre haute considération.

Le Directeur Général de l’ANSUT`
}
