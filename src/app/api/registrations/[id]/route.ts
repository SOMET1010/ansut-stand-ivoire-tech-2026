import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { id } = resolvedParams
  try {
    const registration = await db.eventRegistration.findFirst({
      where: {
        id: id,
        isPublic: true
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            program: true
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Inscription non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      registration: {
        id: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        registeredAt: registration.createdAt,
        event: registration.event
      }
    })
  } catch (error) {
    console.error("Erreur lors de la récupération de l'inscription:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    )
  }
}
