"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Activity,
  MessageSquare,
  BarChart,
  FileText,
  Mic,
  Settings,
  Download
} from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  totalEvents: number
  totalRegistrations: number
  activeEvents: number
  recentActivity: Array<{
    id: string
    type: 'user' | 'event' | 'registration'
    title: string
    timestamp: string
  }>
  topEvents: Array<{
    id: string
    title: string
    registrations: number
    date: string
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    activeEvents: 0,
    recentActivity: [],
    topEvents: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch users count
      const usersRes = await fetch('/api/admin/users?limit=1')
      const usersData = await usersRes.json()
      
      // Fetch events count
      const eventsRes = await fetch('/api/admin/events?limit=1')
      const eventsData = await eventsRes.json()

      // Mock data for demo purposes
      const mockStats: DashboardStats = {
        totalUsers: usersData.pagination?.total || 0,
        totalEvents: eventsData.pagination?.total || 0,
        totalRegistrations: 156,
        activeEvents: eventsData.events?.filter((e: Record<string, unknown>) => e.isActive).length || 0,
        recentActivity: [
          {
            id: '1',
            type: 'user',
            title: 'Nouvel utilisateur inscrit',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
          },
          {
            id: '2',
            type: 'event',
            title: 'Événement "Conférence Tech" créé',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          },
          {
            id: '3',
            type: 'registration',
            title: 'Nouvelle inscription à "Webinaire Marketing"',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
          }
        ],
        topEvents: [
          {
            id: '1',
            title: 'Conférence Annuelle 2024',
            registrations: 45,
            date: '2024-03-15'
          },
          {
            id: '2',
            title: 'Atelier Développement Web',
            registrations: 32,
            date: '2024-03-20'
          },
          {
            id: '3',
            title: 'Séminaire Marketing Digital',
            registrations: 28,
            date: '2024-03-25'
          }
        ]
      }

      setStats(mockStats)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "À l'instant"
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4" />
      case 'event': return <Calendar className="h-4 w-4" />
      case 'registration': return <Users className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue-600'
      case 'event': return 'text-green-600'
      case 'registration': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de l'activité sur la plateforme du stand ANSUT
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +12% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total événements</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEvents} événements actifs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              +8% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'activité</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              Utilisateurs actifs ce mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accédez rapidement aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Gérer les utilisateurs</div>
                    <div className="text-xs text-muted-foreground">
                      Créer et modifier des comptes
                    </div>
                  </div>
                </div>
              </Button>
            </Link>
            
            <Link href="/admin/events">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Gérer les événements</div>
                    <div className="text-xs text-muted-foreground">
                      Administrer tous les événements
                    </div>
                  </div>
                </div>
              </Button>
            </Link>
            
            <Link href="/admin/export">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Exporter des données</div>
                    <div className="text-xs text-muted-foreground">
                      Rapports et statistiques
                    </div>
                  </div>
                </div>
              </Button>
            </Link>
            
            <Link href="/admin/settings">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Modération Q&A</div>
                    <div className="text-xs text-muted-foreground">
                      Gérer les questions
                    </div>
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Top Events */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Dernières actions sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-muted ${getActivityColor(activity.type)}`}>
                    <span className="h-4 w-4">{getActivityIcon(activity.type)}</span>
                  </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle>Événements populaires</CardTitle>
            <CardDescription>
              Les événements avec le plus d'inscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(event.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {event.registrations} inscrits
                    </Badge>
                    <span className="h-4 w-4 text-muted-foreground">→</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble des fonctionnalités</CardTitle>
          <CardDescription>
            Statistiques d'utilisation des différentes fonctionnalités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">234</div>
              <div className="text-sm text-muted-foreground">Questions posées</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <BarChart className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">45</div>
              <div className="text-sm text-muted-foreground">Sondages créés</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">189</div>
              <div className="text-sm text-muted-foreground">Certificats générés</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Mic className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">67</div>
              <div className="text-sm text-muted-foreground">Enregistrements audio</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}