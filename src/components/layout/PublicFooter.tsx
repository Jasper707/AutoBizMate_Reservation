import { Link } from 'react-router-dom'
import { AppLogo } from '../common/AppLogo'

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <AppLogo />
          <p>
            Practical queue and scheduling automation for businesses where walk-ins
            matter.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/login">Staff Login</Link>
        </nav>
        <p className="public-footer__legal">
          © {new Date().getFullYear()} AutoBizMate. Built for better service days.
        </p>
      </div>
    </footer>
  )
}
