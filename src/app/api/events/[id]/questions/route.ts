import { NextRequest, NextResponse } from 'next/server'
import { containsText, db } from '@/lib/db'
import { clientIp, rateLimited } from '@/lib/stand'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/events/[id]/questions - Récupérer toutes les questions d'un événement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const { searchParams } = new URL(request.url)
    const panelId = searchParams.get('panelId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const whereClause: any = {
      panel: {
        eventId: id
      }
    }

    if (panelId) {
      whereClause.panelId = panelId
    }

    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase()
    }

    if (search) {
      whereClause.OR = [
        { content: containsText(search) },
        { authorName: containsText(search) }
      ]
    }

    const questions = await db.question.findMany({
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
        votes: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les votes
    // L'e-mail de l'auteur et le détail des votes ne sont visibles que par l'équipe
    const session = await getServerSession(authOptions)
    const isStaff = session?.user?.role === 'ADMIN' || session?.user?.role === 'ORGANIZER'
    const questionsWithVotes = questions.map(({ authorEmail, votes, ...question }) => ({
      ...question,
      ...(isStaff ? { authorEmail, votes } : {}),
      upvotes: votes.filter(vote => vote.type === 'UP').length,
      downvotes: votes.filter(vote => vote.type === 'DOWN').length
    }))

    return NextResponse.json(questionsWithVotes)
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/questions - Créer une nouvelle question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (rateLimited(`question:${clientIp(request.headers)}`, 600, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Beaucoup de questions envoyées depuis ce réseau, réessayez dans quelques minutes' }, { status: 429 })
    }
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { content, panelId, authorName, authorEmail } = body

    if (!content || !panelId || !authorName || typeof content !== 'string' || content.length > 500 || String(authorName).length > 80) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const question = await db.question.create({
      data: {
        content,
        panelId,
        authorName,
        authorEmail: typeof authorEmail === 'string' ? authorEmail.slice(0, 120) : '',
        status: 'PENDING'
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
        votes: true
      }
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error('Error creating question:', error)
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    )
  }
}