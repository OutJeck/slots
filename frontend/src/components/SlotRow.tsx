type SlotRowProps = {
  symbols: [string, string, string]
}

export function SlotRow({ symbols }: SlotRowProps) {
  return (
    <div className="slot-row" role="group" aria-label="Slot reels">
      {symbols.map((symbol, index) => (
        <div key={index} className="slot-block">
          {symbol}
        </div>
      ))}
    </div>
  )
}
