import { REEL_STRIP_SYMBOLS, type DisplaySymbol } from '../types/game'

type SlotReelProps = {
  symbol: DisplaySymbol
  spinning: boolean
}

const STRIP_CYCLES = 2
const stripSymbols = Array.from({ length: STRIP_CYCLES }, () => [
  ...REEL_STRIP_SYMBOLS,
]).flat()

export function SlotReel({ symbol, spinning }: SlotReelProps) {
  return (
    <div className="slot-reel" aria-live="polite">
      {spinning ? (
        <div className="slot-reel__strip" aria-hidden="true">
          {stripSymbols.map((fruit, index) => (
            <span key={index} className="slot-reel__strip-item">
              {fruit}
            </span>
          ))}
        </div>
      ) : (
        <span className="slot-reel__symbol">{symbol}</span>
      )}
    </div>
  )
}
