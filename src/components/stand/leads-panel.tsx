"use client"

import { useEffect, useState } from 'react'
import { api } from './use-stand'

interface Lead { id: string; name: string; organization: string | null; email: string | null; phone: string | null; interest: string; createdAt: string }

// Contacts recueillis par l'assistant du stand (agent c).
export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  useEffect(() => { api<{ leads: Lead[] }>('/api/stand/leads').then((d) => setLeads(d.leads)).catch(() => setLeads([])) }, [])
  if (!leads) return null
  if (leads.length === 0) return <p className="text-sm text-muted-foreground">Aucun contact pour l’instant.</p>
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-itf-sky/60 text-left text-itf-navy"><tr><th className="p-3">Nom</th><th className="p-3">Organisation</th><th className="p-3">Contact</th><th className="p-3">Intérêt</th><th className="p-3">Date</th></tr></thead>
        <tbody className="divide-y">
          {leads.map((l) => (
            <tr key={l.id}>
              <td className="p-3 font-medium">{l.name}</td>
              <td className="p-3">{l.organization ?? '—'}</td>
              <td className="p-3">{[l.email, l.phone].filter(Boolean).join(' · ')}</td>
              <td className="p-3">{l.interest}</td>
              <td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
