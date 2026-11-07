import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/stand'
import { db } from '@/lib/db'

// POST /api/polls/[pollId]/votes - Ajouter ou modifier un vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireUser()
  if (sessionUser instanceof NextResponse) return sessionUser
  try {
    const resolvedParams = await params
    const { id: pollId } = resolvedParams
    const body = await request.json()
    // Identité prise dans la session, jamais dans le corps de la requête
    const userId = sessionUser.id
    const { optionIds } = body

    if (!userId || !optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing userId or optionIds' },
        { status: 400 }
      )
    }

    // Récupérer le sondage pour vérifier s'il accepte les votes multiples
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true
      }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Vérifier que le sondage est actif
    if (!poll.isActive) {
      return NextResponse.json(
        { error: 'Poll is not active' },
        { status: 400 }
      )
    }

    // Vérifier les contraintes de votes
    if (!poll.allowMultipleVotes && optionIds.length > 1) {
      return NextResponse.json(
        { error: 'This poll does not allow multiple votes' },
        { status: 400 }
      )
    }

    // Vérifier que toutes les options existent et appartiennent au sondage
    const validOptions = poll.options.filter(option => optionIds.includes(option.id))
    if (validOptions.length !== optionIds.length) {
      return NextResponse.json(
        { error: 'One or more invalid options' },
        { status: 400 }
      )
    }

    // Récupérer les votes existants de l'utilisateur pour ce sondage
    const existingVotes = await db.pollResponse.findMany({
      where: {
        pollId: pollId,
        userId
      }
    })

    // Pour les votes uniques, supprimer l'ancien vote s'il existe
    if (!poll.allowMultipleVotes && existingVotes.length > 0) {
      await db.pollResponse.deleteMany({
        where: {
          pollId: pollId,
          userId
        }
      })
    }

    // Pour les votes multiples, supprimer seulement les votes pour les options désélectionnées
    if (poll.allowMultipleVotes) {
      const existingOptionIds = existingVotes.map(vote => vote.optionId)
      const optionsToRemove = existingOptionIds.filter(id => !optionIds.includes(id))
      
      if (optionsToRemove.length > 0) {
        await db.pollResponse.deleteMany({
          where: {
            pollId: pollId,
            userId,
            optionId: {
              in: optionsToRemove
            }
          }
        })
      }
    }

    // Créer les nouveaux votes (uniquement pour les options qui n'ont pas déjà été votées)
    const existingOptionIds = existingVotes.map(vote => vote.optionId)
    const newOptionIds = optionIds.filter(id => !existingOptionIds.includes(id))

    if (newOptionIds.length > 0) {
      await db.pollResponse.createMany({
        data: newOptionIds.map(optionId => ({
          pollId: pollId,
          optionId,
          userId
        }))
      })
    }

    // Récupérer le sondage mis à jour avec les stats
    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            responses: true
          }
        }
      }
    })

    if (!updatedPoll) {
      return NextResponse.json(
        { error: 'Failed to fetch updated poll' },
        { status: 500 }
      )
    }

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
    console.error('Error handling vote:', error)
    return NextResponse.json(
      { error: 'Failed to handle vote' },
      { status: 500 }
    )
  }
}

// GET /api/polls/[pollId]/votes - Récupérer les votes d'un sondage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id: pollId } = resolvedParams
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const responses = await db.pollResponse.findMany({
      where: { pollId: pollId },
      include: {
        user: userId ? {
          select: {
            id: true,
            name: true,
          }
        } : false,
        option: {
          select: {
            id: true,
            text: true
          }
        }
      }
    })

    return NextResponse.json(responses)
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}