"use client"

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStand, dayLabel, timeLabel } from '@/components/stand/use-stand'

// Planche de QR codes à imprimer : un par séquence, vers la page de pointage.
export default function StandQrPage() {
  const { panels } = useStand()
  const [codes, setCodes] = useState<Record<string, string>>({})

  useEffect(() => {
    const origin = window.location.origin
    Promise.all(
      panels.map(async (p) => [p.id, await QRCode.toDataURL(`${origin}/checkin/${p.id}`, { width: 320, margin: 1, color: { dark: '#1c2566' } })] as const),
    ).then((entries) => setCodes(Object.fromEntries(entries)))
  }, [panels])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-itf-navy">QR codes de pointage</h1>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {panels.map((p) => (
          <div key={p.id} className="break-inside-avoid rounded-2xl border-2 border-itf-navy/20 bg-white p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-itf-orange">{dayLabel(p.startTime)} · {timeLabel(p)}</p>
            <h2 className="mt-1 min-h-[3rem] font-bold text-itf-navy">{p.title}</h2>
            {codes[p.id] && <img src={codes[p.id]} alt={`QR code de pointage : ${p.title}`} className="mx-auto mt-2 h-48 w-48" />}
            <p className="mt-2 text-xs text-muted-foreground">Scannez pour enregistrer votre présence</p>
          </div>
        ))}
      </div>
    </div>
  )
}
