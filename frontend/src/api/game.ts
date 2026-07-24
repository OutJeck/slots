import type {
  CashOutResponse,
  RollResponse,
  SessionResponse,
} from '../types/game'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { detail?: string }
      if (body.detail) {
        detail = body.detail
      }
    } catch {
      // keep statusText
    }
    throw new Error(`${response.status}: ${detail}`)
  }

  return response.json() as Promise<T>
}

export function startGame(): Promise<SessionResponse> {
  return request<SessionResponse>('/api/game/start', { method: 'POST' })
}

export function roll(sessionId: string): Promise<RollResponse> {
  return request<RollResponse>(`/api/game/${sessionId}/roll`, {
    method: 'POST',
  })
}

export function cashOut(sessionId: string): Promise<CashOutResponse> {
  return request<CashOutResponse>(`/api/game/${sessionId}/cashout`, {
    method: 'POST',
  })
}
