import { Link } from 'react-router'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'

interface NotFoundPageProps {
  title?: string
  description?: string
}

export function NotFoundPage({
  title = 'Такой страницы нет',
  description = 'Возможно, ссылка устарела или в адресе опечатка.',
}: NotFoundPageProps) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-brand-500">404</p>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-sm text-espresso-400">{description}</p>
      <Link to="/" className={buttonClassName('primary', 'md', 'mt-8')}>
        На дашборд
      </Link>
    </Card>
  )
}
