import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { db } from '@/lib/db'

// POST /api/feedback/[feedbackId]/resolve - Marquer un feedback comme résolu/non résolu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const staff = await requireStaff()
  if (staff instanceof NextResponse) return staff
  try {
    const resolvedParams = await params
    const body = await request.json()
    const { resolved } = body

    if (typeof resolved !== 'boolean') {
      return NextResponse.json(
        { error: 'Resolved must be a boolean' },
        { status: 400 }
      )
    }

    const feedback = await db.feedback.update({
      where: { id: resolvedParams.feedbackId },
      data: { resolved },
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
    console.error('Error updating feedback resolved status:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback resolved status' },
      { status: 500 }
    )
  }
}