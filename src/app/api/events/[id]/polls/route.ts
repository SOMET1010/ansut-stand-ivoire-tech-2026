import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { db } from '@/lib/db'

// GET /api/events/[id]/polls - Récupérer tous les sondages d'un événement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const { searchParams } = new URL(request.url)
    const panelId = searchParams.get('panelId')

    const whereClause: any = {
      panel: {
        eventId: id
      }
    }

    if (panelId) {
      whereClause.panelId = panelId
    }

    const polls = await db.poll.findMany({
      where: whereClause,
      include: {
        panel: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true
          }
        },
        options: {
          include: {
            responses: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les votes et pourcentages
    const pollsWithStats = polls.map(poll => {
      const totalVotes = poll.options.reduce((sum, option) => sum + option.responses.length, 0)
      
      const optionsWithStats = poll.options.map(option => ({
        ...option,
        votes: option.responses.length,
        percentage: totalVotes > 0 ? Math.round((option.responses.length / totalVotes) * 100) : 0
      }))

      return {
        ...poll,
        totalVotes,
        options: optionsWithStats
      }
    })

    return NextResponse.json(pollsWithStats)
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/polls - Créer un nouveau sondage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff()
  if (staff instanceof NextResponse) return staff
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { question, description, panelId, isAnonymous, allowMultipleVotes, options } = body

    if (!question || !panelId || !options || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields or insufficient options' },
        { status: 400 }
      )
    }

    // Vérifier que le panel appartient à l'événement
    const panel = await db.panel.findFirst({
      where: {
        id: panelId,
        eventId: id
      }
    })

    if (!panel) {
      return NextResponse.json(
        { error: 'Panel not found or does not belong to this event' },
        { status: 404 }
      )
    }

    // Créer le sondage avec ses options
    const poll = await db.poll.create({
      data: {
        question,
        description,
        panelId,
        isAnonymous: isAnonymous || false,
        allowMultipleVotes: allowMultipleVotes || false,
        options: {
          create: options.map((optionText: string, index: number) => ({
            text: optionText,
            order: index
          }))
        }
      },
      include: {
        panel: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true
          }
        },
        options: {
          include: {
            responses: true
          }
        }
      }
    })

    // Calculer les stats initiales
    const totalVotes = poll.options.reduce((sum, option) => sum + option.responses.length, 0)
    const optionsWithStats = poll.options.map(option => ({
      ...option,
      votes: option.responses.length,
      percentage: 0
    }))

    const pollWithStats = {
      ...poll,
      totalVotes,
      options: optionsWithStats
    }

    return NextResponse.json(pollWithStats)
  } catch (error) {
    console.error('Error creating poll:', error)
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    )
  }
}