import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import {
  ToastContext,
  type ToastTone,
} from './providerContexts'

type ToastMessage = {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now()
      setToasts((items) => [...items, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast toast--${toast.tone}`} key={toast.id} role="status">
            {toast.tone === 'success' ? (
              <CheckCircle2 aria-hidden="true" size={20} />
            ) : (
              <CircleAlert aria-hidden="true" size={20} />
            )}
            <span>{toast.message}</span>
            <button
              className="icon-button icon-button--small"
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
