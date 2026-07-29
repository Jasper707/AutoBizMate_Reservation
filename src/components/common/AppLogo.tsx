import { Link } from 'react-router-dom'

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="AutoBizMate home">
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className="brand__name">AutoBizMate</span>}
    </Link>
  )
}
