import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { db } from '@/lib/db'

// GET /api/polls/[pollId] - Récupérer un sondage spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id: pollId } = resolvedParams

    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        panel: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            eventId: true
          }
        },
        options: {
          include: {
            responses: true
          }
        }
      }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Calculer les stats
    const totalVotes = poll.options.reduce((sum, option) => sum + option.responses.length, 0)
    const optionsWithStats = poll.options.map(option => ({
      ...option,
      votes: option.responses.length,
      percentage: totalVotes > 0 ? Math.round((option.responses.length / totalVotes) * 100) : 0
    }))

    const pollWithStats = {
      ...poll,
      totalVotes,
      options: optionsWithStats
    }

    return NextResponse.json(pollWithStats)
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json(
      { error: 'Failed to fetch poll' },
      { status: 500 }
    )
  }
}

// PATCH /api/polls/[pollId] - Mettre à jour un sondage
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff()
  if (staff instanceof NextResponse) return staff
  try {
    const resolvedParams = await params
    const { id: pollId } = resolvedParams
    const body = await request.json()
    const { isActive, question, description, isAnonymous, allowMultipleVotes } = body

    const poll = await db.poll.findUnique({
      where: { id: pollId }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    const updatedPoll = await db.poll.update({
      where: { id: pollId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(question !== undefined && { question }),
        ...(description !== undefined && { description }),
        ...(isAnonymous !== undefined && { isAnonymous }),
        ...(allowMultipleVotes !== undefined && { allowMultipleVotes })
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

    // Calculer les stats
    const totalVotes = updatedPoll.options.reduce((sum, option) => sum + option.responses.length, 0)
    const optionsWithStats = updatedPoll.options.map(option => ({
      ...option,
      votes: option.responses.length,
      percentage: totalVotes > 0 ? Math.round((option.responses.length / totalVotes) * 100) : 0
    }))

    const pollWithStats = {
      ...updatedPoll,
      totalVotes,
      options: optionsWithStats
    }

    return NextResponse.json(pollWithStats)
  } catch (error) {
    console.error('Error updating poll:', error)
    return NextResponse.json(
      { error: 'Failed to update poll' },
      { status: 500 }
    )
  }
}

// DELETE /api/polls/[pollId] - Supprimer un sondage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff()
  if (staff instanceof NextResponse) return staff
  try {
    const resolvedParams = await params
    const { id: pollId } = resolvedParams

    const poll = await db.poll.findUnique({
      where: { id: pollId }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Supprimer d'abord les options et réponses associées
    await db.pollOption.deleteMany({
      where: { pollId }
    })

    // Puis supprimer le sondage
    await db.poll.delete({
      where: { id: pollId }
    })

    return NextResponse.json({ message: 'Poll deleted successfully' })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json(
      { error: 'Failed to delete poll' },
      { status: 500 }
    )
  }
}