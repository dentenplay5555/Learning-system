"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * เรียกใช้จาก Client Component ไหนก็ได้ที่อยู่ใต้ <ToastProvider>
 * เช่น: const { showToast } = useToast(); showToast("บันทึกสำเร็จ", "success");
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast ต้องถูกเรียกใช้ภายใต้ <ToastProvider> เท่านั้น");
  }
  return ctx;
}

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounterRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++idCounterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack — ลอยมุมขวาบน อยู่นอก layout ปกติ ไม่ดันเนื้อหาอื่น */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in pointer-events-auto relative overflow-hidden rounded-xl shadow-2xl border text-xs font-medium backdrop-blur-md transition-all ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-200"
                : t.type === "error"
                ? "bg-red-950/90 border-red-700/50 text-red-200"
                : "bg-slate-900/90 border-slate-700/50 text-slate-200"
            }`}
          >
            <div className="px-4 py-3 flex items-start gap-2.5">
              <span className="shrink-0 text-sm">
                {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
              </span>
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="ปิดข้อความแจ้งเตือน"
                className="text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer shrink-0 ml-1 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Micro-animation countdown progress line */}
            <div
              className={`h-[2px] toast-progress opacity-80 ${
                t.type === "success"
                  ? "bg-emerald-400"
                  : t.type === "error"
                  ? "bg-rose-400"
                  : "bg-cyan-400"
              }`}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
