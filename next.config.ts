import type { NextConfig } from "next"

/* --------------------------------------------------------------------------
   Security headers as a platform-level backstop. The edge proxy (src/proxy.ts)
   applies the same set on every HTML response; this belt-and-braces config
   covers cache layers and anything the proxy bypasses.
--------------------------------------------------------------------------- */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    // 'unsafe-inline' is required for script-src: Next.js App Router ships its
    // RSC/flight payload as inline <script> tags, so a strict 'self'-only policy
    // breaks hydration app-wide. Styles are also inlined by Tailwind/Next.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  // Keeta's client bundles native .node addons (secp256k1, asn1-napi-rs).
  // Keep them external to the server bundle; paper mode never loads them.
  serverExternalPackages: ["@keetanetwork/keetanet-client", "@x402/keeta"],
  // Don't advertise the framework on responses.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
