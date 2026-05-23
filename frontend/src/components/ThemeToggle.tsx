import { useThemeStore } from '../store/themeStore'
import '../theme.css'

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-theme-toggle"
      title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
