import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { logger } from './lib/logger'

export async function middleware(request: NextRequest) {
  let token
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    })
  } catch (error) {
    logger.error('JWT decryption error, clearing session and redirecting to login', { error })
    // Clear the session cookie and redirect to login
    const response = NextResponse.redirect(new URL('/auth/signin', request.url))
    response.cookies.delete('next-auth.session-token')
    response.cookies.delete('next-auth.csrf-token')
    return response
  }
  
  const { pathname } = request.nextUrl

  logger.info('Middleware - Path', { pathname })
  logger.info('Middleware - Token present', { tokenPresent: !!token })

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!token && (
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/ecran') || 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/events/create') ||
    pathname.startsWith('/admin-simple')
  )) {
    logger.info('Redirecting to signin - no token')
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Si l'utilisateur est connecté
  if (token) {
    const userRole = token.role as string
    logger.info('User role', { userRole })

    // Redirection selon le rôle après connexion (uniquement depuis la page de connexion)
    if (pathname === '/auth/signin') {
      logger.info('Redirecting from signin based on role', { userRole })
      if (userRole === 'ADMIN' || userRole === 'ORGANIZER') {
        // DG et équipe arrivent directement sur le pilotage du stand
        return NextResponse.redirect(new URL('/dashboard/stand', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Protection des routes admin
    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      logger.info('Access denied to admin route for role', { userRole })
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Protection des routes admin-simple
    if (pathname.startsWith('/admin-simple') && userRole !== 'ADMIN') {
      logger.info('Access denied to admin-simple route for role', { userRole })
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Protection des routes dashboard
    if ((pathname.startsWith('/dashboard') || pathname.startsWith('/ecran')) && userRole !== 'ORGANIZER' && userRole !== 'ADMIN') {
      logger.info('Access denied to dashboard route for role', { userRole })
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Protection des routes de création d'événements
    if (pathname.startsWith('/events/create') && userRole !== 'ORGANIZER' && userRole !== 'ADMIN') {
      logger.info('Access denied to events/create route for role', { userRole })
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ecran/:path*',
    '/admin/:path*',
    '/admin-simple/:path*',
    '/events/create/:path*',
    '/auth/signin',
  ],
}
