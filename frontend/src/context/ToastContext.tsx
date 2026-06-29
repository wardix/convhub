import { type ReactNode, createContext, useCallback, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type: ToastType) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, message, type }])

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
