import { Outlet } from 'react-router-dom'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'

export function PublicLayout() {
  return (
    <div className="site-shell">
      <PublicHeader />
      <Outlet />
      <PublicFooter />
    </div>
  )
}
