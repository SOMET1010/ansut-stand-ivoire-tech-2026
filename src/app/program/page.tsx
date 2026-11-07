"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, Users, LogOut, Loader2 } from 'lucide-react'
import { SiteHeader, SiteFooter } from '@/components/brand/brand'
import { AskQuestion } from '@/components/stand/ask-question'
import { categoryMeta } from '@/components/stand/program-category'
import { EVENT } from '@/config/event'
import type { ProgramItem } from '@/lib/program'

type ProgramDay = { date: string; day: string; items: ProgramItem[] }

export default function ProgramPage() {
  const [visitor, setVisitor] = useState<string | null>(null)
  const [days, setDays] = useState<ProgramDay[] | null>(null)
  const [activeDay, setActiveDay] = useState('')

  useEffect(() => {
    fetch('/api/program')
      .then((r) => (r.ok ? r.json() : { days: [] }))
      .then((d: { days: ProgramDay[] }) => {
        setDays(d.days)
        // Jour affiché par défaut : aujourd'hui pendant l'événement, sinon le premier jour
        const today = new Date().toISOString().slice(0, 10)
        setActiveDay((d.days.find((x) => x.date === today) ?? d.days[0])?.date ?? '')
      })
      .catch(() => setDays([]))
  }, [])
  const current = days?.find((d) => d.date === activeDay)

  useEffect(() => {
    const registrationId = localStorage.getItem('registrationId')
    if (!registrationId) return
    fetch(`/api/registrations/${registrationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.registration && setVisitor(d.registration.firstName))
      .catch(() => {})
  }, [])

  const logout = () => {
    localStorage.removeItem('registrationId')
    setVisitor(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader>
        {visitor ? (
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" /> Quitter</Button>
        ) : (
          <Button size="sm" className="bg-itf-navy hover:bg-itf-navy-deep" asChild><Link href="/register">S’inscrire</Link></Button>
        )}
      </SiteHeader>

      <section className="itf-hero-bg px-4 py-10">
        <div className="container mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-itf-orange">{EVENT.dates} · {EVENT.location}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-itf-navy md:text-5xl">
            Programme du <span className="itf-gradient-text">stand ANSUT</span>
          </h1>
          {visitor && <p className="mt-3 text-lg text-itf-navy/80">Bienvenue {visitor} !</p>}
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6 flex flex-wrap gap-2" role="tablist">
            {days?.map((d) => (
              <button
                key={d.date}
                role="tab"
                aria-selected={d.date === activeDay}
                onClick={() => setActiveDay(d.date)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  d.date === activeDay ? 'bg-itf-navy text-white' : 'bg-itf-sky text-itf-navy hover:bg-itf-cyan/20'
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>

          {!days && <Loader2 className="mx-auto h-8 w-8 animate-spin text-itf-cyan" />}
          {days?.length === 0 && <p className="text-muted-foreground">Le programme sera publié prochainement.</p>}
          <ol className="relative space-y-4 border-l-2 border-itf-cyan/30 pl-6">
            {current?.items.map((s) => {
              const meta = categoryMeta(s.category)
              const Icon = meta.icon
              return (
                <li key={s.id} className="relative rounded-2xl border bg-white p-5 shadow-sm">
                  <span className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-white bg-itf-green ring-2 ring-itf-cyan/40" />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 text-sm font-bold text-itf-navy">
                      <Clock className="h-4 w-4 text-itf-orange" /> {s.time}
                    </span>
                    {s.category && (
                      <Badge className={`${meta.className} border-0`}>
                        <Icon className="mr-1 h-3 w-3" /> {s.category}
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-itf-navy">{s.title}</h2>
                  {s.description && <p className="mt-1 text-sm text-itf-navy/80">{s.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    {s.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {s.location}</span>}
                    {s.speaker && <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {s.speaker}</span>}
                  </div>
                  {!s.allDay && <AskQuestion panelId={s.id} />}
                </li>
              )
            })}
          </ol>
          <p className="mt-6 text-xs text-muted-foreground">Programme susceptible d’évoluer, mis à jour en direct par l’équipe du stand.</p>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter />
    </div>
  )
}
