"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertTriangle, X, Info, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, { wrapper: string; icon: string; IconComp: React.ElementType }> = {
  success: { wrapper: "border-emerald-200 bg-white", icon: "text-emerald-500 bg-emerald-50", IconComp: CheckCircle2 },
  error:   { wrapper: "border-rose-200 bg-white",    icon: "text-rose-500 bg-rose-50",       IconComp: XCircle },
  warning: { wrapper: "border-amber-200 bg-white",   icon: "text-amber-500 bg-amber-50",     IconComp: AlertTriangle },
  info:    { wrapper: "border-cyan-200 bg-white",    icon: "text-[#0891B2] bg-cyan-50",      IconComp: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const duration = opts.duration ?? 4000;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: "error", title, message, duration: 6000 }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: "info", title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const { wrapper, icon, IconComp } = STYLES[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg shadow-slate-200/60 animate-in slide-in-from-right-4 fade-in duration-200 ${wrapper}`}>
              <div className={`shrink-0 p-1.5 rounded-xl ${icon}`}>
                <IconComp className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0F172A] leading-snug">{t.title}</p>
                {t.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.message}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="shrink-0 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
