import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { getAuthenticatedUserRole } from '../utils/auth'
import { config, proxy } from '../proxy'

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('../utils/auth', () => ({ getAuthenticatedUserRole: jest.fn() }))

const createServerClientMock = jest.mocked(createServerClient)
const getAuthenticatedUserRoleMock = jest.mocked(getAuthenticatedUserRole)

describe('Next.js proxy authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createServerClientMock.mockReturnValue({} as ReturnType<typeof createServerClient>)
  })

  it('redirects a missing Supabase session to login and keeps refreshed cookies', async () => {
    let cookieAdapter: Parameters<typeof createServerClient>[2]['cookies'] | undefined
    createServerClientMock.mockImplementation((_url, _key, options) => {
      cookieAdapter = options.cookies
      return {} as ReturnType<typeof createServerClient>
    })
    getAuthenticatedUserRoleMock.mockImplementation(async () => {
      cookieAdapter?.setAll([{ name: 'sb-refresh-token', value: 'refreshed', options: { path: '/' } }])
      throw new Error('Auth session missing')
    })

    const response = await proxy(new NextRequest('https://hflow.test/dashboard?section=week'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hflow.test/login')
    expect(response.cookies.get('sb-refresh-token')?.value).toBe('refreshed')
  })

  it.each(['/login', '/pricing', '/pricing/pro'])('skips public route %s', async (pathname) => {
    await proxy(new NextRequest(`https://hflow.test${pathname}`))

    expect(createServerClientMock).not.toHaveBeenCalled()
  })

  it('does not intercept API, Next assets, or public files', () => {
    expect(config.matcher).toEqual([
      '/((?!api|_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
    ])
  })

  it('returns a service error for Supabase failures other than a missing session', async () => {
    getAuthenticatedUserRoleMock.mockRejectedValue(new Error('Supabase unavailable'))

    const response = await proxy(new NextRequest('https://hflow.test/dashboard'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'No se pudo verificar la autorización.' })
  })
})
