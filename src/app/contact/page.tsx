// =============================================================
// src/app/contact/page.tsx
// Static "Contact Us" page with the Bloemfontein office details.
// Theme-aware (light + dark).
// =============================================================
import { Phone, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Contact Us — CareerHub",
};

const details = [
  {
    icon: Phone,
    label: "Phone",
    value: "+27 51 123 4567",
    href: "tel:+27511234567",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@careerhub.co.za",
    href: "mailto:hello@careerhub.co.za",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "12 President Brand Street, Bloemfontein, 9301, Free State, South Africa",
    href: "https://maps.google.com/?q=12+President+Brand+Street+Bloemfontein",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-[70vh] bg-white px-4 py-12 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
          Contact CareerHub
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
          Get in touch
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
          Questions, feedback or partnership ideas? Reach our Bloemfontein team
          using any of the details below.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {details.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={label === "Address" ? "_blank" : undefined}
              rel={label === "Address" ? "noopener noreferrer" : undefined}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-400 dark:border-white/10 dark:bg-[#1a1133] dark:hover:border-brand-500"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {label}
              </h2>
              <p className="mt-1 font-medium">{value}</p>
            </a>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <iframe
            title="CareerHub office location in Bloemfontein"
            src="https://www.google.com/maps?q=Bloemfontein&output=embed"
            className="h-64 w-full border-0"
            loading="lazy"
          />
        </div>
      </div>
    </main>
  );
}
