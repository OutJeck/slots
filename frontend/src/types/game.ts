export type SlotSymbol = '🍒' | '🍋' | '🍊' | '🍉'

export type DisplaySymbol = SlotSymbol | 'X' | '-'

export type DisplayRow = [DisplaySymbol, DisplaySymbol, DisplaySymbol]

export interface SessionResponse {
  session_id: string
  credits: number
}

export interface RollResponse {
  session_id: string
  symbols: SlotSymbol[]
  reward: number
  credits: number
}

export interface CashOutResponse {
  session_id: string
  amount: number
}
