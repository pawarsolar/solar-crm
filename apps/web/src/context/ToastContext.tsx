import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: { title?: string; duration?: number }) => void;
  removeToast: (id: string) => void;
  success: (message: string, options?: { title?: string; duration?: number }) => void;
  error: (message: string, options?: { title?: string; duration?: number }) => void;
  warning: (message: string, options?: { title?: string; duration?: number }) => void;
  info: (message: string, options?: { title?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Standalone global dispatcher so toast can be called outside of React components
type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();

export const toast = {
  show: (message: string, type: ToastType = 'info', options?: { title?: string; duration?: number }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const item: ToastItem = {
      id,
      type,
      message,
      title: options?.title,
      duration: options?.duration ?? (type === 'error' ? 5500 : 4000),
    };
    listeners.forEach((fn) => fn(item));
    return id;
  },
  success: (message: string, options?: { title?: string; duration?: number }) =>
    toast.show(message, 'success', options),
  error: (message: string, options?: { title?: string; duration?: number }) =>
    toast.show(message, 'error', options),
  warning: (message: string, options?: { title?: string; duration?: number }) =>
    toast.show(message, 'warning', options),
  info: (message: string, options?: { title?: string; duration?: number }) =>
    toast.show(message, 'info', options),
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [...prev.slice(-4), item]); // keep max 5 on screen

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        removeToast(item.id);
      }, item.duration);
    }
  }, [removeToast]);

  useEffect(() => {
    listeners.add(addToast);

    // Intercept native browser alert to route to modern toast permanently
    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msg = typeof message === 'string' ? message : JSON.stringify(message);
      toast.error(msg || 'An alert was triggered', { title: 'System Notification' });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
          ? reason
          : 'An unexpected async error occurred';
      if (
        message.includes('aborted') ||
        message.includes('cancelled') ||
        message.includes('canceled')
      ) {
        return;
      }
      toast.error(message, { title: 'System Error' });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      listeners.delete(addToast);
      window.alert = originalAlert;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addToast]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: { title?: string; duration?: number }) => {
      toast.show(message, type, options);
    },
    [],
  );

  const success = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    toast.success(message, options);
  }, []);

  const error = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    toast.error(message, options);
  }, []);

  const warning = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    toast.warning(message, options);
  }, []);

  const info = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    toast.info(message, options);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast Notification Floating Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const config = {
            success: {
              border: 'border-emerald-500/40 bg-slate-900/95 text-emerald-400',
              iconBg: 'bg-emerald-500/20 text-emerald-400',
              icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
              defaultTitle: 'Success',
            },
            error: {
              border: 'border-rose-500/40 bg-slate-900/95 text-rose-400',
              iconBg: 'bg-rose-500/20 text-rose-400',
              icon: <AlertCircle className="w-5 h-5 shrink-0" />,
              defaultTitle: 'Error',
            },
            warning: {
              border: 'border-amber-500/40 bg-slate-900/95 text-amber-400',
              iconBg: 'bg-amber-500/20 text-amber-400',
              icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
              defaultTitle: 'Warning',
            },
            info: {
              border: 'border-sky-500/40 bg-slate-900/95 text-sky-400',
              iconBg: 'bg-sky-500/20 text-sky-400',
              icon: <Info className="w-5 h-5 shrink-0" />,
              defaultTitle: 'Information',
            },
          }[t.type];

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${config.border}`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="font-semibold text-xs text-white">
                  {t.title || config.defaultTitle}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 break-words leading-relaxed font-normal">
                  {t.message}
                </div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback to standalone toast if used outside provider
    return {
      showToast: toast.show,
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
    };
  }
  return context;
};
