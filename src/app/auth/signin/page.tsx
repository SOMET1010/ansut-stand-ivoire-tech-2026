"use client"

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { loginSchema } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

      console.log('Sign in result:', result)

      if (result && typeof result.error === 'string') {
        console.error('Sign in error:', result.error)
        setError(result.error.includes('CredentialsSignin') ? 'Identifiants invalides' : result.error)
      } else {
        console.log('Sign in successful, checking session...')

        try {
          const sessionData = await getSession()

          console.log('Session data after login:', sessionData)

          if (sessionData?.user) {
            // La redirection sera gérée par le middleware
            window.location.href = '/auth/signin'
          } else {
            console.error('No user in session after login')
            setError('Erreur lors de la connexion')
          }
        } catch (error) {
          console.error('Error fetching session:', error)
          setError('Erreur lors de la connexion')
        }
      }
    } catch (error) {
      console.error('Sign in exception:', error)
      setError('Une erreur est survenue')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre espace équipe ANSUT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground">
              Contactez l'administrateur pour obtenir un compte
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}