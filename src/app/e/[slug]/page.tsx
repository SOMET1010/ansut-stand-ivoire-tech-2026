"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowLeft, Share2, QrCode } from 'lucide-react'
import Link from 'next/link'
import { RegistrationForm } from '@/components/shared/registration-form'
import { EventProgramDisplay } from '@/components/shared/event-program-display'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Event {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  isPublic: boolean
  isActive: boolean
  program?: string
  branding?: {
    qrCode?: string
  }
  _count?: {
    registrations: number
  }
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)


  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/by-slug/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        
        // Check if user is already registered
        const registrationResponse = await fetch(`/api/events/${data.event.id}/registrations/check`)
        if (registrationResponse.ok) {
          const registrationData = await registrationResponse.json()
          setIsRegistered(registrationData.registered)
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to fetch event:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleRegistration = async (data: { email: string; consent: boolean }) => {
    setRegistering(true)
    try {
      if (!event?.id) return
      const response = await fetch(`/api/events/${event.id}/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        setIsRegistered(true)
        // Refresh event data to update registration count
        fetchEvent()
      }
    } catch (error) {
      console.error('Failed to register:', error)
    } finally {
      setRegistering(false)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy à HH:mm', { locale: fr })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Événement non trouvé</h1>
          <Button asChild>
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">P</span>
              </div>
              <h1 className="text-2xl font-bold">ANSUT · ITF 2026</h1>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
                  {event.description && (
                    <p className="text-lg text-muted-foreground">{event.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {event.isActive && <Badge variant="default">Actif</Badge>}
                  {event.isPublic && <Badge variant="secondary">Public</Badge>}
                </div>
              </div>

              {/* Event Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(event.startDate)}</span>
                </div>
                {event.endDate && (
                  <div className="text-sm text-muted-foreground">
                    au {format(new Date(event.endDate), 'HH:mm')}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{event._count?.registrations || 0} participant{event._count?.registrations !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
              {event.branding?.qrCode && (
                <Button variant="outline" size="sm">
                  <QrCode className="w-4 h-4 mr-2" />
                  Code QR
                </Button>
              )}
            </div>

            {/* Event Content */}
            <Card>
              <CardHeader>
                <CardTitle>À propos de cet événement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {event.description ? (
                    <p>{event.description}</p>
                  ) : (
                    <p className="text-muted-foreground">Aucune description disponible pour cet événement.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Program */}
            <EventProgramDisplay program={event.program || null} />
          </div>

          {/* Registration Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <RegistrationForm
                event={event}
                onSubmit={handleRegistration}
                loading={registering}
                isRegistered={isRegistered}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}