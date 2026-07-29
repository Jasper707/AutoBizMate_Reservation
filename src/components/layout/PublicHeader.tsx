import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../app/providers/providerContexts'
import { AppLogo } from '../common/AppLogo'
import { ThemeToggle } from '../common/ThemeToggle'

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { status } = useAuth()

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false)
    window.addEventListener('resize', closeMenu)
    return () => window.removeEventListener('resize', closeMenu)
  }, [])

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <AppLogo />

        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="public-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <nav
          className={`public-nav${menuOpen ? ' public-nav--open' : ''}`}
          id="public-navigation"
          aria-label="Main navigation"
        >
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/about" onClick={() => setMenuOpen(false)}>
            About
          </NavLink>
          <NavLink
            className="nav-cta"
            to={status === 'authorized' ? '/staff' : '/login'}
            onClick={() => setMenuOpen(false)}
          >
            {status === 'authorized' ? 'Open Queue' : 'Staff Login'}
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
