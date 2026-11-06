"use client"

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import type { DailyStats } from '@/lib/agents/report-types'
import { api } from './use-stand'

const DAYS = [
  { date: '2026-11-11', label: 'Mer. 11 nov.' },
  { date: '2026-11-12', label: 'Jeu. 12 nov.' },
  { date: '2026-11-13', label: 'Ven. 13 nov.' },
]

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-itf-navy">{value}</p>
    </div>
  )
}

// Agent (e) : bilan quotidien pour le DG (chiffres réels + synthèse IA).
export function ReportPanel() {
  const [date, setDate] = useState(DAYS[0].date)
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSummary(null)
    api<{ stats: DailyStats }>(`/api/agents/daily-report?date=${date}`).then((d) => setStats(d.stats)).catch(() => setStats(null))
  }, [date])

  const write = async () => {
    setBusy(true)
    try {
      const d = await api<{ stats: DailyStats; summary: string | null; usedAI: boolean }>(`/api/agents/daily-report?date=${date}`, { method: 'POST' })
      setStats(d.stats)
      setSummary(d.summary)
      if (!d.usedAI) toast({ title: 'IA non activée', description: 'Seuls les chiffres sont disponibles.' })
    } catch (e) {
      toast({ title: 'Bilan impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button key={d.date} onClick={() => setDate(d.date)} className={`rounded-full px-4 py-2 text-sm font-semibold ${d.date === date ? 'bg-itf-navy text-white' : 'bg-itf-sky text-itf-navy'}`}>{d.label}</button>
        ))}
        <Button onClick={write} disabled={busy} className="ml-auto bg-itf-navy hover:bg-itf-navy-deep">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Rédiger le bilan pour le DG
        </Button>
      </div>
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Inscriptions du jour" value={stats.registrations} />
            <Kpi label="Inscriptions cumulées" value={stats.registrationsTotal} />
            <Kpi label="Contacts (assistant)" value={stats.leads} />
            <Kpi label="Courriers envoyés" value={`${stats.invitations.sent} / ${stats.invitations.total}`} />
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-itf-sky/60 text-left text-itf-navy"><tr><th className="p-3">Séquence</th><th className="p-3 text-right">Visiteurs</th><th className="p-3 text-right">Invités présents</th><th className="p-3 text-right">Questions</th></tr></thead>
              <tbody className="divide-y">
                {stats.sessions.map((s) => (
                  <tr key={s.title}><td className="p-3">{s.title}</td><td className="p-3 text-right font-bold">{s.attendances}</td><td className="p-3 text-right">{s.invitedPresent} / {s.invited}</td><td className="p-3 text-right">{s.questions}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {summary && (
        <article className="whitespace-pre-line rounded-2xl border-l-4 border-itf-orange bg-white p-5 text-sm leading-relaxed">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-itf-orange">Note au DG · rédigée par l’IA à partir des chiffres ci-dessus</p>
          {summary}
        </article>
      )}
    </div>
  )
}
