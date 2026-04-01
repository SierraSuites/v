import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ToastProvider } from "@/components/ToastNotification"
import { ThemeProvider } from "@/components/theme-provider"
import { ConfirmProvider } from "@/components/ui/ConfirmDialog"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Sierra Suites - Construction Management Platform",
  description: "The complete construction management platform built for contractors who want to grow their business.",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sierra Suites",
  },
}

export const viewport: Viewport = {
  themeColor: "#1E40AF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
          <ConfirmProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ConfirmProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
