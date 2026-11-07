import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const events = await db.event.findMany({
      where: {
        isPublic: true
        // startDate: {
        //   gte: new Date()
        // }
      },
      include: {
        _count: {
          select: {
            registrations: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      skip: offset,
      take: limit
    })

    const total = await db.event.count({
      where: {
        isPublic: true
        // startDate: {
        //   gte: new Date()
        // }
      }
    })

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
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'ORGANIZER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const eventSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      startDate: z
        .string()
        .refine(v => !isNaN(Date.parse(v)), { message: 'Invalid start date' }),
      endDate: z
        .string()
        .optional()
        .refine(v => !v || !isNaN(Date.parse(v)), { message: 'Invalid end date' }),
      location: z.string().optional(),
      slug: z.string().optional(),
      isPublic: z.boolean().optional(),
      isActive: z.boolean().optional(),
      maxAttendees: z
        .string()
        .optional()
        .transform(v => (v === undefined || v === '' ? undefined : v))
        .refine(v => v === undefined || !isNaN(Number(v)), {
          message: 'Invalid maxAttendees'
        })
        .transform(v => (v === undefined ? undefined : Number(v)))
    })

    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(issue => issue.message)
      return NextResponse.json(
        { error: 'Invalid input', details: errors },
        { status: 400 }
      )
    }

    const {
      title,
      description,
      startDate,
      endDate,
      location,
      slug,
      isPublic,
      isActive,
      maxAttendees
    } = parsed.data

    const eventSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const existingEvent = await db.event.findUnique({
      where: { slug: eventSlug }
    })

    if (existingEvent) {
      return NextResponse.json(
        { error: 'Event with this slug already exists' },
        { status: 400 }
      )
    }

    const qrCodeData = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/e/${eventSlug}`
    const qrCode = await QRCode.toDataURL(qrCodeData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    const event = await db.event.create({
      data: {
        title,
        description,
        slug: eventSlug,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location,
        organizerId: session.user.id,
        isPublic: isPublic ?? true,
        isActive: isActive ?? false,
        maxAttendees: typeof maxAttendees === 'number' ? maxAttendees : null,
        qrCode,
        branding: {
          qrCode
        }
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}