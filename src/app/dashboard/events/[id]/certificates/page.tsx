'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Award,
  Download,
  Plus,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  Clock,
  QrCode,
  FileText,
  Mail,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CertificateTemplate {
  id: string
  title: string
  description: string
  content: string
  isActive: boolean
  autoGenerate: boolean
  createdAt: string
  eventId: string
  issuedCount: number
}

interface EventRegistration {
  id: string
  userId: string
  userName: string
  userEmail: string
  registeredAt: string
  attended: boolean
  certificate: {
    id: string
    issuedAt: string
    certificateUrl?: string
  } | null
}

export default function EventCertificatesPage() {
  const { id } = useParams<{ id: string }>()
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    content: '',
    autoGenerate: false
  })
  const [isLoading, setIsLoading] = useState(true)

  // Simuler le chargement des données
  useEffect(() => {
    const loadData = async () => {
      // Données de démonstration
      const mockTemplates: CertificateTemplate[] = [
        {
          id: '1',
          title: 'Certificat de Participation',
          description: 'Certificat standard pour tous les participants',
          content: `Certificat de Participation

Ce certifie que

[NOM DU PARTICIPANT]

a participé à l'événement

[TITRE DE L'ÉVÉNEMENT]

qui s'est déroulé du [DATE DE DÉBUT] au [DATE DE FIN]

Délivré le [DATE DE DÉLIVRANCE]

[ORGANISATEUR]`,
          isActive: true,
          autoGenerate: true,
          createdAt: '2024-01-10T10:00:00',
          eventId: id,
          issuedCount: 45
        },
        {
          id: '2',
          title: 'Certificat de Réussite',
          description: 'Pour les participants ayant complété tous les ateliers',
          content: `Certificat de Réussite

Ce certifie que

[NOM DU PARTICIPANT]

a réussi avec succès tous les ateliers de

[TITRE DE L'ÉVÉNEMENT]

et a démontré une excellente compréhension des sujets abordés.

Délivré le [DATE DE DÉLIVRANCE]

[ORGANISATEUR]`,
          isActive: true,
          autoGenerate: false,
          createdAt: '2024-01-12T14:30:00',
          eventId: id,
          issuedCount: 12
        }
      ]

      const mockRegistrations: EventRegistration[] = [
        {
          id: '1',
          userId: '1',
          userName: 'Marie Dubois',
          userEmail: 'marie@example.com',
          registeredAt: '2024-01-10T09:00:00',
          attended: true,
          certificate: {
            id: '1',
            issuedAt: '2024-01-15T18:00:00',
            certificateUrl: '/certificates/sample1.pdf'
          }
        },
        {
          id: '2',
          userId: '2',
          userName: 'Jean Martin',
          userEmail: 'jean@example.com',
          registeredAt: '2024-01-10T10:30:00',
          attended: true,
          certificate: {
            id: '2',
            issuedAt: '2024-01-15T18:00:00',
            certificateUrl: '/certificates/sample2.pdf'
          }
        },
        {
          id: '3',
          userId: '3',
          userName: 'Sophie Bernard',
          userEmail: 'sophie@example.com',
          registeredAt: '2024-01-11T14:00:00',
          attended: true,
          certificate: null
        },
        {
          id: '4',
          userId: '4',
          userName: 'Pierre Lefebvre',
          userEmail: 'pierre@example.com',
          registeredAt: '2024-01-12T09:15:00',
          attended: false,
          certificate: null
        }
      ]

      setTemplates(mockTemplates)
      setRegistrations(mockRegistrations)
      if (mockTemplates.length > 0) {
        setSelectedTemplate(mockTemplates[0])
      }
      setIsLoading(false)
    }

    loadData()
  }, [id])

  const handleCreateTemplate = async () => {
    if (!newTemplate.title.trim() || !newTemplate.content.trim()) {
      return
    }

    const template: CertificateTemplate = {
      id: Date.now().toString(),
      title: newTemplate.title,
      description: newTemplate.description,
      content: newTemplate.content,
      isActive: true,
      autoGenerate: newTemplate.autoGenerate,
      createdAt: new Date().toISOString(),
      eventId: id,
      issuedCount: 0
    }

    setTemplates(prev => [template, ...prev])
    setNewTemplate({
      title: '',
      description: '',
      content: '',
      autoGenerate: false
    })
    setIsCreating(false)
  }

  const handleGenerateCertificate = async (registrationId: string, templateId: string) => {
    // Simuler la génération d'un certificat
    const registration = registrations.find(r => r.id === registrationId)
    const template = templates.find(t => t.id === templateId)
    
    if (!registration || !template) return

    // Mettre à jour l'inscription avec le certificat
    setRegistrations(prev => 
      prev.map(r => 
        r.id === registrationId 
          ? { 
              ...r, 
              certificate: {
                id: Date.now().toString(),
                issuedAt: new Date().toISOString(),
                certificateUrl: `/certificates/cert_${registrationId}_${Date.now()}.pdf`
              }
            } 
          : r
      )
    )

    // Mettre à jour le compteur de certificats
    setTemplates(prev => 
      prev.map(t => 
        t.id === templateId 
          ? { ...t, issuedCount: t.issuedCount + 1 } 
          : t
      )
    )

    alert(`Certificat généré avec succès pour ${registration.userName}!`)
  }

  const handleSendCertificate = async (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId)
    if (!registration?.certificate) return

    // Simuler l'envoi par email
    alert(`Certificat envoyé par email à ${registration.userEmail}`)
  }

  const previewCertificate = (template: CertificateTemplate, registration?: EventRegistration) => {
    setSelectedTemplate(template)
    setIsPreviewing(true)
  }

  const getPreviewContent = () => {
    if (!selectedTemplate) return ''

    let content = selectedTemplate.content
    const sampleRegistration = registrations.find(r => r.attended) || registrations[0]
    
    if (sampleRegistration) {
      content = content
        .replace('[NOM DU PARTICIPANT]', sampleRegistration.userName)
        .replace('[TITRE DE L\'ÉVÉNEMENT]', 'Conférence Technologique 2024')
        .replace('[DATE DE DÉBUT]', '15 janvier 2024')
        .replace('[DATE DE FIN]', '15 janvier 2024')
        .replace('[DATE DE DÉLIVRANCE]', format(new Date(), 'dd MMMM yyyy', { locale: fr }))
        .replace('[ORGANISATEUR]', 'ANSUT')
    }

    return content
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Certificats</h1>
          <p className="text-muted-foreground">Créez et gérez des certificats pour les participants</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {/* Formulaire de création */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un nouveau modèle de certificat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre du certificat</Label>
              <Input
                id="title"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Certificat de Participation"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du certificat..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="content">Contenu du certificat</Label>
              <Textarea
                id="content"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder={`Utilisez les variables:
[NOM DU PARTICIPANT]
[TITRE DE L'ÉVÉNEMENT]
[DATE DE DÉBUT]
[DATE DE FIN]
[DATE DE DÉLIVRANCE]
[ORGANISATEUR]`}
                rows={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisez les variables entre crochets pour personnaliser le certificat
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoGenerate"
                checked={newTemplate.autoGenerate}
                onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, autoGenerate: checked }))}
              />
              <Label htmlFor="autoGenerate">Générer automatiquement pour tous les participants</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate} className="flex-1">
                Créer le modèle
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Modèles de certificats</TabsTrigger>
          <TabsTrigger value="participants">Certificats des participants</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liste des modèles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Modèles ({templates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={template.isActive ? "default" : "secondary"}>
                                {template.isActive ? 'Actif' : 'Inactif'}
                              </Badge>
                              {template.autoGenerate && <Badge variant="outline">Auto</Badge>}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Award className="w-4 h-4" />
                              {template.issuedCount}
                            </div>
                          </div>
                          
                          <h3 className="font-medium mb-1">{template.title}</h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Créé le {format(new Date(template.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                previewCertificate(template)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Éditer le modèle
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Détails du modèle */}
            <Card>
              <CardHeader>
                <CardTitle>Détails du modèle</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">{selectedTemplate.title}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewCertificate(selectedTemplate)}
                        >
                          <Eye className="w-4 h-4" />
                          Aperçu
                        </Button>
                      </div>
                    </div>

                    {selectedTemplate.description && (
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {selectedTemplate.issuedCount} certificats délivrés
                      </span>
                      <span>Créé le {format(new Date(selectedTemplate.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
                    </div>

                    <div className="flex gap-2">
                      {selectedTemplate.isActive && <Badge variant="default">Actif</Badge>}
                      {selectedTemplate.autoGenerate && <Badge variant="outline">Génération automatique</Badge>}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Contenu du modèle</h4>
                      <div className="bg-muted p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-sans">
                          {selectedTemplate.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Sélectionnez un modèle pour voir les détails</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Certificats des participants ({registrations.filter(r => r.certificate).length}/{registrations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {registrations.map((registration) => (
                    <Card key={registration.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {registration.userName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{registration.userName}</h4>
                              <p className="text-sm text-muted-foreground">{registration.userEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={registration.attended ? "default" : "secondary"}>
                              {registration.attended ? 'Présent' : 'Absent'}
                            </Badge>
                            {registration.certificate && (
                              <Badge variant="outline">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Certificat
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Inscrit le {format(new Date(registration.registeredAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </div>
                          
                          <div className="flex gap-2">
                            {registration.attended && !registration.certificate && (
                              <Select>
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Générer certificat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.filter(t => t.isActive).map((template) => (
                                    <SelectItem 
                                      key={template.id} 
                                      value={template.id}
                                      onClick={() => handleGenerateCertificate(registration.id, template.id)}
                                    >
                                      {template.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            {registration.certificate && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Télécharger le certificat
                                    alert('Téléchargement du certificat...')
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendCertificate(registration.id)}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {registration.certificate && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm">
                              Certificat délivré le {format(new Date(registration.certificate.issuedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}