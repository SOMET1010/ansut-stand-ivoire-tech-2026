"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Users, 
  Calendar, 
  MessageSquare, 
  BarChart, 
  Star, 
  Mic, 
  FileText, 
  LogOut,
  Menu,
} from 'lucide-react'

const organizerNavItems = [
  {
    title: 'Stand ANSUT',
    href: '/dashboard/stand',
    description: 'Invitations, présences, agents IA'
  },
  {
    title: 'Animations',
    href: '/dashboard/stand/animations',
    description: 'Quiz, nuage de mots, sondages'
  },
  {
    title: 'Tableau de bord',
    href: '/dashboard',
    description: 'Vue d\'ensemble et statistiques'
  },
  {
    title: 'Mes événements',
    href: '/dashboard/events',
    description: 'Gérer tous mes événements'
  },
  {
    title: 'Participants',
    href: '/dashboard/participants',
    description: 'Gérer les participants'
  },
  {
    title: 'Questions & Réponses',
    href: '/dashboard/qa',
    description: 'Modérer les Q&A'
  },
  {
    title: 'Sondages',
    href: '/dashboard/polls',
    description: 'Gérer les sondages'
  },
  {
    title: 'Certificats',
    href: '/dashboard/certificates',
    description: 'Gérer les certificats'
  },
  {
    title: 'Feedbacks',
    href: '/dashboard/feedbacks',
    description: 'Analyser les feedbacks'
  }
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  // Sur mobile, le tiroir se referme après chaque navigation
  useEffect(() => { setIsMobileOpen(false) }, [pathname])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    // Redirect to signin page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin'
    }
    return null
  }

  if (session.user?.role !== 'ORGANIZER' && session.user?.role !== 'ADMIN') {
    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Error during sign out:', error)
      toast({
        title: 'Erreur lors de la déconnexion',
        description: 'Veuillez réessayer.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Fond sombre derrière le tiroir mobile */}
      {isMobileOpen && (
        <button aria-label="Fermer le menu" onClick={() => setIsMobileOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      )}
      {/* Sidebar : tiroir sur mobile, colonne fixe à partir de md */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 border-r bg-background transition-transform duration-300 ease-in-out",
        "md:static md:z-auto md:translate-x-0 md:bg-muted/20 md:transition-[width]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "md:w-[72px]" : "md:w-64"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center gap-3 border-b px-3">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">A</span>
                </div>
                <div>
                  <h1 className="font-semibold text-lg">ANSUT · ITF 2026</h1>
                  <p className="text-xs text-muted-foreground">Organisateur</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={isSidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
              className={cn(
                "ml-auto hidden rounded-md p-2 hover:bg-muted md:block",
                isSidebarCollapsed && "mx-auto"
              )}
            >
              {isSidebarCollapsed ? (
                <span>›</span>
              ) : (
                <span>‹</span>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="grid gap-1 p-3">
            {organizerNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname === `${item.href}/` ||
                (item.href !== '/dashboard' &&
                  pathname.startsWith(`${item.href}/`) &&
                  !pathname.includes('/[id]') &&
                  // un lien plus précis (ex. /dashboard/stand/animations) l'emporte
                  !organizerNavItems.some((o) => o.href.length > item.href.length && pathname.startsWith(o.href)));

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                      isSidebarCollapsed && "justify-center px-2"
                    )}
                    title={isSidebarCollapsed ? item.title : undefined}
                  >
                    <span className="h-4 w-4">
                      {item.title === 'Stand ANSUT' && <Star className="h-4 w-4" />}
                      {item.title === 'Animations' && <Mic className="h-4 w-4" />}
                      {item.title === 'Tableau de bord' && <Home className="h-4 w-4" />}
                      {item.title === 'Créer un événement' && <Calendar className="h-4 w-4" />}
                      {item.title === 'Mes événements' && <Calendar className="h-4 w-4" />}
                      {item.title === 'Participants' && <Users className="h-4 w-4" />}
                      {item.title === 'Questions & Réponses' && <MessageSquare className="h-4 w-4" />}
                      {item.title === 'Sondages' && <BarChart className="h-4 w-4" />}
                      {item.title === 'Certificats' && <Star className="h-4 w-4" />}
                      {item.title === 'Enregistrements' && <Mic className="h-4 w-4" />}
                      {item.title === 'Feedbacks' && <FileText className="h-4 w-4" />}
                    </span>
                    {!isSidebarCollapsed && (
                      <div className="flex flex-col items-start">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-3">
            <div className={cn(
              "flex items-center gap-3",
              isSidebarCollapsed && "flex-col gap-2"
            )}>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {session.user?.name?.charAt(0).toUpperCase() || 'O'}
                </span>
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {session.user?.name || 'Organisateur'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.user?.email}
                  </p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                title="Déconnexion"
                className={cn(
                  "p-2 hover:bg-muted rounded-md",
                  isSidebarCollapsed && "w-full"
                )}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="min-w-0 flex-1 overflow-auto">
        {/* Barre mobile : ouvre le tiroir de navigation */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <button onClick={() => setIsMobileOpen(true)} aria-label="Ouvrir le menu" aria-expanded={isMobileOpen} className="flex h-11 w-11 items-center justify-center rounded-md border">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-itf-navy">ANSUT · ITF 2026</span>
        </div>
        <div className="mx-auto max-w-[1400px] p-3 sm:p-6 md:p-10">
          <div className="rounded-xl border bg-background p-4 shadow-sm sm:p-6 md:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}