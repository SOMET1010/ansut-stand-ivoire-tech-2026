import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { containsText, db } from '@/lib/db'
import QRCode from 'qrcode'

interface WhereClause {
  OR?: Array<{
    title?: { contains: string; mode?: 'insensitive' }
    description?: { contains: string; mode?: 'insensitive' }
    location?: { contains: string; mode?: 'insensitive' }
  }>
  isActive?: boolean
  isPublic?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: WhereClause = {}
    
    if (search) {
      where.OR = [
        { title: containsText(search) },
        { description: containsText(search) },
        { location: containsText(search) }
      ]
    }

    if (status) {
      switch (status) {
        case 'active':
          where.isActive = true
          break
        case 'inactive':
          where.isActive = false
          break
        case 'public':
          where.isPublic = true
          break
        case 'private':
          where.isPublic = false
          break
      }
    }

    const [events, total] = await Promise.all([
      db.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          program: true,
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
      }),
      db.event.count({ where })
    ])

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, startDate, endDate, location, isPublic, isActive, organizerId, slug, maxAttendees } = await request.json()

    if (!title || !startDate) {
      return NextResponse.json({ error: 'Title and start date are required' }, { status: 400 })
    }

    // Generate slug from title if not provided
    const eventSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingEvent = await db.event.findUnique({
      where: { slug: eventSlug }
    })

    if (existingEvent) {
      return NextResponse.json({ error: 'Event with this title already exists' }, { status: 400 })
    }

    // Generate QR Code
    const qrCodeData = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/e/${eventSlug}`
    const qrCode = await QRCode.toDataURL(qrCodeData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Create event
    const event = await db.event.create({
      data: {
        title,
        description,
        slug: eventSlug,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location,
        isPublic: isPublic ?? true,
        isActive: isActive ?? false,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        qrCode,
        organizerId: organizerId || session.user.id,
        branding: {
          qrCode
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        program: true,
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
    console.error('Failed to create event:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}