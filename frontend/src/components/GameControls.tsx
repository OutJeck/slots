type ActionButtonProps = {
  disabled: boolean
  onClick: () => void
}

export function SpinButton({ disabled, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      className="action-button"
      onClick={onClick}
      disabled={disabled}
    >
      Spin
    </button>
  )
}

export function CashOutButton({ disabled, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      className="action-button cash-out"
      onClick={onClick}
      disabled={disabled}
    >
      Cash Out
    </button>
  )
}
