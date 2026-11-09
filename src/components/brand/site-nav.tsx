"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Menu, X } from 'lucide-react'

// Menu public unique : mêmes entrées sur toutes les pages, tiroir sur téléphone.
export const PUBLIC_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/program', label: 'Programme' },
  { href: '/register', label: 'S’inscrire' },
  { href: '/jouer', label: 'Jouer', accent: true },
  { href: '/assistant', label: 'Assistant' },
] as const

export function SiteNav({ extra }: { extra?: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])

  const role = session?.user?.role
  const isStaff = role === 'ADMIN' || role === 'ORGANIZER'
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const linkClass = (href: string, accent?: boolean) =>
    `rounded-md px-3 py-2 font-medium transition-colors ${
      active(href) ? 'bg-itf-sky text-itf-navy' : accent ? 'text-itf-orange hover:bg-itf-sky' : 'text-itf-navy hover:bg-itf-sky'
    }`

  const teamLink = isStaff ? (
    <Link href="/dashboard/stand" className="rounded-md border border-itf-navy px-3 py-2 font-semibold text-itf-navy hover:bg-itf-sky">Espace équipe</Link>
  ) : (
    <Link href="/auth/signin" className="rounded-md px-3 py-2 font-medium text-itf-navy/70 hover:bg-itf-sky">Espace équipe</Link>
  )

  return (
    <>
      {/* Ordinateur */}
      <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Navigation principale">
        {PUBLIC_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(l.href, 'accent' in l)} aria-current={active(l.href) ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
        {extra}
        {teamLink}
        {session && (
          <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-md p-2 text-itf-navy hover:bg-itf-sky" aria-label="Déconnexion" title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </nav>

      {/* Téléphone / tablette */}
      <div className="flex items-center gap-2 lg:hidden">
        <Link href="/jouer" className="rounded-md px-3 py-2 text-sm font-bold text-itf-orange">Jouer</Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-md border text-itf-navy"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="absolute inset-x-0 top-full border-b bg-white shadow-lg lg:hidden" aria-label="Navigation principale">
          <ul className="container mx-auto flex flex-col px-4 py-2">
            {PUBLIC_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`block py-3 text-base ${linkClass(l.href, 'accent' in l)}`} aria-current={active(l.href) ? 'page' : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
            {extra && <li className="py-2">{extra}</li>}
            <li className="border-t py-2">
              <Link href={isStaff ? '/dashboard/stand' : '/auth/signin'} className="block rounded-md px-3 py-3 text-base font-semibold text-itf-navy hover:bg-itf-sky">
                Espace équipe
              </Link>
            </li>
            {session && (
              <li>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-base text-itf-navy hover:bg-itf-sky">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </>
  )
}
