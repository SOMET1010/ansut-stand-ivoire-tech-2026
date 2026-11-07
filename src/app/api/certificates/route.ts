import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireUser } from '@/lib/stand'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/certificates - Générer un nouveau certificat pour l'utilisateur authentifié
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user?.role !== 'ORGANIZER' && session.user?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, eventId } = body
    const userId = session.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }

    if (!templateId || !eventId) {
      return NextResponse.json(
        { error: 'TemplateId and eventId are required' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur est inscrit et a participé à l'événement
    const registration = await db.eventRegistration.findFirst({
      where: {
        userId,
        eventId,
        attended: true
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'User did not attend the event' },
        { status: 400 }
      )
    }

    // Vérifier si un certificat existe déjà pour ce modèle et utilisateur
    const existingCertificate = await db.certificate.findFirst({
      where: {
        templateId,
        userId
      }
    })

    if (existingCertificate) {
      return NextResponse.json(
        { error: 'Certificate already exists for this user and template' },
        { status: 400 }
      )
    }

    // Récupérer le modèle pour obtenir le contenu
    const template = await db.certificateTemplate.findUnique({
      where: { id: templateId },
      include: {
        event: {
          include: {
            organizer: true
          }
        },
        user: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Récupérer les informations de l'utilisateur
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Générer le contenu du certificat en remplaçant les variables
    let content = template.content
    const issuedAt = new Date()

    content = content
      .replace('[NOM DU PARTICIPANT]', user.name || 'Participant')
      .replace('[TITRE DE L\'ÉVÉNEMENT]', template.event.title)
      .replace('[DATE DE DÉBUT]', template.event.startDate.toLocaleDateString('fr-FR'))
      .replace('[DATE DE FIN]', template.event.endDate?.toLocaleDateString('fr-FR') || '')
      .replace('[DATE DE DÉLIVRANCE]', issuedAt.toLocaleDateString('fr-FR'))
      .replace('[ORGANISATEUR]', template.event.organizer?.name || 'Organisateur')

    // Générer un URL unique pour le certificat (simulation)
    const certificateUrl = `/certificates/${templateId}_${userId}_${Date.now()}.pdf`
    const qrCodeUrl = `/qrcodes/${templateId}_${userId}_${Date.now()}.png`

    // Créer le certificat
    const certificate = await db.certificate.create({
      data: {
        templateId,
        userId,
        eventId,
        content,
        issuedAt,
        certificateUrl,
        qrCodeUrl
      },
      include: {
        template: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    return NextResponse.json(certificate)
  } catch (error) {
    console.error('Error generating certificate:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    )
  }
}

// GET /api/certificates - Récupérer les certificats (avec filtres)
export async function GET(request: NextRequest) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  try {
    const { searchParams } = new URL(request.url)
    const isStaff = user.role === 'ADMIN' || user.role === 'ORGANIZER'
    // Un participant ne voit que ses propres attestations
    const userId = isStaff ? searchParams.get('userId') : user.id
    const eventId = searchParams.get('eventId')
    const templateId = searchParams.get('templateId')

    const whereClause: any = {}

    if (userId) whereClause.userId = userId
    if (eventId) whereClause.eventId = eventId
    if (templateId) whereClause.templateId = templateId

    const certificates = await db.certificate.findMany({
      where: whereClause,
      include: {
        template: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        issuedAt: 'desc'
      }
    })

    return NextResponse.json(certificates)
  } catch (error) {
    console.error('Error fetching certificates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    )
  }
}