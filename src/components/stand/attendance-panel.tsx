"use client"

import Link from 'next/link'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dayLabel, timeLabel, type PanelRow } from './use-stand'

// Module (a) : présences pointées par QR code et invités présents, par séquence.
export function AttendancePanel({ panels }: { panels: PanelRow[] }) {
  const total = panels.reduce((n, p) => n + p.attendances.length, 0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground"><strong className="text-itf-navy">{total}</strong> pointage(s) visiteurs sur {panels.length} séquences</p>
        <Button variant="outline" asChild><Link href="/dashboard/stand/qr"><QrCode className="mr-2 h-4 w-4" /> QR codes à imprimer</Link></Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-itf-sky/60 text-left text-itf-navy">
            <tr><th className="p-3">Séquence</th><th className="p-3">Créneau</th><th className="p-3 text-right">Visiteurs</th><th className="p-3 text-right">Invités présents</th><th className="p-3">Derniers pointages</th></tr>
          </thead>
          <tbody className="divide-y">
            {panels.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium">{p.title}</td>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{dayLabel(p.startTime)} · {timeLabel(p)}</td>
                <td className="p-3 text-right font-bold text-itf-navy">{p.attendances.length}</td>
                <td className="p-3 text-right">{p.invitations.filter((i) => i.attended).length} / {p.invitations.length}</td>
                <td className="p-3 text-xs text-muted-foreground">{p.attendances.slice(0, 3).map((a) => a.name + (a.organization ? ` (${a.organization})` : '')).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
