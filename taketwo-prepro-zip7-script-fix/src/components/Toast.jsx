import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const nextId = useRef(1)

  const toast = useCallback((message, kind = 'info') => {
    const id = nextId.current++
    setItems((list) => [...list, { id, message, kind }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3000)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast ' + t.kind}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
