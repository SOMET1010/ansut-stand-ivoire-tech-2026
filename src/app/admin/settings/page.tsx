"use client"

import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'

type Status = {
  enabled: boolean
  source: 'admin' | 'env' | 'none'
  maskedKey: string | null
  model: string
  defaultModel: string
  updatedAt: string | null
  updatedBy: string | null
}

type TestResult = { ok: boolean; error?: string; model?: string; modelName?: string }

const SOURCE_LABEL: Record<Status['source'], string> = {
  admin: 'Saisie dans l’administration',
  env: 'Fichier d’environnement du serveur',
  none: 'Aucune',
}

export default function AISettingsPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loadError, setLoadError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | 'clear' | null>(null)
  const [test, setTest] = useState<TestResult | null>(null)

  const apply = (s: Status) => {
    setStatus(s)
    setModel(s.model === s.defaultModel ? '' : s.model)
  }

  useEffect(() => {
    fetch('/api/admin/settings/ai')
      .then(async (r) => (r.ok ? apply(await r.json()) : setLoadError('Réglages inaccessibles')))
      .catch(() => setLoadError('Serveur injoignable'))
  }, [])

  const call = async (method: 'PUT' | 'POST', body: object) => {
    const r = await fetch('/api/admin/settings/ai', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { ok: r.ok, data: await r.json().catch(() => ({})) }
  }

  const runTest = async () => {
    setBusy('test')
    setTest(null)
    try {
      const { data } = await call('POST', { apiKey: apiKey.trim() || undefined, model: model.trim() || undefined })
      setTest(data as TestResult)
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    setBusy('save')
    try {
      const key = apiKey.trim()
      // Une nouvelle clé est vérifiée avant d'être enregistrée
      if (key) {
        const { data } = await call('POST', { apiKey: key, model: model.trim() || undefined })
        setTest(data as TestResult)
        if (!data.ok) return
      }
      const { ok, data } = await call('PUT', { apiKey: key || undefined, model: model.trim() })
      if (!ok) {
        toast({ title: 'Enregistrement refusé', description: data.error, variant: 'destructive' })
        return
      }
      apply(data as Status)
      setApiKey('')
      toast({ title: 'Réglages IA enregistrés', description: 'Les agents du stand les utilisent dans les 30 secondes.' })
    } finally {
      setBusy(null)
    }
  }

  const clearKey = async () => {
    if (!confirm('Retirer la clé saisie ? Les agents utiliseront la clé du serveur s’il y en a une, sinon le mode sans IA.')) return
    setBusy('clear')
    try {
      const { ok, data } = await call('PUT', { clearKey: true })
      if (ok) {
        apply(data as Status)
        setTest(null)
        toast({ title: 'Clé retirée' })
      }
    } finally {
      setBusy(null)
    }
  }

  if (loadError) return <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
  if (!status) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-itf-navy" /></div>

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-itf-navy">Réglages IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clé d’API Anthropic utilisée par les agents du stand : assistant visiteurs, invitations, modération des questions,
          bilan du jour et génération de quiz. Sans clé, chaque agent fonctionne en mode sans IA, signalé à l’écran.
        </p>
      </div>

      <section className="rounded-xl border p-5" aria-label="État actuel">
        <div className="flex flex-wrap items-center gap-3">
          {status.enabled ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />IA activée</Badge>
          ) : (
            <Badge variant="secondary"><XCircle className="mr-1 h-3.5 w-3.5" />Mode sans IA</Badge>
          )}
          <span className="text-sm text-muted-foreground">Modèle : <strong className="text-itf-navy">{status.model}</strong></span>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Clé en vigueur</dt>
          <dd className="font-mono">{status.maskedKey ?? '—'}</dd>
          <dt className="text-muted-foreground">Provenance</dt>
          <dd>{SOURCE_LABEL[status.source]}</dd>
          {status.updatedAt && (
            <>
              <dt className="text-muted-foreground">Dernière modification</dt>
              <dd>{new Date(status.updatedAt).toLocaleString('fr-FR')}{status.updatedBy ? ` · ${status.updatedBy}` : ''}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="space-y-5" aria-label="Modifier">
        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-itf-navy">{status.source === 'admin' ? 'Remplacer la clé' : 'Clé d’API Anthropic'}</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="apiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-…"
              className="h-11 pl-10 font-mono"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTest(null) }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            À créer sur console.anthropic.com › API Keys. Elle est chiffrée en base et n’est plus jamais réaffichée en entier.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className="text-itf-navy">Modèle (facultatif)</Label>
          <Input
            id="model"
            className="h-11 font-mono"
            placeholder={status.defaultModel}
            value={model}
            onChange={(e) => { setModel(e.target.value); setTest(null) }}
          />
          <p className="text-xs text-muted-foreground">Laisser vide pour le modèle par défaut ({status.defaultModel}).</p>
        </div>

        {test && (
          <Alert variant={test.ok ? 'default' : 'destructive'} className={test.ok ? 'border-emerald-300 bg-emerald-50' : ''}>
            <AlertDescription className="flex items-center gap-2">
              {test.ok ? <ShieldCheck className="h-4 w-4 text-emerald-700" /> : <XCircle className="h-4 w-4" />}
              {test.ok ? `Clé valide : ${test.modelName ?? test.model} accessible.` : test.error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={save} disabled={busy !== null} className="h-11 bg-itf-navy hover:bg-itf-navy-deep">
            {busy === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
          </Button>
          <Button variant="outline" onClick={runTest} disabled={busy !== null || (!apiKey.trim() && !status.enabled)} className="h-11">
            {busy === 'test' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tester la clé
          </Button>
          {status.source === 'admin' && (
            <Button variant="ghost" onClick={clearKey} disabled={busy !== null} className="h-11 text-destructive hover:text-destructive">
              Retirer la clé saisie
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
