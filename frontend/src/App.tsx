import { useEffect, useRef, useState } from 'react'
import { cashOut, roll, startGame } from './api/game'
import { Balance } from './components/Balance'
import { GameControls } from './components/GameControls'
import { SlotRow } from './components/SlotRow'
import type { DisplayRow, RollResponse } from './types/game'
import './App.css'

type Phase = 'loading' | 'ready' | 'busy' | 'gameover' | 'error'

const SPINNING_ROW: DisplayRow = ['X', 'X', 'X']
const INITIAL_ROW: DisplayRow = ['-', '-', '-']
const REVEAL_DELAYS_MS = [1000, 2000, 3000] as const

function App() {
  const initialized = useRef(false)
  const pendingResultRef = useRef<RollResponse | null>(null)
  const timeoutIdsRef = useRef<number[]>([])
  const spinIdRef = useRef(0)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [symbols, setSymbols] = useState<DisplayRow>(INITIAL_ROW)
  const [phase, setPhase] = useState<Phase>('loading')
  const [finalAmount, setFinalAmount] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function clearRevealTimers() {
    for (const id of timeoutIdsRef.current) {
      window.clearTimeout(id)
    }
    timeoutIdsRef.current = []
  }

  function scheduleReveals(result: RollResponse, spinId: number) {
    REVEAL_DELAYS_MS.forEach((ms, index) => {
      const id = window.setTimeout(() => {
        if (spinIdRef.current !== spinId) {
          return
        }

        setSymbols((prev) => {
          const next: DisplayRow = [...prev]
          next[index] = result.symbols[index]
          return next
        })

        if (index === 2) {
          setCredits(result.credits)
          setPhase('ready')
          pendingResultRef.current = null
        }
      }, ms)
      timeoutIdsRef.current.push(id)
    })
  }

  useEffect(() => {
    return () => {
      clearRevealTimers()
    }
  }, [])

  useEffect(() => {
    if (initialized.current) {
      return
    }
    initialized.current = true

    async function bootstrap() {
      setPhase('loading')
      try {
        const session = await startGame()
        setSessionId(session.session_id)
        setCredits(session.credits)
        setPhase('ready')
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to start game',
        )
        setPhase('error')
      }
    }

    void bootstrap()
  }, [])

  const canSpin = phase === 'ready' && sessionId !== null && credits >= 1
  const canCashOut = phase === 'ready' && sessionId !== null

  async function handleSpin() {
    if (!canSpin || !sessionId) {
      return
    }

    clearRevealTimers()
    const previousSymbols = symbols
    const previousCredits = credits
    spinIdRef.current += 1
    const spinId = spinIdRef.current

    setPhase('busy')
    setSymbols(SPINNING_ROW)
    setCredits((current) => current - 1)
    setErrorMessage(null)

    try {
      const result = await roll(sessionId)
      if (spinIdRef.current !== spinId) {
        return
      }
      pendingResultRef.current = result
      scheduleReveals(result, spinId)
    } catch (error) {
      clearRevealTimers()
      spinIdRef.current += 1
      setSymbols(previousSymbols)
      setCredits(previousCredits)
      setErrorMessage(
        error instanceof Error ? error.message : 'Spin failed',
      )
      setPhase('ready')
      pendingResultRef.current = null
    }
  }

  async function handleCashOut() {
    if (!canCashOut || !sessionId) {
      return
    }

    setPhase('busy')
    setErrorMessage(null)

    try {
      const result = await cashOut(sessionId)
      setFinalAmount(result.amount)
      setSessionId(null)
      setPhase('gameover')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Cash out failed',
      )
      setPhase('ready')
    }
  }

  return (
    <main className="app">
      <h1>Slot Machine</h1>

      {phase === 'loading' && <p className="status">Starting session…</p>}

      {phase !== 'loading' && phase !== 'error' && (
        <>
          {phase !== 'gameover' && <Balance credits={credits} />}
          <SlotRow symbols={symbols} />
          <GameControls
            canSpin={canSpin}
            canCashOut={canCashOut}
            onSpin={() => {
              void handleSpin()
            }}
            onCashOut={() => {
              void handleCashOut()
            }}
          />
        </>
      )}

      {phase === 'gameover' && finalAmount !== null && (
        <p className="game-over">
          Game Over — cashed out {finalAmount} credits
        </p>
      )}

      {errorMessage && <p className="error">{errorMessage}</p>}
    </main>
  )
}

export default App
