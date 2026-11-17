"use client"

import * as React from "react"

export type Mode = "paper" | "live"

type ModeContextValue = { mode: Mode; setMode: (m: Mode) => void }
const ModeContext = React.createContext<ModeContextValue>({ mode: "paper", setMode: () => {} })

export const MODE_COOKIE = "surfdao_mode"

export function ModeProvider({
  initialMode,
  children,
}: {
  initialMode: Mode
  children: React.ReactNode
}) {
  const [mode, setModeState] = React.useState<Mode>(initialMode)

  // Prefer the persisted client value when it differs from SSR (e.g. after a
  // navigation where the server cookie has not caught up).
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_COOKIE)
      if ((saved === "paper" || saved === "live") && saved !== mode) {
        setModeState(saved)
      }
    } catch {}
  }, [mode])

  const setMode = React.useCallback((m: Mode) => {
    setModeState(m)
    try {
      localStorage.setItem(MODE_COOKIE, m)
      document.cookie = `${MODE_COOKIE}=${m}; path=/; max-age=31536000; SameSite=Lax`
    } catch {}
  }, [])

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode() {
  return React.useContext(ModeContext)
}
