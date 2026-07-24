import { useEffect, useRef, useState } from 'react'
import { cashOut, roll, startGame } from './api/game'
import { Balance } from './components/Balance'
import { GameControls } from './components/GameControls'
import { SlotRow } from './components/SlotRow'
import './App.css'

type Phase = 'loading' | 'ready' | 'busy' | 'gameover' | 'error'

function App() {
  const initialized = useRef(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [symbols, setSymbols] = useState<[string, string, string]>([
    '-',
    '-',
    '-',
  ])
  const [phase, setPhase] = useState<Phase>('loading')
  const [finalAmount, setFinalAmount] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

    setPhase('busy')
    setErrorMessage(null)

    try {
      const result = await roll(sessionId)
      const [a, b, c] = result.symbols
      setSymbols([a, b, c])
      setCredits(result.credits)
      setPhase('ready')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Spin failed',
      )
      setPhase('ready')
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
