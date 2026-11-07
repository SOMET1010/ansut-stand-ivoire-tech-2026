"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CalendarDays, MapPin, MessageSquare, BarChart3, Award, LogOut, ArrowRight, Clock } from 'lucide-react'
import { SiteHeader, SiteFooter, ItfWordmark, AnsutLogo } from '@/components/brand/brand'
import { EVENT } from '@/config/event'
import type { ProgramItem } from '@/lib/program'

export default function Home() {
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined
  const [days, setDays] = useState<{ date: string; day: string; items: ProgramItem[] }[]>([])
  useEffect(() => {
    fetch('/api/program').then((r) => (r.ok ? r.json() : { days: [] })).then((d) => setDays(d.days ?? [])).catch(() => {})
  }, [])
  const highlights = days.map((d) => ({ ...d, items: d.items.filter((s) => !s.allDay) }))
  const count = highlights.reduce((n, d) => n + d.items.length, 0)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader>
        <Link href="/program" className="hidden px-3 py-2 font-medium text-itf-navy hover:underline sm:inline">Programme</Link>
        <Link href="/assistant" className="hidden px-3 py-2 font-medium text-itf-navy hover:underline sm:inline">Assistant</Link>
        <Link href="/jouer" className="px-3 py-2 font-bold text-itf-orange hover:underline">Jouer</Link>
        {role === 'ORGANIZER' && <Button variant="outline" size="sm" asChild><Link href="/dashboard">Tableau de bord</Link></Button>}
        {role === 'ADMIN' && <Button variant="outline" size="sm" asChild><Link href="/admin">Administration</Link></Button>}
        {session ? (
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
            <LogOut className="mr-1 h-4 w-4" /> Déconnexion
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => signIn()}>Espace équipe</Button>
        )}
      </SiteHeader>

      {/* Hero */}
      <section className="itf-hero-bg relative overflow-hidden">
        <div className="container mx-auto grid items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <AnsutLogo className="mb-6 h-14 w-auto" />
            <ItfWordmark />
            <p className="mt-6 max-w-md text-lg text-itf-navy/80">
              Bienvenue sur le stand de l’<strong>ANSUT</strong>. {EVENT.tagline}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-itf-navy hover:bg-itf-navy-deep" asChild>
                <Link href="/register">S’inscrire au stand <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-itf-navy text-itf-navy" asChild>
                <Link href="/program">Voir le programme</Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-itf-navy" asChild>
                <Link href="/assistant">Poser une question</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl bg-white/80 p-8 shadow-xl ring-1 ring-itf-cyan/20 backdrop-blur">
            <div className="flex items-center gap-3 text-itf-orange">
              <CalendarDays className="h-7 w-7" />
              <span className="text-sm font-semibold uppercase tracking-wider">Dates</span>
            </div>
            <p className="mt-2 text-6xl font-extrabold leading-none md:text-7xl">
              <span className="text-itf-green">11</span>
              <span className="text-itf-navy"> - </span>
              <span className="text-itf-cyan">13</span>
            </p>
            <p className="mt-1 text-2xl font-bold text-itf-navy">novembre 2026</p>
            <div className="mt-6 flex items-center gap-2 text-lg font-semibold tracking-wide">
              <MapPin className="h-6 w-6 text-itf-orange" />
              <span className="itf-gradient-text">Sofitel Hôtel Ivoire</span>
            </div>
            {count > 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                {count} temps forts sur {days.length} jours, en plus des animations permanentes du stand.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Temps forts */}
      <section className="px-4 py-14">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-itf-navy">Temps forts du stand</h2>
          <div className="mt-2 h-1 w-16 rounded bg-itf-orange" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {highlights.map((d) => (
              <div key={d.date} className="rounded-2xl border bg-itf-sky/40 p-5">
                <p className="text-sm font-bold uppercase tracking-wider text-itf-cyan">{d.day}</p>
                <ul className="mt-3 space-y-3">
                  {d.items.map((s) => (
                    <li key={s.id} className="flex gap-3">
                      <span className="flex w-24 shrink-0 items-start gap-1 text-xs font-semibold text-itf-navy/70">
                        <Clock className="mt-0.5 h-3 w-3" /> {s.time}
                      </span>
                      <span className="text-sm font-medium text-itf-navy">{s.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="itf-band px-4 py-14 text-white">
        <div className="container mx-auto grid gap-8 md:grid-cols-3">
          {[
            { icon: MessageSquare, title: 'Questions en direct', text: 'Depuis le programme, posez vos questions aux intervenants de chaque causerie ou panel.' },
            { icon: BarChart3, title: 'Sondages interactifs', text: 'Donnez votre avis et suivez les résultats en temps réel.' },
            { icon: Award, title: 'Attestation de visite', text: 'Recevez votre attestation de participation au stand ANSUT.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Icon className="h-6 w-6 text-itf-green" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-white/75">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter />
    </div>
  )
}
