import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { auth } from "@/auth";
import Providers from "./providers";
import { ToastProvider } from "@/context/ToastContext";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Fonts are self-hosted (no Google Fonts request) for privacy, performance and
// fully offline builds. The woff2 files live in src/fonts.
const inter = localFont({
  src: "../fonts/inter-variable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const jakarta = localFont({
  src: "../fonts/plus-jakarta-sans-variable.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  // `template` makes per-page titles render as "{page} · CareerHubX"; pages set
  // only their own segment via their `metadata`/`generateMetadata` `title`.
  title: {
    default: "CareerHubX — Find your next role in South Africa",
    template: "%s · CareerHubX",
  },
  description:
    "Browse curated job listings across South Africa and apply with a guided, multi-step application. Built with Next.js 15, React 19 and TypeScript.",
  openGraph: {
    title: "CareerHubX — Find your next role in South Africa",
    description:
      "Browse curated job listings across South Africa and apply with a guided, multi-step application.",
    siteName: "CareerHubX",
    type: "website",
  },
};

// Runs before first paint to set the `.dark` class on <html> from the stored
// preference (or the OS preference when none is stored). Inlining it here — not
// in ThemeToggle's effect, which only runs after hydration — is what prevents a
// flash of the wrong theme on load. ThemeToggle later re-applies the same logic
// to keep its own `isDark` label in sync.
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem("careerhub:theme");
    var prefersDark = stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", prefersDark);
  } catch (e) {}
})();
`;

// The root layout is async (Assignment 2.3, Part 5): it reads the Auth.js
// session once with `await auth()` and hands it to the nav. This is cheap even
// though it runs on every page load — `auth()` only verifies the signed session
// COOKIE (no database round-trip), and the layout already renders on the server.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} antialiased`}>
        <Providers>
          <ToastProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar session={session} />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            {/* Assignment 3.1, Part 2 — system-wide toast feedback (sonner).
                Bottom-right keeps it clear of the sticky top nav bar.
                richColors gives success/error their own accent automatically. */}
            <Toaster position="bottom-right" richColors closeButton />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
