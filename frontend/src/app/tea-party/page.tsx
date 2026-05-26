import JournalShell from "@/components/JournalShell";

export default function TeaPartyPage() {
  return (
    <main id="main" className="min-h-screen px-6 py-16">
      <a href="#journal-form" className="skip-link">Skip to journal</a>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Journal
        </h1>
        <p className="mt-2 text-[color:var(--text-muted)]">
          Write or speak about what&apos;s on your mind today. Entries are encrypted on
          this device before they leave it.
        </p>

        <div className="mt-10">
          <JournalShell />
        </div>
      </div>
    </main>
  );
}
