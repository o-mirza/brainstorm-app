import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { easeStandard, toastVariants } from "../lib/animations";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
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
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const add = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      const duration = kind === "error" ? 5000 : 2500;
      setToasts((current) => [...current, { id, kind, message }]);
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
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              className={`toast toast-${toast.kind}`}
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.16, ease: easeStandard }}
            >
              <span>{toast.message}</span>
              {toast.kind === "error" ? (
                <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                  <X size={15} />
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
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
