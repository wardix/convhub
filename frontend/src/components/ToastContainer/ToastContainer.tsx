import { useToast } from '../../hooks/useToast'
import styles from './ToastContainer.module.css'

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role="alert"
        >
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => removeToast(toast.id)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
