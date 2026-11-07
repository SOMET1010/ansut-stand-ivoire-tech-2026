import { NextRequest, NextResponse } from 'next/server'
import { protectedEventResponse } from '@/lib/stand'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await db.event.findUnique({
      where: { id: resolvedParams.id },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        panels: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: {
                questions: true
              }
            }
          }
        },
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            registrations: true,
            questions: true,
            polls: true,
            feedbacks: true,
            certificates: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, startDate, endDate, location, isPublic, isActive, organizerId } = await request.json()

    interface UpdateData {
      title?: string
      slug?: string
      description?: string
      startDate?: Date
      endDate?: Date | null
      location?: string
      isPublic?: boolean
      isActive?: boolean
      organizerId?: string
    }

    const updateData: UpdateData = {}
    if (title !== undefined) {
      updateData.title = title
      // Update slug if title changes
      updateData.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    }
    if (description !== undefined) updateData.description = description
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (location !== undefined) updateData.location = location
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (isActive !== undefined) updateData.isActive = isActive
    if (organizerId !== undefined) updateData.organizerId = organizerId

    const event = await db.event.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            registrations: true,
            questions: true,
            polls: true,
            feedbacks: true,
            certificates: true
          }
        }
      }
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Failed to update event:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const locked = protectedEventResponse(resolvedParams.id)
    if (locked) return locked

    // Delete related data first due to foreign key constraints
    await db.$transaction([
      db.eventRegistration.deleteMany({
        where: { eventId: resolvedParams.id }
      }),
      db.question.deleteMany({
        where: { eventId: resolvedParams.id }
      }),
      db.poll.deleteMany({
        where: { eventId: resolvedParams.id }
      }),
      db.feedback.deleteMany({
        where: { eventId: resolvedParams.id }
      }),
      db.certificate.deleteMany({
        where: { eventId: resolvedParams.id }
      }),
      db.panel.deleteMany({
        where: { eventId: resolvedParams.id }
      }),
      db.event.delete({
        where: { id: resolvedParams.id }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}