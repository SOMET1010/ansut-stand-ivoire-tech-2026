"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

/** Interroge une URL à intervalle régulier (temps réel simple, compatible tout hébergement). */
export function usePoll<T>(url: string | null, intervalMs = 1500) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const offset = useRef(0) // décalage horloge serveur - client

  const refresh = useCallback(async () => {
    if (!url) return
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`)
      if (typeof json.serverNow === 'number') offset.current = json.serverNow - Date.now()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion perdue')
    }
  }, [url])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, intervalMs)
    return () => clearInterval(t)
  }, [refresh, intervalMs])

  return { data, error, refresh, serverNow: () => Date.now() + offset.current }
}

/** Secondes restantes avant une échéance serveur. */
export function useCountdown(deadline: number | null | undefined, serverNow: () => number) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!deadline) return setLeft(0)
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - serverNow()) / 1000)))
    tick()
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [deadline, serverNow])
  return left
}

/** Identifiant anonyme et stable du téléphone. */
export function voterId(): string {
  try {
    let id = localStorage.getItem('itf-voter')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('itf-voter', id)
    }
    return id
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2, 12)
  }
}
