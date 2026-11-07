import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams

    // Récupérer l'événement par son slug
    const event = await db.event.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            registrations: {
              where: {
                isPublic: true
              }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si l'événement est public
    if (!event.isPublic) {
      return NextResponse.json(
        { error: 'Événement non public' },
        { status: 403 }
      )
    }

    // Formater la réponse
    const eventResponse = {
      id: event.id,
      title: event.title,
      description: event.description,
      slug: event.slug,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      isActive: event.isActive,
      program: event.program,
      qrCode: event.qrCode,
      maxAttendees: event.maxAttendees,
      registeredCount: event._count.registrations,
      organizer: event.organizer,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }

    return NextResponse.json(eventResponse)

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la récupération de l\'événement' },
      { status: 500 }
    )
  }
}