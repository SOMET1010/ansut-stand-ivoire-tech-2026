"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { api, type InvitationRow } from './use-stand'

interface Props {
  invitation: InvitationRow | null
  canValidate: boolean
  onClose: () => void
  onChanged: () => void
}

// Relecture, modification, validation DG et envoi d'un courrier d'invitation.
export function LetterDialog({ invitation, canValidate, onClose, onChanged }: Props) {
  const [text, setText] = useState(invitation?.letterDraft ?? '')
  const [busy, setBusy] = useState(false)
  if (!invitation) return null

  const patch = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true)
    try {
      await api(`/api/stand/invitations/${invitation.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      toast({ title: ok })
      onChanged()
      onClose()
    } catch (e) {
      toast({ title: 'Action refusée', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const objectLine = text.split('\n').find((l) => l.startsWith('Objet'))
  const subjectLine = objectLine ? objectLine.replace(/^Objet\s*:\s*/, '') : 'Invitation – Stand ANSUT, Ivoire Tech Forum 2026'
  const mailto = invitation.email
    ? `mailto:${invitation.email}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(text)}`
    : null
  const validated = invitation.dgValidation === 'VALIDE' && text === invitation.letterDraft

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-itf-navy">Courrier – {invitation.partnerName}</DialogTitle>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline">{invitation.letterSource === 'ia' ? 'Rédigé par l’IA' : 'Modèle de courrier'}</Badge>
            <Badge variant="outline">Validation DG : {invitation.dgValidation === 'VALIDE' ? 'validé' : invitation.dgValidation === 'REFUSE' ? 'refusé' : 'à valider'}</Badge>
          </div>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} className="font-mono text-xs" />
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button variant="outline" disabled={busy || text === invitation.letterDraft} onClick={() => patch({ letterDraft: text }, 'Courrier enregistré (repasse en validation DG)')}>
            Enregistrer
          </Button>
          <div className="flex flex-wrap gap-2">
            {canValidate && (
              <>
                <Button variant="outline" disabled={busy} onClick={() => patch({ dgValidation: 'REFUSE' }, 'Courrier refusé')}>Refuser</Button>
                <Button disabled={busy || text !== invitation.letterDraft} className="bg-itf-green hover:bg-itf-green/90" onClick={() => patch({ dgValidation: 'VALIDE' }, 'Courrier validé par le DG')}>
                  Valider (DG)
                </Button>
              </>
            )}
            {validated && mailto && (
              <Button variant="outline" asChild><a href={mailto}>Ouvrir dans ma messagerie</a></Button>
            )}
            <Button disabled={busy || !validated} className="bg-itf-navy hover:bg-itf-navy-deep" onClick={() => patch({ letterStatus: 'ENVOYE' }, 'Courrier marqué envoyé')}>
              Marquer envoyé
            </Button>
          </div>
        </DialogFooter>
        {!validated && <p className="text-xs text-muted-foreground">L’envoi n’est possible qu’après validation du DG sur la version enregistrée.</p>}
        {validated && !invitation.email && <p className="text-xs text-muted-foreground">Aucun email renseigné : imprimez ou transmettez le courrier, puis marquez-le envoyé.</p>}
      </DialogContent>
    </Dialog>
  )
}
