import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const features = [
  { label: "Voice companion", desc: "Talk through what's on your mind." },
  { label: "Daily journal", desc: "Track your thoughts and moods." },
  { label: "Habit tracking", desc: "Build small routines that stick." },
  { label: "Mood history", desc: "See patterns over time." },
];

export default async function Landing() {
  const { userId } = await auth();
  if (userId) redirect("/home");

  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-6 py-16">
      <a href="#main" className="skip-link">Skip to content</a>

      <div className="w-full max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-[color:var(--accent)] mb-3">
          A wellness companion
        </p>

        <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
          Take a moment for yourself.
        </h1>

        <p className="mt-4 text-lg text-[color:var(--text-muted)] max-w-prose">
          A simple, private space to journal, track moods, and reflect with an AI companion.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] transition-colors"
        >
          Sign in to continue
          <span aria-hidden>→</span>
        </Link>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f.label}
              className="border border-[color:var(--border)] rounded-lg p-4 bg-[color:var(--surface)]"
            >
              <p className="font-medium">{f.label}</p>
              <p className="text-sm text-[color:var(--text-muted)] mt-1">{f.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
