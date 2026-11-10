"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, Users, Mic, Network, Trophy, Presentation, LogOut } from 'lucide-react'
import { SiteHeader, SiteFooter } from '@/components/brand/brand'
import { AskQuestion } from '@/components/stand/ask-question'
import { EVENT, STAND_SESSIONS, PROGRAM_DAYS, sessionType, type ProgramType } from '@/config/event'

const TYPE_META: Record<ProgramType, { label: string; className: string; icon: React.ElementType }> = {
  ceremony: { label: 'Temps fort', className: 'bg-itf-orange/15 text-itf-orange', icon: Trophy },
  conference: { label: 'Causerie / Panel', className: 'bg-itf-navy/10 text-itf-navy', icon: Mic },
  workshop: { label: 'Pitch / Plateau', className: 'bg-itf-green/15 text-[#3d7f1f]', icon: Presentation },
  networking: { label: 'Networking', className: 'bg-itf-cyan/15 text-[#0f6f96]', icon: Network },
  break: { label: 'Pause', className: 'bg-muted text-muted-foreground', icon: Clock },
}

export default function ProgramPage() {
  const [visitor, setVisitor] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState(PROGRAM_DAYS[0])

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
        {visitor && <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" /> Quitter</Button>}
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
            {PROGRAM_DAYS.map((day) => (
              <button
                key={day}
                role="tab"
                aria-selected={day === activeDay}
                onClick={() => setActiveDay(day)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  day === activeDay ? 'bg-itf-navy text-white' : 'bg-itf-sky text-itf-navy hover:bg-itf-cyan/20'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <ol className="relative space-y-4 border-l-2 border-itf-cyan/30 pl-6">
            {STAND_SESSIONS.filter((s) => s.day === activeDay).map((s) => {
              const meta = TYPE_META[sessionType(s.title)]
              const Icon = meta.icon
              return (
                <li key={s.id} className="relative rounded-2xl border bg-white p-5 shadow-sm">
                  <span className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-white bg-itf-green ring-2 ring-itf-cyan/40" />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 text-sm font-bold text-itf-navy">
                      <Clock className="h-4 w-4 text-itf-orange" /> {s.time}
                    </span>
                    <Badge className={`${meta.className} border-0`}>
                      <Icon className="mr-1 h-3 w-3" /> {meta.label}
                    </Badge>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-itf-navy">{s.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {s.location}</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Pilote : {s.pilot}</span>
                  </div>
                  <AskQuestion sessionId={s.id} />
                </li>
              )
            })}
          </ol>
          <p className="mt-6 text-xs text-muted-foreground">
            Horaires indiqués « à confirmer » susceptibles d’évoluer. Programme issu de la matrice ANSUT ITF 2026.
          </p>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter />
    </div>
  )
}
