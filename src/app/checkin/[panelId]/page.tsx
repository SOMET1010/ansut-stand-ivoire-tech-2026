"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SiteHeader, SiteFooter } from '@/components/brand/brand'

type State = { kind: 'unknown' } | { kind: 'form' } | { kind: 'loading' } | { kind: 'done'; panel: string; already: boolean } | { kind: 'error'; message: string }

// Pointage d'un visiteur à une séquence, ouvert par le QR code affiché sur le stand.
export default function CheckinPage() {
  const { panelId } = useParams<{ panelId: string }>()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [panelTitle, setPanelTitle] = useState('')

  const submit = async (body: Record<string, string>) => {
    setState({ kind: 'loading' })
    const res = await fetch('/api/stand/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panelId, ...body }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setState({ kind: 'done', panel: data.panel, already: data.already })
    else if (data.code === 'panel') setState({ kind: 'unknown' })
    else if (data.code === 'registration') {
      // Inscription mémorisée sur ce téléphone mais absente de la base : on repasse au formulaire
      localStorage.removeItem('registrationId')
      setState({ kind: 'form' })
    } else setState({ kind: 'error', message: data.error ?? 'Pointage impossible' })
  }

  useEffect(() => {
    const start = async () => {
      // QR code d'une séquence inconnue : message clair, sans toucher à l'inscription mémorisée
      const res = await fetch(`/api/stand/checkin?panelId=${encodeURIComponent(panelId)}`).catch(() => null)
      if (!res || !res.ok) {
        setState(res?.status === 404 ? { kind: 'unknown' } : { kind: 'error', message: 'Serveur injoignable, réessayez' })
        return
      }
      setPanelTitle((await res.json()).panel ?? '')
      const registrationId = localStorage.getItem('registrationId')
      if (registrationId) submit({ registrationId })
      else setState({ kind: 'form' })
    }
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="itf-hero-bg flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-itf-cyan/20">
          {state.kind === 'loading' && <Loader2 className="mx-auto h-10 w-10 animate-spin text-itf-cyan" />}

          {state.kind === 'unknown' && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-itf-navy">QR code non reconnu</h1>
              <p className="mt-2 text-muted-foreground">Cette séquence n’existe pas ou n’est plus ouverte au pointage. Adressez-vous à l’équipe du stand ANSUT.</p>
              <Button className="mt-6 bg-itf-navy hover:bg-itf-navy-deep" asChild><Link href="/program">Voir le programme</Link></Button>
            </div>
          )}

          {state.kind === 'done' && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-itf-green" />
              <h1 className="mt-4 text-2xl font-bold text-itf-navy">{state.already ? 'Déjà pointé' : 'Présence enregistrée'}</h1>
              <p className="mt-2 text-muted-foreground">{state.panel}</p>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" asChild><Link href="/program">Programme</Link></Button>
                <Button className="bg-itf-navy hover:bg-itf-navy-deep" asChild><Link href="/assistant">Poser une question</Link></Button>
              </div>
            </div>
          )}

          {state.kind === 'form' && (
            <form
              onSubmit={(e) => { e.preventDefault(); submit({ name, organization }) }}
              className="space-y-4"
            >
              <h1 className="text-2xl font-bold text-itf-navy">Je suis présent·e</h1>
              {panelTitle && <p className="font-medium text-itf-navy">{panelTitle}</p>}
              <p className="text-sm text-muted-foreground">
                Pas encore inscrit·e ? <Link href="/register" className="font-semibold text-itf-navy underline">Inscrivez-vous</Link> pour pointer en un geste la prochaine fois.
              </p>
              <Input required minLength={2} placeholder="Nom et prénom" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Organisation (facultatif)" value={organization} onChange={(e) => setOrganization(e.target.value)} />
              <Button type="submit" className="w-full bg-itf-navy hover:bg-itf-navy-deep">Valider ma présence</Button>
            </form>
          )}

          {state.kind === 'error' && (
            <div className="text-center">
              <p className="font-semibold text-destructive">{state.message}</p>
              <Button className="mt-4" variant="outline" onClick={() => setState({ kind: 'form' })}>Réessayer</Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
