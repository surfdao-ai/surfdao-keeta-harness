import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Keeta's client bundles native .node addons (secp256k1, asn1-napi-rs).
  // Keep them external to the server bundle; paper mode never loads them.
  serverExternalPackages: ["@keetanetwork/keetanet-client", "@x402/keeta"],
}

export default nextConfig
