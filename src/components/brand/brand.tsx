import Link from 'next/link'
import Image from 'next/image'
import { EVENT } from '@/config/event'
import { SiteNav } from './site-nav'

export function AnsutLogo({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <Image
      src="/logo-ansut.jpeg"
      alt="ANSUT – Agence Nationale du Service Universel des Télécommunications-TIC"
      width={160}
      height={64}
      className={className}
      priority
    />
  )
}

/** Logotype « IVOIRE tech 2026 forum » reproduit d'après le visuel officiel. */
export function ItfWordmark({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const big = size === 'lg'
  return (
    <div className="inline-flex flex-col leading-[0.85] font-extrabold tracking-tight select-none" aria-label="Ivoire Tech Forum 2026">
      <span className={`text-itf-navy ${big ? 'text-6xl md:text-8xl' : 'text-xl'}`}>
        IVOI<span className="itf-gradient-text">Re</span>
      </span>
      <span className="flex items-center gap-2">
        <span className={`text-itf-navy ${big ? 'text-6xl md:text-8xl' : 'text-xl'}`}>tech</span>
        <span className={`rounded-md bg-itf-navy text-white ${big ? 'px-2 py-1 text-2xl md:text-4xl' : 'px-1 text-xs'}`}>2026</span>
      </span>
      <span className={`itf-gradient-text ${big ? 'text-5xl md:text-7xl' : 'text-lg'}`}>forum</span>
    </div>
  )
}

/** En-tête commun : logo + menu public complet ; `children` = action propre à la page. */
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="container relative mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Accueil">
          <AnsutLogo className="h-9 w-auto" />
          <span className="hidden h-8 w-px bg-border sm:block" />
          <span className="hidden sm:block"><ItfWordmark size="sm" /></span>
        </Link>
        <SiteNav extra={children} />
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="itf-orange-rule bg-white">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-sm md:flex-row">
        <p className="font-medium text-itf-navy">{EVENT.tagline}</p>
        <p className="text-muted-foreground">
          {EVENT.dates} · {EVENT.location} ·{' '}
          <a href={EVENT.website} className="font-semibold text-itf-navy hover:underline" target="_blank" rel="noreferrer">
            www.ansut.ci
          </a>
        </p>
      </div>
    </footer>
  )
}
