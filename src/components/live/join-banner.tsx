"use client"

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Bandeau « rejoindre » : URL, code à 6 chiffres et QR code.
export function JoinBanner({ code, compact = false }: { code: string; compact?: boolean }) {
  const [qr, setQr] = useState<string | null>(null)
  const [host, setHost] = useState('')
  useEffect(() => {
    setHost(window.location.host)
    QRCode.toDataURL(`${window.location.origin}/jouer?code=${code}`, { width: 300, margin: 1, color: { dark: '#1c2566' } }).then(setQr)
  }, [code])
  return (
    <div className={`flex items-center gap-4 rounded-2xl bg-white/90 ${compact ? 'p-2' : 'p-4'} shadow`}>
      {qr && <img src={qr} alt={`QR code pour rejoindre avec le code ${code}`} className={compact ? 'h-16 w-16' : 'h-28 w-28'} />}
      <div>
        <p className="text-sm text-itf-navy">Rendez-vous sur <strong>{host}/jouer</strong></p>
        <p className={`font-extrabold tracking-widest text-itf-navy ${compact ? 'text-2xl' : 'text-5xl'}`}>{code.slice(0, 3)} {code.slice(3)}</p>
      </div>
    </div>
  )
}
