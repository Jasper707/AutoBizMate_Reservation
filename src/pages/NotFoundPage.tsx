import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="message-page">
      <span className="message-page__icon">
        <MapPinOff aria-hidden="true" />
      </span>
      <span className="eyebrow">Page not found</span>
      <h1>This path is not part of today’s queue.</h1>
      <p>The page may have moved, or the address may have been entered incorrectly.</p>
      <Link className="button button--primary" to="/">
        Back to AutoBizMate
      </Link>
    </main>
  )
}
