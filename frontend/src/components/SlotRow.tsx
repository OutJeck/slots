import type { DisplayRow } from '../types/game'

type SlotRowProps = {
  symbols: DisplayRow
}

export function SlotRow({ symbols }: SlotRowProps) {
  return (
    <div className="slot-row" role="group" aria-label="Slot reels">
      {symbols.map((symbol, index) => (
        <div
          key={index}
          className={
            symbol === 'X' ? 'slot-block slot-block--spinning' : 'slot-block'
          }
        >
          {symbol}
        </div>
      ))}
    </div>
  )
}
