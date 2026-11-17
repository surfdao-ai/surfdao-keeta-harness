import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cookies } from "next/headers"
import { SessionProvider } from "@/components/session-provider"
import { ToastProvider } from "@/components/ui/toaster"
import { ModeProvider, MODE_COOKIE, type Mode } from "@/components/mode-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "SurfDAO.ai — Keeta Fund Harness",
  description: "Launch, run, and allocate capital to AI-agent hedge funds on Keeta mainnet. Surf the markets.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const initialMode: Mode = cookieStore.get(MODE_COOKIE)?.value === "live" ? "live" : "paper"
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <ModeProvider initialMode={initialMode}>
            <SessionProvider>{children}</SessionProvider>
          </ModeProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
