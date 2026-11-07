import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/stand'
import { db } from '@/lib/db'

// GET /api/events/[id]/feedback - Récupérer tous les feedbacks d'un événement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const rating = searchParams.get('rating')
    const resolved = searchParams.get('resolved')

    const whereClause: any = {
      eventId: id
    }

    if (category) {
      whereClause.category = category
    }

    if (rating) {
      whereClause.rating = parseInt(rating)
    }

    if (resolved !== null) {
      whereClause.resolved = resolved === 'true'
    }

    const feedbacks = await db.feedback.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        helpfulVotes: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les votes utiles
    const feedbacksWithVotes = feedbacks.map(feedback => ({
      ...feedback,
      helpful: feedback.helpfulVotes.length
    }))

    return NextResponse.json(feedbacksWithVotes)
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedbacks' },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/feedback - Créer un nouveau feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireUser()
  if (sessionUser instanceof NextResponse) return sessionUser
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    // Identité prise dans la session, jamais dans le corps de la requête
    const userId = sessionUser.id
    const { rating, comment, category } = body

    if (!userId || !rating || !category) {
      return NextResponse.json(
        { error: 'UserId, rating, and category are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur a participé à l'événement
    const registration = await db.eventRegistration.findFirst({
      where: {
        userId,
        eventId: id,
        attended: true
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'User did not attend the event' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur a déjà laissé un feedback
    const existingFeedback = await db.feedback.findFirst({
      where: {
        userId,
        eventId: id
      }
    })

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'User has already submitted feedback for this event' },
        { status: 400 }
      )
    }

    const feedback = await db.feedback.create({
      data: {
        userId,
        eventId: id,
        rating,
        comment: comment || null,
        category,
        resolved: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        helpfulVotes: true
      }
    })

    const feedbackWithVotes = {
      ...feedback,
      helpful: feedback.helpfulVotes.length
    }

    return NextResponse.json(feedbackWithVotes)
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to create feedback' },
      { status: 500 }
    )
  }
}