"use client"

import { useState } from 'react'
import Link from 'next/link'
import { signIn, getSession } from 'next-auth/react'
import { loginSchema } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnsutLogo, ItfWordmark, SiteFooter, SiteHeader } from '@/components/brand/brand'
import { EVENT } from '@/config/event'

export default function SignIn() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema)
  })

  const [error, setError] = useState('')

  const onSubmit = async (data: { email: string; password: string }) => {
    setError('')
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      })

      if (result && typeof result.error === 'string') {
        setError(result.error.includes('CredentialsSignin') ? 'Identifiants invalides' : result.error)
        return
      }

      const sessionData = await getSession()
      if (sessionData?.user) {
        // La redirection selon le rôle est faite par le middleware
        window.location.href = '/auth/signin'
      } else {
        setError('Erreur lors de la connexion')
      }
    } catch {
      setError('Une erreur est survenue, réessayez')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader>
        <Link href="/" className="rounded-md px-3 py-2 font-medium text-itf-navy hover:bg-itf-sky/40">Accueil</Link>
      </SiteHeader>

      <main className="itf-hero-bg flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-itf-cyan/20 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-4">
              <AnsutLogo className="h-12 w-auto" />
              <span className="h-10 w-px bg-border" />
              <ItfWordmark size="sm" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-itf-navy">Espace équipe</h1>
              <p className="mt-1 text-sm text-muted-foreground">Pilotage du stand ANSUT · {EVENT.dates}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-itf-navy">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="prenom.nom@ansut.ci"
                  className="h-11 pl-10"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-itf-navy">Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 pl-10"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" size="lg" className="h-11 w-full bg-itf-navy hover:bg-itf-navy-deep" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accès réservé à l’équipe du stand et à la Direction générale. Pour obtenir un compte, contactez l’administrateur.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
