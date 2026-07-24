type BalanceProps = {
  credits: number
}

export function Balance({ credits }: BalanceProps) {
  return <p className="balance">Credits: {credits}</p>
}
