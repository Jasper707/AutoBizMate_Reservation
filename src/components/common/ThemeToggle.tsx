import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../app/providers/providerContexts'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Sun className="theme-toggle__sun" aria-hidden="true" size={18} />
      <Moon className="theme-toggle__moon" aria-hidden="true" size={18} />
      <span className="theme-toggle__thumb" aria-hidden="true" />
    </button>
  )
}
