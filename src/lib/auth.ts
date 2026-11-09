import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
}

const logger: Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }))
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta }))
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }))
  }
}

// Rate limiting implementation
const checkRateLimit = async (email: string): Promise<boolean> => {
  // TODO: Implement proper rate limiting with Redis
  return false
}

interface Env {
  NEXTAUTH_SECRET: string
  ORGANIZER_PASSWORD?: string
  ATTENDEE_PASSWORD?: string
  DEMO_PASSWORD?: string
  NODE_ENV?: 'development' | 'production' | 'test'
}

const env = process.env as unknown as Env

// Seule variable réellement utilisée (ADMIN_EMAIL / ADMIN_PASSWORD étaient exigées mais jamais lues).
const requiredEnvVars: (keyof Env)[] = ['NEXTAUTH_SECRET']

for (const envVar of requiredEnvVars) {
  if (!env[envVar]) {
    throw new Error(`${envVar} is not set`)
  }
}


const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn('Missing credentials')
          return null
        }

        // Rate limiting check
        const isRateLimited = await checkRateLimit(credentials.email)
        if (isRateLimited) {
          logger.warn(`Rate limited for email: ${credentials.email}`)
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            // @ts-ignore - passwordHash exists but not in generated types
            passwordHash: true
          }
        })

        if (!user || !user.passwordHash) {
          logger.warn(`Invalid user or password hash for: ${credentials.email}`)
          return null
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!passwordValid) {
          logger.warn(`Invalid password attempt for: ${credentials.email}`)
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      logger.info('JWT callback called', { user, token })
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      logger.info('Session callback called', {
        tokenPresent: !!token,
        tokenContent: token,
        sessionInitial: session
      })
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
      }
      logger.info('Session after modification', { session })
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/'
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // Update session daily
  },
  secret: env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: env.NODE_ENV === 'production'
        ? `__Secure-next-auth.session-token`
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    }
  },
  useSecureCookies: env.NODE_ENV === 'production',
  debug: false

}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions }
