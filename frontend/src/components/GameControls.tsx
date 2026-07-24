type GameControlsProps = {
  canSpin: boolean
  canCashOut: boolean
  onSpin: () => void
  onCashOut: () => void
}

export function GameControls({
  canSpin,
  canCashOut,
  onSpin,
  onCashOut,
}: GameControlsProps) {
  return (
    <div className="controls">
      <button type="button" onClick={onSpin} disabled={!canSpin}>
        Spin
      </button>
      <button type="button" onClick={onCashOut} disabled={!canCashOut}>
        Cash Out
      </button>
    </div>
  )
}
