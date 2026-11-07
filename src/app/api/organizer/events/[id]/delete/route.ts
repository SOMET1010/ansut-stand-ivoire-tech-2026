import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { protectedEventResponse } from '@/lib/stand'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const locked = protectedEventResponse(id)
  if (locked) return locked

  try {
    // Vérifier que l'événement appartient à l'organisateur
    const event = await db.event.findUnique({
      where: { id },
      select: { organizerId: true }
    })

    if (!event || event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Not event owner' },
        { status: 403 }
      )
    }

    // Vérifier les dépendances avant suppression
    const dependencies = await db.$transaction([
      db.eventRegistration.count({ where: { eventId: id } }),
      db.feedback.count({ where: { eventId: id } }),
      db.certificate.count({ where: { eventId: id } })
    ])

    if (dependencies.some(count => count > 0)) {
      return NextResponse.json(
        { error: 'Event has dependencies and cannot be deleted' },
        { status: 400 }
      )
    }

    await db.event.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Event deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}