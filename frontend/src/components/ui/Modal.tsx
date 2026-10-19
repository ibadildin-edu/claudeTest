import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { useOverlay } from './useOverlay'

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, description, onClose, children }: ModalProps) {
  const panelRef = useOverlay<HTMLDivElement>(onClose)
  const titleId = useId()

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div aria-hidden className="absolute inset-0 bg-espresso-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-cream-50 p-6 shadow-overlay outline-none sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-espresso-400">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" className="-mt-1 -mr-2 px-2" aria-label="Закрыть" onClick={onClose}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
