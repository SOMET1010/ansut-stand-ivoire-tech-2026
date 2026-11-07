import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { containsText, db } from '@/lib/db'

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
    const role = searchParams.get('role') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { email: containsText(search) },
        { name: containsText(search) }
      ]
    }

    if (role && role !== 'all') {
      where.role = role
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              eventRegistrations: true,
              organizedEvents: true,
              pollResponses: true,
              feedbacks: true,
              certificates: true
            }
          }
        }
      }),
      db.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name, role } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Create new user
    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        role: role || 'ATTENDEE'
      },
      include: {
        _count: {
          select: {
            eventRegistrations: true,
            organizedEvents: true,
            pollResponses: true,
            feedbacks: true,
            certificates: true
          }
        }
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}