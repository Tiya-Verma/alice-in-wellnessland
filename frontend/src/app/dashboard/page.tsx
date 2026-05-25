import { WonderlandInsight } from "@/components/WonderlandInsight";

export default function DashboardPage() {
    return (
        <main id="main" className="min-h-screen px-6 py-16">
            <a href="#insights" className="skip-link">Skip to insights</a>

            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    Reflections
                </h1>
                <p className="mt-2 text-[color:var(--text-muted)]">
                    A summary of your recent journal entries.
                </p>

                <div id="insights" className="mt-10">
                    <WonderlandInsight />
                </div>
            </div>
        </main>
    );
}
