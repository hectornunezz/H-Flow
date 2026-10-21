import { describe, expect, it } from 'vitest'
import { beforeEach, vi } from 'vitest'
import { getCoachMetrics } from '@/app/actions/compliance'
import { createClient } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

function createQuery<T>(data: T) {
  const result = Promise.resolve({ data, error: null })
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    maybeSingle: vi.fn(() => result),
    then: result.then.bind(result),
  }

  return query
}

function mockSupabase(athletes: Array<{ id: string }>, reports: Array<{ athlete_id: string }>) {
  const queries = [
    createQuery({ id: 'coach-1', role: 'coach' }),
    createQuery(athletes),
    createQuery(reports),
  ]
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'coach-1' } },
        error: null,
      }),
    },
    from: vi.fn()
      .mockReturnValueOnce(queries[0])
      .mockReturnValueOnce(queries[1])
      .mockReturnValueOnce(queries[2]),
  }

  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
  return client
}

describe('getCoachMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calcula el porcentaje y las revisiones pendientes sin duplicar reportes', async () => {
    const client = mockSupabase(
      [{ id: 'athlete-1' }, { id: 'athlete-2' }, { id: 'athlete-3' }],
      [
        { athlete_id: 'athlete-1' },
        { athlete_id: 'athlete-1' },
        { athlete_id: 'athlete-3' },
        { athlete_id: 'outside-athlete' },
      ],
    )

    await expect(getCoachMetrics('coach-1')).resolves.toEqual({
      complianceRate: 67,
      totalAthletes: 3,
      pendingReviews: 1,
    })
    expect(client.from).toHaveBeenCalledTimes(3)
  })

  it('devuelve cero métricas cuando el coach no tiene atletas', async () => {
    const client = mockSupabase([], [])

    await expect(getCoachMetrics('coach-1')).resolves.toEqual({
      complianceRate: 0,
      totalAthletes: 0,
      pendingReviews: 0,
    })
    expect(client.from).toHaveBeenCalledTimes(2)
  })
})
