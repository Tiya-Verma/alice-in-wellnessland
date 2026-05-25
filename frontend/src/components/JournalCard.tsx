interface JournalEntry {
  _id: string;
  content: string;
  mood: string;
  moodScore: number;
  validation: string;
  affirmation: string;
  moodRating: number | null;
  createdAt: string | Date;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "Great",
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface JournalCardProps {
  entry: JournalEntry;
}

export default function JournalCard({ entry }: JournalCardProps) {
  const moodLabel = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
  const preview =
    entry.content.length > 200 ? entry.content.slice(0, 200) + "…" : entry.content;

  return (
    <article className="border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--surface)]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{moodLabel}</p>
          {entry.moodRating != null && (
            <p className="text-xs text-[color:var(--text-muted)] mt-0.5">
              Self-rated: {MOOD_LABELS[entry.moodRating] ?? entry.moodRating}
            </p>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full border border-[color:var(--border)] font-medium"
          aria-label={`Mood score: ${entry.moodScore} out of 10`}
        >
          {entry.moodScore}/10
        </span>
      </header>

      <time className="block text-xs text-[color:var(--text-muted)] mt-1">
        {formatDate(entry.createdAt)}
      </time>

      <p className="text-sm mt-3 leading-relaxed">{preview}</p>

      {entry.affirmation && (
        <p className="text-sm italic text-[color:var(--text-muted)] mt-3 pt-3 border-t border-[color:var(--border)]">
          {entry.affirmation}
        </p>
      )}
    </article>
  );
}
