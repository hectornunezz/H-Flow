import { signup } from '@/app/actions'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

const createAdminClientMock = jest.mocked(createAdminClient)
const createClientMock = jest.mocked(createClient)

describe('signup server action', () => {
  const profileQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    insert: jest.fn(),
  }
  const adminClient = { from: jest.fn() }
  const supabaseClient = { auth: { signUp: jest.fn() } }

  beforeEach(() => {
    jest.clearAllMocks()
    profileQuery.select.mockReturnValue(profileQuery)
    profileQuery.eq.mockReturnValue(profileQuery)
    profileQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    profileQuery.insert.mockResolvedValue({ error: null })
    adminClient.from.mockReturnValue(profileQuery)
    createAdminClientMock.mockReturnValue(
      adminClient as ReturnType<typeof createAdminClient>,
    )
    createClientMock.mockResolvedValue(
      supabaseClient as Awaited<ReturnType<typeof createClient>>,
    )
  })

  it('creates a pending coach profile and routes an active session to beta pending', async () => {
    supabaseClient.auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'coach@example.com', identities: [{ id: 'identity-1' }] },
        session: { access_token: 'session-token' },
      },
      error: null,
    })
    const formData = new FormData()
    formData.set('name', 'Coach')
    formData.set('email', ' COACH@EXAMPLE.COM ')
    formData.set('password', 'strong-password')

    await expect(signup(formData)).rejects.toThrow('NEXT_REDIRECT:/beta-pending')

    expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: 'coach@example.com',
      password: 'strong-password',
      options: { data: { full_name: 'Coach' } },
    })
    expect(profileQuery.insert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'coach@example.com',
      full_name: 'Coach',
      role: 'coach',
      is_beta_tester: false,
      is_subscribed: false,
    })
  })

  it('asks users to confirm email before login when Supabase returns no session', async () => {
    supabaseClient.auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-2', email: 'new@example.com', identities: [{ id: 'identity-2' }] },
        session: null,
      },
      error: null,
    })
    const formData = new FormData()
    formData.set('name', 'New Coach')
    formData.set('email', 'new@example.com')
    formData.set('password', 'strong-password')

    await expect(signup(formData)).rejects.toThrow(
      'NEXT_REDIRECT:/register?message=Cuenta%20creada.%20Confirma%20tu%20correo%20para%20iniciar%20sesi%C3%B3n%20y%20solicitar%20acceso%20a%20la%20beta.',
    )
  })
})
