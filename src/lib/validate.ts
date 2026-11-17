/* Small input-safety helpers shared by API route handlers. */

export function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) return null
  // Strip control characters (incl. null bytes) that can break logs/cookies.
  return trimmed.replace(/[\u0000-\u001f\u007f]/g, "")
}

export function safeJson<T>(value: unknown, fallback: T, maxBytes = 4096): T {
  if (value == null) return fallback
  try {
    const str = JSON.stringify(value)
    if (!str || str.length > maxBytes) return fallback
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

/** Reject cross-site form/fetch submissions (SameSite cookies are the main defense). */
export function assertSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true // non-browser clients (curl, server-to-server)
  const host = req.headers.get("host")
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function safeAmount(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null
  return Math.round(n * 1_000_000) / 1_000_000
}
