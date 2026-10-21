import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUserRole } from '@/utils/auth'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPricingPage = pathname === '/pricing' || pathname.startsWith('/pricing/')

  if (pathname === '/login' || isPricingPage) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  let authenticatedUser
  try {
    authenticatedUser = await getAuthenticatedUserRole(supabase)
  } catch (error) {
    console.error(
      '[middleware] No se pudo verificar la sesión o el rol de Supabase:',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json({ error: 'No se pudo verificar la autorización.' }, { status: 503 })
  }

  if (!authenticatedUser) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    const redirectResponse = NextResponse.redirect(loginUrl)

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })

    return redirectResponse
  }

  const isClientPortal = pathname === '/client-portal' || pathname.startsWith('/client-portal/')
  const isCoachDashboard = pathname === '/'
  const roleMismatch =
    (isClientPortal && authenticatedUser.role !== 'athlete') ||
    (isCoachDashboard && authenticatedUser.role !== 'coach')

  if (roleMismatch) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = authenticatedUser.role === 'athlete' ? '/client-portal' : '/'
    redirectUrl.search = ''
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (authenticatedUser.role === 'coach' && !authenticatedUser.isSubscribed) {
    const pricingUrl = request.nextUrl.clone()
    pricingUrl.pathname = '/pricing'
    pricingUrl.search = ''
    const redirectResponse = NextResponse.redirect(pricingUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
