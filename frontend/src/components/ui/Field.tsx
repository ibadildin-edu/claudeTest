import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const messageId = `${htmlFor}-message`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-espresso-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-sm text-espresso-400">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
