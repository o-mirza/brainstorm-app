import { X } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  exiting: boolean;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 160);
  }, []);

  const add = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      const duration = kind === "error" ? 5000 : 2500;
      setToasts((current) => [...current, { id, kind, message, exiting: false }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) {
        window.clearTimeout(timer);
      }
      timers.current.clear();
    };
  }, []);

  const value = useMemo<ToastApi>(
    () => ({
      success: (message) => add("success", message),
      error: (message) => add("error", message),
      info: (message) => add("info", message)
    }),
    [add]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            className={`toast toast-${toast.kind} ${toast.exiting ? "toast-exiting" : ""}`}
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            <span>{toast.message}</span>
            {toast.kind === "error" ? (
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return toast;
}
