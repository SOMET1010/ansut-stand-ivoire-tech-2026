import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const CreateEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, 'slug : minuscules, chiffres et tirets'),
  description: z.string().max(5000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  location: z.string().max(200).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  maxAttendees: z.number().int().positive().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const events = await prisma.event.findMany({
      where: { organizerId: session.user.id },
    })
    return NextResponse.json(events)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (session.user.role !== 'ORGANIZER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé à l’équipe' }, { status: 403 })
    }

    // Uniquement les champs listés : jamais le corps brut (relations imbriquées, organizerId…)
    const parsed = CreateEventSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
    }
    const { startDate, endDate, ...rest } = parsed.data
    const event = await prisma.event.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        organizerId: session.user.id,
      },
    })
    return NextResponse.json(event)
  } catch {
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}