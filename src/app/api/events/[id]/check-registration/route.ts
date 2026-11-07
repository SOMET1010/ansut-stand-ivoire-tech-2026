import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff()
  if (staff instanceof NextResponse) return staff
  const resolvedParams = await params
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'L\'email est requis' },
        { status: 400 }
      )
    }

    const eventId = resolvedParams.id

    // Vérifier si l'événement existe
    const event = await db.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier l'inscription
    const registration = await db.eventRegistration.findFirst({
      where: {
        eventId,
        email,
        isPublic: true
      }
    })

    if (!registration) {
      return NextResponse.json({
        isRegistered: false,
        message: 'Non inscrit à cet événement'
      })
    }

    return NextResponse.json({
      isRegistered: true,
      registration: {
        id: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        registeredAt: registration.createdAt
      },
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        program: event.program
      }
    })

  } catch (error) {
    console.error('Erreur lors de la vérification d\'inscription:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la vérification' },
      { status: 500 }
    )
  }
}