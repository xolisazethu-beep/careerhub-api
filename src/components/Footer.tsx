import { Logo } from "@/components/brand/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          <Logo size={26} />
          <span className="text-xs">© {new Date().getFullYear()} · A learning project.</span>
        </div>
        <p className="text-xs">
          Built with Next.js 15 · React 19 · TypeScript · Tailwind CSS v4
        </p>
      </div>
    </footer>
  );
}
