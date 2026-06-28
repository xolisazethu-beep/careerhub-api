import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { auth } from "@/auth";
import Providers from "./providers";
import { AuthProvider } from "@/context/AuthContext";
import { EmployerAuthProvider } from "@/context/EmployerAuthContext";
import { ApplicantAuthProvider } from "@/context/ApplicantAuthContext";
import { ToastProvider } from "@/context/ToastContext";
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
  title: "CareerHub — Find your next role in South Africa",
  description:
    "Browse curated job listings across South Africa. Built with Next.js 15, React 19 and TypeScript.",
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
          <AuthProvider>
            <EmployerAuthProvider>
            <ApplicantAuthProvider>
            <ToastProvider>
              <div className="flex min-h-screen flex-col">
                <Navbar session={session} />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
            </ApplicantAuthProvider>
            </EmployerAuthProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
