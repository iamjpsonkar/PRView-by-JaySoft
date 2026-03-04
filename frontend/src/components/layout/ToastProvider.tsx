import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);

const toastColors: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: '#dff6dd', border: '#107c10', color: '#107c10' },
  error: { bg: '#fdd8db', border: '#d13438', color: '#d13438' },
  info: { bg: '#e0efff', border: '#0078d4', color: '#0078d4' },
  warning: { bg: '#fff4ce', border: '#ca5010', color: '#ca5010' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => {
          const c = toastColors[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                background: c.bg, border: `1px solid ${c.border}`, color: c.color,
                padding: '12px 16px', borderRadius: 8, fontSize: 14,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280, maxWidth: 420,
                display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto',
                animation: 'toast-slide-in 0.3s ease-out',
              }}
            >
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none', border: 'none', color: c.color,
                  cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
                }}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
