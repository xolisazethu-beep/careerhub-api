export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} CareerHub. A learning project.</p>
        <p className="text-xs">
          Built with Next.js 15 · React 19 · TypeScript · Tailwind CSS v4
        </p>
      </div>
    </footer>
  );
}
