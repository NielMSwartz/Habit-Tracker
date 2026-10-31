"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info" | "reminder";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastApi {
  push: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<Tone, typeof Info> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
  reminder: Sparkles,
};

const TONES: Record<Tone, string> = {
  success: "text-[var(--success)]",
  error: "text-[var(--danger)]",
  info: "text-[var(--accent)]",
  reminder: "text-[var(--brand-magenta)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = ++counter.current;
      setItems((current) => [...current.slice(-3), { ...toast, id }]);
      const timeout = setTimeout(
        () => dismiss(id),
        toast.duration ?? (toast.tone === "error" ? 8000 : 5000),
      );
      timers.current.set(id, timeout);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timeout of map.values()) clearTimeout(timeout);
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, description) => push({ title, description, tone: "success" }),
      error: (title, description) => push({ title, description, tone: "error" }),
      info: (title, description) => push({ title, description, tone: "info" }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem]"
      >
        {items.map((item) => {
          const Icon = ICONS[item.tone ?? "info"];
          return (
            <div
              key={item.id}
              role="status"
              className="animate-pop card-solid pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line-strong p-3.5 shadow-[var(--shadow-lg)]"
            >
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-surface-2",
                  TONES[item.tone ?? "info"],
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {item.description}
                  </p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    className="btn btn-soft btn-sm mt-2"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(item.id)}
                className="rounded-lg p-1 text-faint transition hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
