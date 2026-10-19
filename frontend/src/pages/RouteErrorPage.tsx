import { RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { NotFoundPage } from './NotFoundPage'

const reloadPage = () => window.location.reload()

/** `errorElement` of the routes: a render error must not leave a blank screen. */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const message = error instanceof Error ? error.message : 'Неизвестная ошибка'

  return (
    <Card role="alert" className="mx-auto my-10 flex max-w-xl flex-col items-center px-6 py-14 text-center">
      <h2 className="text-2xl font-extrabold tracking-tight">Что-то сломалось</h2>
      <p className="mt-2 text-espresso-400">Страница упала при отрисовке. Обновите её — обычно это помогает.</p>
      <pre className="mt-5 max-w-full overflow-x-auto rounded-xl bg-cream-200 px-4 py-3 text-left text-xs text-espresso-600">
        {message}
      </pre>
      <Button className="mt-8" onClick={reloadPage}>
        <RotateCcw aria-hidden className="size-4" />
        Обновить страницу
      </Button>
    </Card>
  )
}
