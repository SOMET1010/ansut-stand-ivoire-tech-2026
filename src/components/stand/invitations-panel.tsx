"use client"

import { useState } from 'react'
import { Loader2, Mail, Plus, Sparkles, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { LETTER_STATUS, DG_VALIDATION } from '@/lib/stand-labels'
import { LetterDialog } from './letter-dialog'
import { api, dayLabel, timeLabel, type InvitationRow, type PanelRow } from './use-stand'

const DG_STYLE = { A_VALIDER: 'bg-itf-orange/15 text-itf-orange', VALIDE: 'bg-itf-green/15 text-[#3d7f1f]', REFUSE: 'bg-destructive/10 text-destructive' }

function AddPartner({ panelId, onAdded }: { panelId: string; onAdded: () => void }) {
  const [name, setName] = useState('')
  const add = async () => {
    try {
      await api('/api/stand/invitations', { method: 'POST', body: JSON.stringify({ panelId, partnerName: name }) })
      setName('')
      onAdded()
    } catch (e) {
      toast({ title: 'Ajout impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); add() }} className="mt-3 flex gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ajouter un partenaire…" className="h-8 text-sm" />
      <Button size="sm" variant="outline" disabled={name.trim().length < 2}><Plus className="h-4 w-4" /></Button>
    </form>
  )
}

// Module (a) + agent (b) : invitations par séquence, rédaction, validation DG, envoi, présence.
export function InvitationsPanel({ panels, canValidate, reload }: { panels: PanelRow[]; canValidate: boolean; reload: () => void }) {
  const [drafting, setDrafting] = useState<string | null>(null)
  const [open, setOpen] = useState<InvitationRow | null>(null)

  const draft = async (inv: InvitationRow) => {
    setDrafting(inv.id)
    try {
      const res = await api<{ usedAI: boolean; invitation: InvitationRow }>(`/api/stand/invitations/${inv.id}/draft`, { method: 'POST' })
      toast({ title: res.usedAI ? 'Courrier rédigé par l’IA' : 'Courrier rédigé (modèle, IA non activée)' })
      reload()
      setOpen(res.invitation)
    } catch (e) {
      toast({ title: 'Rédaction impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setDrafting(null)
    }
  }

  const togglePresent = async (inv: InvitationRow) => {
    await api(`/api/stand/invitations/${inv.id}`, { method: 'PATCH', body: JSON.stringify({ attended: !inv.attended }) }).catch(() => null)
    reload()
  }

  return (
    <div className="space-y-4">
      {panels.map((p) => (
        <section key={p.id} className="rounded-2xl border bg-white p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold text-itf-navy">{p.title}</h3>
            <span className="text-xs text-muted-foreground">{dayLabel(p.startTime)} · {timeLabel(p)}{p.location ? ` · ${p.location}` : ''}{p.speaker ? ` · ${p.speaker}` : ''}{p.hidden ? ' · masquée du programme' : ''}</span>
          </header>
          <ul className="mt-3 divide-y">
            {p.invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-[12rem] flex-1 font-medium">
                  {inv.partnerName}
                  {inv.contactRole && <span className="text-muted-foreground"> · {inv.contactRole}</span>}
                </span>
                <Badge variant="outline">{LETTER_STATUS[inv.letterStatus]}</Badge>
                <Badge className={`border-0 ${DG_STYLE[inv.dgValidation]}`}>DG : {DG_VALIDATION[inv.dgValidation]}</Badge>
                <Button size="sm" variant="ghost" onClick={() => draft(inv)} disabled={drafting === inv.id} title="Rédiger avec l’agent">
                  {drafting === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-itf-orange" />}
                </Button>
                <Button size="sm" variant="ghost" disabled={!inv.letterDraft} onClick={() => setOpen(inv)} title="Ouvrir le courrier">
                  <Mail className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={inv.attended ? 'default' : 'ghost'} className={inv.attended ? 'bg-itf-green hover:bg-itf-green/90' : ''} onClick={() => togglePresent(inv)} title="Présent">
                  <UserCheck className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <AddPartner panelId={p.id} onAdded={reload} />
        </section>
      ))}
      {open && (
        <LetterDialog key={`${open.id}-${open.letterDraft?.length}`} invitation={open} canValidate={canValidate} onClose={() => setOpen(null)} onChanged={reload} />
      )}
    </div>
  )
}
