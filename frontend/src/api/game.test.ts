import { afterEach, describe, expect, it, vi } from 'vitest'
import { cashOut, roll, startGame } from './game'

describe('api/game', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns JSON on successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'abc', credits: 10 }),
      }),
    )

    await expect(startGame()).resolves.toEqual({
      session_id: 'abc',
      credits: 10,
    })
  })

  it('throws status and detail when the response is not OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ detail: 'Insufficient credits' }),
      }),
    )

    await expect(roll('session-1')).rejects.toThrow('400: Insufficient credits')
  })

  it('posts to the cashout endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: 'session-1',
        amount: 10,
        account_balance: 10,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(cashOut('session-1')).resolves.toEqual({
      session_id: 'session-1',
      amount: 10,
      account_balance: 10,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/game/session-1/cashout',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
