/**
 * Toast notification system with undo support.
 * Usage: const { showToast, ToastContainer } = useToast()
 * showToast({ message, onUndo? })
 */
import { useState, useCallback, useRef } from 'react'

export interface ToastOptions {
  message: string
  onUndo?: () => void
  duration?: number // ms, default 4000
}

interface ToastItem extends ToastOptions {
  id: number
  exiting: boolean
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    // Mark as exiting first (animation), then remove
    setToasts(t => t.map(x => x.id === id ? { ...x, exiting: true } : x))
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 220)
  }, [])

  const showToast = useCallback((opts: ToastOptions) => {
    const id = ++counterRef.current
    const duration = opts.duration ?? 4000
    setToasts(t => [...t, { ...opts, id, exiting: false }])
    const timer = setTimeout(() => dismiss(id), duration)
    return () => { clearTimeout(timer); dismiss(id) }
  }, [dismiss])

  function ToastContainer() {
    return (
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast${t.exiting ? ' exiting' : ''}`} role="status">
            <span className="toast-msg">{t.message}</span>
            {t.onUndo && (
              <button
                className="toast-undo"
                onClick={() => { t.onUndo!(); dismiss(t.id) }}
              >
                Undo
              </button>
            )}
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    )
  }

  return { showToast, ToastContainer }
}
