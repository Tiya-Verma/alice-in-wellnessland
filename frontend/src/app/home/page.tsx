import Link from "next/link";

const sections = [
    {
        title: "Daily check-in",
        description: "A one-screen ritual — mood, a few words, a touch on your goals.",
        href: "/checkin",
    },
    {
        title: "Journal",
        description: "Write or speak about your day.",
        href: "/tea-party",
    },
    {
        title: "Goals",
        description: "Set and track SMART goals.",
        href: "/goals",
    },
];

export default function HomePage() {
    return (
        <main id="main" className="min-h-screen px-6 py-16">
            <a href="#sections" className="skip-link">Skip to sections</a>

            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    Welcome back
                </h1>
                <p className="mt-2 text-[color:var(--text-muted)]">
                    Pick where you&apos;d like to start today.
                </p>

                <nav
                    id="sections"
                    aria-label="Main sections"
                    className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {sections.map((s) => (
                        <Link
                            key={s.href}
                            href={s.href}
                            className="block border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--border-strong)] transition-colors"
                        >
                            <p className="font-medium text-lg">{s.title}</p>
                            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                                {s.description}
                            </p>
                        </Link>
                    ))}
                </nav>
            </div>
        </main>
    );
}
