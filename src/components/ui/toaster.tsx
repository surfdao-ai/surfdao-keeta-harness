"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type Toast = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastState = { toasts: Toast[] }

const ToastContext = React.createContext<ToastState & {
  toast: (t: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}>({ toasts: [], toast: () => {}, dismiss: () => {} })

let count = 0
function genId() { return (count++).toString() }

const TOAST_REMOVE_DELAY = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ToastState>({ toasts: [] })

  const toast = React.useCallback((props: Omit<Toast, "id">) => {
    const id = genId()
    const newToast: Toast = { ...props, id }
    setState((s) => ({ toasts: [...s.toasts, newToast] }))
    setTimeout(() => setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), TOAST_REMOVE_DELAY)
    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }, [])

  return (
    <ToastContext.Provider value={{ ...state, toast, dismiss }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {state.toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-sm shadow-lg transition-all",
        t.variant === "destructive"
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border-border",
      )}
    >
      {t.variant === "destructive" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0 text-seafoam" />}
      <div className="flex flex-col gap-1">
        {t.title && <span className="font-semibold">{t.title}</span>}
        {t.description && <span className="text-muted-foreground opacity-90">{t.description}</span>}
      </div>
      <button onClick={onDismiss} className="ml-auto opacity-50 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function AlertCircle({ className }: { className?: string }) { return <svg className={className ?? "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function Check({ className }: { className?: string }) { return <svg className={className ?? "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> }

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return { toast: ctx.toast, dismiss: ctx.dismiss }
}
