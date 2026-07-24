import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as gameApi from './api/game'
import App from './App'
import type { RollResponse } from './types/game'

vi.mock('./api/game', () => ({
  startGame: vi.fn(),
  roll: vi.fn(),
  cashOut: vi.fn(),
}))

const startGame = vi.mocked(gameApi.startGame)
const roll = vi.mocked(gameApi.roll)
const cashOut = vi.mocked(gameApi.cashOut)

async function renderReadyApp() {
  render(<App />)
  expect(await screen.findByText(/credits:\s*10/i)).toBeInTheDocument()
}

describe('App', () => {
  beforeEach(() => {
    startGame.mockResolvedValue({
      session_id: 'test-session',
      credits: 10,
    })
    roll.mockReset()
    cashOut.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows starting credits and a Spin button after session start', async () => {
    await renderReadyApp()
    expect(screen.getByRole('button', { name: /spin/i })).toBeInTheDocument()
  })

  it('shows an error and hides Spin when session start fails', async () => {
    startGame.mockRejectedValue(new Error('Failed to start game'))

    render(<App />)

    expect(await screen.findByText(/failed to start game/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /spin/i }),
    ).not.toBeInTheDocument()
  })

  it('optimistically deducts a credit and reveals symbols on a staggered schedule', async () => {
    roll.mockResolvedValue({
      session_id: 'test-session',
      symbols: ['🍒', '🍋', '🍊'],
      reward: 0,
      credits: 9,
    })

    await renderReadyApp()
    vi.useFakeTimers()

    fireEvent.click(screen.getByRole('button', { name: /spin/i }))

    expect(screen.getByText(/credits:\s*9/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spin/i })).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(
      document.querySelectorAll('.slot-reel__symbol')[0],
    ).toHaveTextContent('🍒')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(
      document.querySelectorAll('.slot-reel__symbol')[1],
    ).toHaveTextContent('🍋')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    const revealed = [...document.querySelectorAll('.slot-reel__symbol')].map(
      (el) => el.textContent,
    )
    expect(revealed).toEqual(['🍒', '🍋', '🍊'])
    expect(screen.getByText(/credits:\s*9/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spin/i })).toBeEnabled()
  })

  it('disables Spin and Cash Out while a roll is in flight', async () => {
    let resolveRoll!: (value: RollResponse) => void
    roll.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRoll = resolve
        }),
    )

    await renderReadyApp()

    fireEvent.click(screen.getByRole('button', { name: /spin/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /spin/i })).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: /cash out/i })).toBeDisabled()

    await act(async () => {
      resolveRoll({
        session_id: 'test-session',
        symbols: ['🍒', '🍋', '🍊'],
        reward: 0,
        credits: 9,
      })
    })
  })

  it('shows Game Over with account balance after cash out', async () => {
    cashOut.mockResolvedValue({
      session_id: 'test-session',
      amount: 10,
      account_balance: 10,
    })

    await renderReadyApp()

    fireEvent.click(screen.getByRole('button', { name: /cash out/i }))

    expect(
      await screen.findByText(
        /game over — cashed out 10 credits \(account: 10\)/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /spin/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /cash out/i }),
    ).not.toBeInTheDocument()
  })

  it('restores UI state when a roll fails', async () => {
    roll.mockRejectedValue(new Error('400: Insufficient credits'))

    await renderReadyApp()

    fireEvent.click(screen.getByRole('button', { name: /spin/i }))

    expect(
      await screen.findByText(/400: insufficient credits/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/credits:\s*10/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spin/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /cash out/i })).toBeEnabled()
  })
})
