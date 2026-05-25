"use client";

interface MoodRatingProps {
  value: number | null;
  onChange: (v: number) => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "Great",
};

export default function MoodRating({ value, onChange }: MoodRatingProps) {
  return (
    <div role="radiogroup" aria-label="Mood rating" className="flex gap-2 flex-wrap">
      {([1, 2, 3, 4, 5] as const).map((rating) => {
        const selected = value === rating;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${MOOD_LABELS[rating]} (${rating} of 5)`}
            onClick={() => onChange(rating)}
            className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
              selected
                ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)] border-[color:var(--accent)]"
                : "bg-[color:var(--surface)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
            }`}
          >
            {MOOD_LABELS[rating]}
          </button>
        );
      })}
    </div>
  );
}
