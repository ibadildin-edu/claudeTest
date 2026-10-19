import { useCallback, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/Input'

interface AmountInputProps {
  label: string
  leading: string
  value: number | undefined
  /** Called on blur or Enter, so typing «3500» does not push four URLs into history. */
  onCommit: (value: number | undefined) => void
}

const onlyDigits = (raw: string) => raw.replace(/\D/g, '')

export function AmountInput({ label, leading, value, onCommit }: AmountInputProps) {
  const external = value === undefined ? '' : String(value)
  const [draft, setDraft] = useState(external)
  const [synced, setSynced] = useState(external)

  // The URL changed from outside (reset, back button): show the new value.
  if (synced !== external) {
    setSynced(external)
    setDraft(external)
  }

  const commit = useCallback(() => {
    const next = draft === '' ? undefined : Number(draft)
    if (next !== value) onCommit(next)
  }, [draft, value, onCommit])

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraft(onlyDigits(event.target.value))
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') commit()
    },
    [commit],
  )

  return (
    <Input
      aria-label={label}
      leading={leading}
      trailing="₸"
      inputMode="numeric"
      placeholder="0"
      className="flex-1"
      value={draft}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
