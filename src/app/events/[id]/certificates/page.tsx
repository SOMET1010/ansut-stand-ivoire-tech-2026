'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Award,
  Download,
  Mail,
  QrCode,
  CheckCircle,
  Clock,
  FileText,
  Share2
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface UserCertificate {
  id: string
  title: string
  description: string
  issuedAt: string
  certificateUrl: string
  qrCodeUrl: string
  eventTitle: string
  eventDate: string
  organizerName: string
}

interface Event {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  isPublic: boolean
  isActive: boolean
  userRegistered: boolean
  userAttended: boolean
}

export default function EventCertificatesPage() {
  const params = useParams()
  const id = params.id as string
  const [event, setEvent] = useState<Event | null>(null)
  const [certificates, setCertificates] = useState<UserCertificate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCertificate, setSelectedCertificate] = useState<UserCertificate | null>(null)

  // Simuler le chargement des données
  useEffect(() => {
    const loadData = async () => {
      // Données de démonstration pour l'événement
      const mockEvent: Event = {
        id: id,
        title: 'Conférence Technologique 2024',
        description: 'La plus grande conférence sur les innovations technologiques',
        startDate: '2024-01-15T09:00:00',
        endDate: '2024-01-15T18:00:00',
        location: 'Paris, France',
        isPublic: true,
        isActive: true,
        userRegistered: true,
        userAttended: true
      }

      // Données de démonstration pour les certificats
      const mockCertificates: UserCertificate[] = [
        {
          id: '1',
          title: 'Certificat de Participation',
          description: 'Certificat standard pour tous les participants',
          issuedAt: '2024-01-15T18:00:00',
          certificateUrl: '/certificates/participation_sample.pdf',
          qrCodeUrl: '/qrcodes/participation_sample.png',
          eventTitle: 'Conférence Technologique 2024',
          eventDate: '15 janvier 2024',
          organizerName: 'ANSUT'
        },
        {
          id: '2',
          title: 'Certificat de Réussite',
          description: 'Pour les participants ayant complété tous les ateliers',
          issuedAt: '2024-01-16T10:00:00',
          certificateUrl: '/certificates/achievement_sample.pdf',
          qrCodeUrl: '/qrcodes/achievement_sample.png',
          eventTitle: 'Conférence Technologique 2024',
          eventDate: '15 janvier 2024',
          organizerName: 'ANSUT'
        }
      ]

      setEvent(mockEvent)
      setCertificates(mockCertificates)
      if (mockCertificates.length > 0) {
        setSelectedCertificate(mockCertificates[0])
      }
      setIsLoading(false)
    }

    loadData()
  }, [id])

  const handleDownload = (certificate: UserCertificate) => {
    // Simuler le téléchargement
    alert(`Téléchargement du certificat: ${certificate.title}`)
  }

  const handleShare = (certificate: UserCertificate) => {
    // Simuler le partage
    if (navigator.share) {
      navigator.share({
        title: certificate.title,
        text: `J'ai reçu un certificat pour avoir participé à ${certificate.eventTitle}!`,
        url: window.location.href
      })
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
      alert(`Lien de partage copié pour: ${certificate.title}`)
    }
  }

  const handleSendByEmail = (certificate: UserCertificate) => {
    // Simuler l'envoi par email
    alert(`Le certificat "${certificate.title}" a été envoyé par email!`)
  }

  const generateCertificatePreview = () => {
    if (!selectedCertificate) return null

    return (
      <div className="bg-white border-4 border-yellow-400 p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">{selectedCertificate.title}</h1>
            <div className="w-32 h-1 bg-yellow-400 mx-auto"></div>
          </div>
          
          <div className="space-y-4 text-gray-600">
            <p className="text-lg">Ce certifie que</p>
            <div className="border-b-2 border-gray-300 pb-2">
              <p className="text-2xl font-semibold text-gray-800">Votre Nom</p>
            </div>
            <p className="text-lg">a participé à l'événement</p>
            <div className="border-b-2 border-gray-300 pb-2">
              <p className="text-xl font-semibold text-gray-800">{selectedCertificate.eventTitle}</p>
            </div>
            <p>qui s'est déroulé le {selectedCertificate.eventDate}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-gray-600">Délivré le</p>
            <p className="font-semibold text-gray-800">
              {format(new Date(selectedCertificate.issuedAt), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          
          <div className="flex justify-center items-center space-x-8 pt-4">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">Code QR</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                <Award className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">Signature</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              Organisé par {selectedCertificate.organizerName}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Événement non trouvé</h3>
            <p className="text-muted-foreground">L'événement demandé n'existe pas.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event.userAttended) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Certificats non disponibles</h3>
            <p className="text-muted-foreground text-center mb-4">
              Vous devez avoir participé à l'événement pour recevoir des certificats.
            </p>
            <Badge variant="secondary">
              {event.userRegistered ? 'Inscrit mais non présent' : 'Non inscrit'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes Certificats</h1>
          <p className="text-muted-foreground">
            Vos certificats pour l'événement: {event.title}
          </p>
        </div>
      </div>

      {/* Informations sur l'événement */}
      <Card>
        <CardHeader>
          <CardTitle>Informations sur l'événement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="text-sm">
                {format(new Date(event.startDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
            {event.location && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lieu</p>
                <p className="text-sm">{event.location}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Statut</p>
              <Badge variant="default">Participation confirmée</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des certificats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certificats disponibles ({certificates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {certificates.map((certificate) => (
                  <Card 
                    key={certificate.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedCertificate?.id === certificate.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedCertificate(certificate)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Disponible
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Délivré le {format(new Date(certificate.issuedAt), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </div>
                      
                      <h3 className="font-medium mb-1">{certificate.title}</h3>
                      {certificate.description && (
                        <p className="text-sm text-muted-foreground mb-3">{certificate.description}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(certificate)
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShare(certificate)
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Partager
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSendByEmail(certificate)
                          }}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Aperçu du certificat */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu du certificat</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {selectedCertificate ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium text-lg">{selectedCertificate.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedCertificate.description}</p>
                  </div>
                  
                  <Separator />
                  
                  {generateCertificatePreview()}
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Actions disponibles</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <Button 
                        className="w-full" 
                        onClick={() => handleDownload(selectedCertificate)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger le PDF
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleShare(selectedCertificate)}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Partager
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleSendByEmail(selectedCertificate)}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Envoyer par email
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Le certificat inclut un code QR unique pour vérification</p>
                    <p>• Le PDF est signé numériquement pour garantir son authenticité</p>
                    <p>• Vous pouvez partager votre certificat sur les réseaux professionnels</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p>Sélectionnez un certificat pour voir l'aperçu</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}