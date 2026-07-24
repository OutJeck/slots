import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./api/game', () => ({
  startGame: vi.fn().mockResolvedValue({
    session_id: 'test-session',
    credits: 10,
  }),
  roll: vi.fn(),
  cashOut: vi.fn(),
}))

describe('App', () => {
  it('shows starting credits and a Spin button after session start', async () => {
    render(<App />)

    expect(await screen.findByText(/credits:\s*10/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spin/i })).toBeInTheDocument()
  })
})
