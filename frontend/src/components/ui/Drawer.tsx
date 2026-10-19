import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { useOverlay } from './useOverlay'

interface DrawerProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}

export function Drawer({ title, onClose, children }: DrawerProps) {
  const panelRef = useOverlay<HTMLDivElement>(onClose)
  const titleId = useId()

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden className="absolute inset-0 bg-espresso-900/30" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col bg-cream-50 shadow-overlay outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-cream-300 px-6 py-5">
          <h2 id={titleId} className="text-xl font-bold tracking-tight">
            {title}
          </h2>
          <Button variant="ghost" size="sm" className="-mr-2 px-2" aria-label="Закрыть" onClick={onClose}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
