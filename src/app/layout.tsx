import type { Metadata } from "next"
import Link from "next/link"

import "./globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "TechTalks 2026",
  description: "Browse and register for TechTalks conference sessions.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <nav className="border-b">
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
              <Link href="/" className="font-bold tracking-tight">
                TechTalks
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Home
                </Link>
                <Link
                  href="/talks"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Talks
                </Link>
              </div>
            </div>
          </nav>
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
