import type { DisplayRow } from '../types/game'
import { SlotReel } from './SlotReel'

type SlotRowProps = {
  symbols: DisplayRow
}

export function SlotRow({ symbols }: SlotRowProps) {
  return (
    <div className="slot-row" role="group" aria-label="Slot reels">
      {symbols.map((symbol, index) => (
        <SlotReel key={index} symbol={symbol} spinning={symbol === 'X'} />
      ))}
    </div>
  )
}
