"use client"

import { useCallback, useEffect, useState } from 'react'

export interface InvitationRow {
  id: string
  partnerName: string
  contactRole: string | null
  email: string | null
  letterStatus: 'A_PREPARER' | 'REDIGE' | 'ENVOYE'
  dgValidation: 'A_VALIDER' | 'VALIDE' | 'REFUSE'
  letterDraft: string | null
  letterSource: 'ia' | 'modele' | null
  attended: boolean
  panelId: string
}

export interface PanelRow {
  id: string
  title: string
  startTime: string
  endTime: string | null
  allDay: boolean
  hidden: boolean
  location: string | null
  speaker: string | null
  description: string | null
  invitations: InvitationRow[]
  attendances: { id: string; name: string; organization: string | null; createdAt: string }[]
  _count: { questions: number }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`)
  return data as T
}

/** Séquences du stand + rôle courant, rechargeables. */
export function useStand() {
  const [panels, setPanels] = useState<PanelRow[]>([])
  const [role, setRole] = useState<'ADMIN' | 'ORGANIZER' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const data = await api<{ panels: PanelRow[]; role: 'ADMIN' | 'ORGANIZER' }>('/api/stand/sessions')
      setPanels(data.panels)
      setRole(data.role)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible')
    }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { panels, role, error, reload }
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
export function timeLabel(p: Pick<PanelRow, 'startTime' | 'endTime' | 'allDay'>) {
  if (p.allDay) return 'Toute la journée'
  const hm = (iso: string) => iso.slice(11, 16).replace(':', 'h')
  return p.endTime ? `${hm(p.startTime)} – ${hm(p.endTime)}` : hm(p.startTime)
}
