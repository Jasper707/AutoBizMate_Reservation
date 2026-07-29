import { AppRouter } from './app/AppRouter'
import { AuthProvider } from './app/providers/AuthProvider'
import { ThemeProvider } from './app/providers/ThemeProvider'
import { ToastProvider } from './app/providers/ToastProvider'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
