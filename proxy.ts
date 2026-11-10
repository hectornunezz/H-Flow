import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUserRole } from '@/utils/auth'
import { paymentsEnabled } from '@/utils/features'

function redirectTo(request: NextRequest, response: NextResponse, pathname: string) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = pathname
  redirectUrl.search = ''
  const redirectResponse = NextResponse.redirect(redirectUrl)

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })

  return redirectResponse
}

function redirectWithoutSession(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = pathname
  redirectUrl.search = ''
  return NextResponse.redirect(redirectUrl)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPricingPage = pathname === '/pricing' || pathname.startsWith('/pricing/')

  if (pathname === '/login' || pathname === '/beta-pending') {
    return NextResponse.next()
  }
  if (isPricingPage) {
    return paymentsEnabled()
      ? NextResponse.next()
      : redirectWithoutSession(request, '/login')
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
    if (error instanceof Error && error.message.includes('Auth session missing')) {
      return redirectTo(request, response, '/login')
    }

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'hflow-web',
        event: 'supabase_authorization_check_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    )
    return NextResponse.json({ error: 'No se pudo verificar la autorización.' }, { status: 503 })
  }

  if (!authenticatedUser) {
    return redirectTo(request, response, '/login')
  }

  if (!authenticatedUser.isBetaTester) {
    return redirectTo(request, response, '/beta-pending')
  }

  if (!authenticatedUser.role) {
    return redirectTo(request, response, '/login')
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

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)'],
}
