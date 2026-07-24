import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SlotRow } from './SlotRow'

describe('SlotRow', () => {
  it('shows idle symbols when not spinning', () => {
    render(<SlotRow symbols={['🍒', '🍋', '🍊']} />)

    expect(screen.getByText('🍒')).toBeInTheDocument()
    expect(screen.getByText('🍋')).toBeInTheDocument()
    expect(screen.getByText('🍊')).toBeInTheDocument()
    expect(document.querySelector('.slot-reel__strip')).not.toBeInTheDocument()
  })

  it('shows a scrolling strip instead of X while spinning', () => {
    render(<SlotRow symbols={['X', 'X', 'X']} />)

    expect(screen.queryByText('X')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.slot-reel__strip')).toHaveLength(3)
  })
})
