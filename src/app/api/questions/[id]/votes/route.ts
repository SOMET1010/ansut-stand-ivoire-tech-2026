import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/stand'
import { db } from '@/lib/db'

// POST /api/questions/[id]/votes - Ajouter ou modifier un vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireUser()
  if (sessionUser instanceof NextResponse) return sessionUser
  const resolvedParams = await params
  const { id } = resolvedParams
  try {
    const body = await request.json()
    // Identité prise dans la session, jamais dans le corps de la requête
    const userId = sessionUser.id
    const { type } = body

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing userId or type' },
        { status: 400 }
      )
    }

    if (type !== 'UP' && type !== 'DOWN') {
      return NextResponse.json(
        { error: 'Type must be UP or DOWN' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur a déjà voté pour cette question
    const existingVote = await db.questionVote.findUnique({
      where: {
        questionId_userId: {
          questionId: id,
          userId
        }
      }
    })

    let vote

    if (existingVote) {
      if (existingVote.type === type) {
        // Si le vote est le même, le supprimer (toggle)
        vote = await db.questionVote.delete({
          where: {
            questionId_userId: {
              questionId: id,
              userId
            }
          }
        })
      } else {
        // Si le vote est différent, le mettre à jour
        vote = await db.questionVote.update({
          where: {
            questionId_userId: {
              questionId: id,
              userId
            }
          },
          data: { type }
        })
      }
    } else {
      // Créer un nouveau vote
      vote = await db.questionVote.create({
        data: {
          questionId: id,
          userId,
          type
        }
      })
    }

    return NextResponse.json(vote)
  } catch (error) {
    console.error('Error handling vote:', error)
    return NextResponse.json(
      { error: 'Failed to handle vote' },
      { status: 500 }
    )
  }
}

// GET /api/questions/[id]/votes - Récupérer les votes d'une question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { id } = resolvedParams
  try {
    const votes = await db.questionVote.findMany({
      where: { questionId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(votes)
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}