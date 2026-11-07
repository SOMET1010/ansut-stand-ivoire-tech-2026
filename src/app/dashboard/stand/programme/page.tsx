"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { categoryMeta } from '@/components/stand/program-category'
import type { ProgramItem } from '@/lib/program'

type Item = ProgramItem & { usage?: { invitations: number; attendances: number; questions: number } }

type Form = {
  title: string; date: string; allDay: boolean; start: string; end: string
  location: string; speaker: string; category: string; description: string; hidden: boolean
}

const EMPTY: Form = { title: '', date: '', allDay: false, start: '', end: '', location: '', speaker: '', category: '', description: '', hidden: false }
// Suggestions de statut : l'équipe peut saisir n'importe quel libellé
const CATEGORY_SUGGESTIONS = ['Talk ANSUT', 'Animation', 'Intervention ANSUT', 'Présence institutionnelle', 'Délégation officielle', 'Événement ANSUT', 'Présence recommandée', 'Présence indispensable']

const hm = (iso: string | null) => (iso ? iso.slice(11, 16) : '')

function toForm(it: Item): Form {
  return {
    title: it.title, date: it.date, allDay: it.allDay, start: it.allDay ? '' : hm(it.startTime), end: hm(it.endTime),
    location: it.location ?? '', speaker: it.speaker ?? '', category: it.category ?? '', description: it.description ?? '', hidden: it.hidden,
  }
}

function payload(f: Form) {
  return { ...f, start: f.allDay ? null : f.start || null, end: f.allDay ? null : f.end || null }
}

export default function ProgrammeEditorPage() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/stand/program')
    setItems(r.ok ? (await r.json()).items : [])
  }, [])
  useEffect(() => { load() }, [load])

  const days = Array.from(new Map((items ?? []).map((i) => [i.date, i.day])).entries())
  const set = (patch: Partial<Form>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e))

  const openNew = () => {
    setError('')
    setEditing({ id: null, form: { ...EMPTY, date: days[days.length - 1]?.[0] ?? '' } })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      const r = await fetch(editing.id ? `/api/stand/program/${editing.id}` : '/api/stand/program', {
        method: editing.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(editing.form)),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setError(data.error ?? 'Enregistrement impossible'); return }
      setEditing(null)
      toast({ title: editing.id ? 'Séquence modifiée' : 'Séquence ajoutée', description: 'Le programme public est à jour.' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const toggleHidden = async (it: Item) => {
    const r = await fetch(`/api/stand/program/${it.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload({ ...toForm(it), hidden: !it.hidden })),
    })
    if (r.ok) { toast({ title: it.hidden ? 'Séquence affichée au programme' : 'Séquence masquée du programme' }); load() }
  }

  const remove = async (it: Item) => {
    if (!confirm(`Supprimer définitivement « ${it.title} » ?`)) return
    const r = await fetch(`/api/stand/program/${it.id}`, { method: 'DELETE' })
    const data = await r.json().catch(() => ({}))
    if (r.ok) { toast({ title: 'Séquence supprimée' }); load() }
    else toast({ title: 'Suppression refusée', description: data.error, variant: 'destructive' })
  }

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-itf-navy" /></div>

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-itf-navy">Programme</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toute modification est visible immédiatement sur le <Link href="/program" target="_blank" className="font-semibold text-itf-navy underline">programme public</Link> et
            utilisée par l’assistant visiteurs. Heures d’Abidjan.
          </p>
        </div>
        <Button onClick={openNew} className="h-11 bg-itf-navy hover:bg-itf-navy-deep"><Plus className="mr-2 h-4 w-4" />Ajouter une séquence</Button>
      </div>

      {items.length === 0 && <p className="text-muted-foreground">Aucune séquence pour le moment.</p>}

      {days.map(([date, day]) => (
        <section key={date} aria-label={day}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-itf-cyan">{day}</h2>
          <ul className="divide-y rounded-xl border">
            {items.filter((i) => i.date === date).map((it) => {
              const meta = categoryMeta(it.category)
              const used = it.usage ? it.usage.invitations + it.usage.attendances + it.usage.questions : 0
              return (
                <li key={it.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${it.hidden ? 'bg-muted/50 opacity-70' : ''}`}>
                  <span className="w-32 shrink-0 text-sm font-bold text-itf-navy">{it.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-itf-navy">{it.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {it.category && <Badge className={`${meta.className} border-0`}>{it.category}</Badge>}
                      {it.hidden && <Badge variant="outline">Masquée</Badge>}
                      {it.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{it.location}</span>}
                      {it.speaker && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{it.speaker}</span>}
                      {used > 0 && it.usage && <span>{it.usage.invitations} invit. · {it.usage.attendances} prés. · {it.usage.questions} quest.</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Modifier ${it.title}`} onClick={() => { setError(''); setEditing({ id: it.id, form: toForm(it) }) }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={it.hidden ? `Afficher ${it.title}` : `Masquer ${it.title}`} onClick={() => toggleHidden(it)}>
                      {it.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Supprimer ${it.title}`} disabled={used > 0} title={used > 0 ? 'Liée à des invitations, présences ou questions : masquez-la' : undefined} onClick={() => remove(it)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'Modifier la séquence' : 'Nouvelle séquence'}</DialogTitle></DialogHeader>
          {editing && (
            <form id="program-form" onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-title">Activité</Label>
                <Textarea id="p-title" required rows={2} value={editing.form.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-date">Date</Label>
                  <Input id="p-date" type="date" required value={editing.form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <Switch id="p-allday" checked={editing.form.allDay} onCheckedChange={(v) => set({ allDay: v })} />
                  <Label htmlFor="p-allday">Toute la journée</Label>
                </div>
              </div>
              {!editing.form.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="p-start">Début</Label>
                    <Input id="p-start" type="time" required value={editing.form.start} onChange={(e) => set({ start: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-end">Fin (facultatif)</Label>
                    <Input id="p-end" type="time" value={editing.form.end} onChange={(e) => set({ end: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-location">Lieu</Label>
                  <Input id="p-location" placeholder="Stand, Plénière…" value={editing.form.location} onChange={(e) => set({ location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-category">Statut</Label>
                  <Input id="p-category" list="p-categories" placeholder="Talk ANSUT…" value={editing.form.category} onChange={(e) => set({ category: e.target.value })} />
                  <datalist id="p-categories">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-speaker">Intervenant ou pilote (facultatif)</Label>
                <Input id="p-speaker" value={editing.form.speaker} onChange={(e) => set({ speaker: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-description">Précisions (facultatif)</Label>
                <Textarea id="p-description" rows={2} value={editing.form.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="p-hidden" checked={editing.form.hidden} onCheckedChange={(v) => set({ hidden: v })} />
                <Label htmlFor="p-hidden">Masquer du programme public</Label>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="submit" form="program-form" disabled={saving} className="bg-itf-navy hover:bg-itf-navy-deep">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
