import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { db } from '@/lib/db'

// GET /api/events/[id]/certificate-templates - Récupérer tous les modèles de certificats d'un événement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const templates = await db.certificateTemplate.findMany({
      where: { eventId: resolvedParams.id },
      include: {
        certificates: {
          select: {
            id: true,
            issuedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer le nombre de certificats délivrés
    const templatesWithStats = templates.map(template => ({
      ...template,
      issuedCount: template.certificates.length
    }))

    return NextResponse.json(templatesWithStats)
  } catch (error) {
    console.error('Error fetching certificate templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificate templates' },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/certificate-templates - Créer un nouveau modèle de certificat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff()
  if (staff instanceof NextResponse) return staff
  const resolvedParams = await params
  try {
    const body = await request.json()
    const { title, description, content, autoGenerate } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const template = await db.certificateTemplate.create({
      data: {
        title,
        description,
        content,
        autoGenerate: autoGenerate || false,
        eventId: resolvedParams.id
      },
      include: {
        certificates: {
          select: {
            id: true,
            issuedAt: true
          }
        }
      }
    })

    const templateWithStats = {
      ...template,
      issuedCount: template.certificates.length
    }

    return NextResponse.json(templateWithStats)
  } catch (error) {
    console.error('Error creating certificate template:', error)
    return NextResponse.json(
      { error: 'Failed to create certificate template' },
      { status: 500 }
    )
  }
}