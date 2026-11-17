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

/** SSRF guard: only https URLs on public hosts may be used as inference endpoints. */
export function isSafeEndpoint(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 500) return false
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") return false
    const host = url.hostname.toLowerCase()
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const p = host.split(".").map(Number)
      if (p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) ||
          (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168)) return false
    }
    if (host === "metadata.google.internal") return false
    return true
  } catch {
    return false
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
