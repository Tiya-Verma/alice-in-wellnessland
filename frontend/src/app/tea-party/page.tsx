import JournalEntry from "@/components/JournalEntry";
import JournalCard from "@/components/JournalCard";

interface JournalEntryDoc {
  _id: string;
  content: string;
  mood: string;
  moodScore: number;
  validation: string;
  affirmation: string;
  moodRating: number | null;
  createdAt: string;
}

async function getEntries(): Promise<JournalEntryDoc[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/journal?userId=demo-user`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { entries: JournalEntryDoc[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export default async function TeaPartyPage() {
  const entries = await getEntries();

  return (
    <main id="main" className="min-h-screen px-6 py-16">
      <a href="#journal-form" className="skip-link">Skip to journal</a>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Journal
        </h1>
        <p className="mt-2 text-[color:var(--text-muted)]">
          Write or speak about what&apos;s on your mind today.
        </p>

        <section
          id="journal-form"
          aria-label="New journal entry"
          className="mt-10 border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface-muted)]"
        >
          <JournalEntry userId="demo-user" />
        </section>

        {entries.length > 0 && (
          <section aria-labelledby="past-entries-heading" className="mt-12">
            <h2
              id="past-entries-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)] mb-3"
            >
              Past entries
            </h2>
            <ul className="space-y-4 list-none">
              {entries.map((entry) => (
                <li key={entry._id}>
                  <JournalCard entry={entry} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
