"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import MoodRating from "@/components/MoodRating";
import PassphraseGate from "@/components/PassphraseGate";
import { encryptString } from "@/lib/crypto";

interface Goal {
    id: string;
    overview: string;
    acceptanceCriteria: string[];
    checkedCriteria: boolean[];
    completed: boolean;
    streakDays: number;
}

interface DailyPromptContext {
    avgMood: number | null;
    dormantGoals: { id: string; title: string; daysSinceProgress: number }[];
    activeGoals: { id: string; title: string }[];
}

interface JournalResult {
    mood: string;
    moodScore: number;
    validation: string;
    clarity: string;
    affirmation: string;
}

export default function CheckInPage() {
    const { user, isLoaded } = useUser();
    const userId = user?.id;
    const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

    const [prompt, setPrompt] = useState<string>("");
    const [context, setContext] = useState<DailyPromptContext | null>(null);
    const [promptLoading, setPromptLoading] = useState(true);

    const [goals, setGoals] = useState<Goal[]>([]);
    // Per-goal local state for today's toggled criteria — keyed by goalId, value is the new checked array.
    const [pendingChecks, setPendingChecks] = useState<Record<string, boolean[]>>({});

    const [moodRating, setMoodRating] = useState<number | null>(null);
    const [content, setContent] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<JournalResult | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isLoaded || !userId || !cryptoKey) return;
        (async () => {
            try {
                const [promptRes, goalsRes] = await Promise.all([
                    fetch(`/api/prompts/daily?userId=${encodeURIComponent(userId)}`),
                    fetch(`/api/goals?userId=${encodeURIComponent(userId)}`),
                ]);
                const promptData = await promptRes.json();
                const goalsData = await goalsRes.json();

                if (promptRes.ok) {
                    setPrompt(promptData.prompt ?? "");
                    setContext(promptData.context ?? null);
                }
                if (goalsRes.ok && Array.isArray(goalsData.goals)) {
                    const active = (goalsData.goals as Goal[]).filter((g) => !g.completed);
                    setGoals(active);
                    const seed: Record<string, boolean[]> = {};
                    for (const g of active) seed[g.id] = [...g.checkedCriteria];
                    setPendingChecks(seed);
                }
            } catch (e) {
                console.error("Failed to load check-in", e);
            } finally {
                setPromptLoading(false);
            }
        })();
    }, [isLoaded, userId, cryptoKey]);

    const toggleCriterion = (goalId: string, idx: number) => {
        setPendingChecks((prev) => {
            const next = { ...prev };
            const arr = [...(next[goalId] ?? [])];
            arr[idx] = !arr[idx];
            next[goalId] = arr;
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !cryptoKey) return;
        if (submitting) return;
        if (content.trim().length < 10) {
            setError("Write at least a sentence — even a small one counts.");
            return;
        }
        setError("");
        setSubmitting(true);

        try {
            const { ciphertext, iv } = await encryptString(content, cryptoKey);
            const journalRes = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, content, ciphertext, iv, moodRating }),
            });
            const journalData = await journalRes.json();

            const goalUpdates = goals
                .filter((g) => {
                    const next = pendingChecks[g.id];
                    if (!next) return false;
                    return next.some((v, i) => v !== g.checkedCriteria[i]);
                })
                .map((g) =>
                    fetch("/api/goals", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId,
                            goalId: g.id,
                            checkedCriteria: pendingChecks[g.id],
                        }),
                    })
                );

            await Promise.all(goalUpdates);

            if (journalData.success) {
                setResult(journalData.entry as JournalResult);
            } else {
                setError("Saved goals, but the journal entry didn't go through.");
            }
        } catch (err) {
            setError(`Something went wrong: ${(err as Error).message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const goalsTouched = goals.filter((g) => {
        const next = pendingChecks[g.id];
        if (!next) return false;
        return next.some((v, i) => v !== g.checkedCriteria[i]);
    }).length;

    return (
        <div className="min-h-screen">
            <a href="#checkin-main" className="skip-link">Skip to check-in</a>

            <main id="checkin-main" className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
                <header className="mb-8">
                    <Link
                        href="/home"
                        className="text-sm underline underline-offset-4 hover:no-underline"
                    >
                        ← Home
                    </Link>
                    <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
                        Daily check-in
                    </h1>
                    <p className="mt-2 text-[color:var(--text-muted)]">
                        One small ritual: notice how you feel, capture it, and see where your goals stand.
                    </p>
                </header>

                {!isLoaded ? (
                    <p className="text-sm text-[color:var(--text-muted)]">Loading…</p>
                ) : !userId ? (
                    <p className="text-sm text-[color:var(--text-muted)]">
                        Sign in to start your check-in.
                    </p>
                ) : !cryptoKey ? (
                    <PassphraseGate userId={userId} onUnlock={setCryptoKey} />
                ) : result ? (
                    <section className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]">
                        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--accent)]">
                            Reflection
                        </p>
                        <h2 className="mt-2 text-lg font-semibold">Today felt {result.mood}</h2>
                        <div className="mt-4 space-y-3 text-sm">
                            <p>{result.validation}</p>
                            {result.clarity && (
                                <p className="text-[color:var(--text-muted)]">{result.clarity}</p>
                            )}
                            <p className="italic">{result.affirmation}</p>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/goals"
                                className="min-h-[44px] inline-flex items-center px-5 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] transition-colors"
                            >
                                See your goals
                            </Link>
                            <Link
                                href="/home"
                                className="min-h-[44px] inline-flex items-center px-5 py-3 text-sm underline underline-offset-4 hover:no-underline"
                            >
                                Back home
                            </Link>
                        </div>
                    </section>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <section
                            aria-labelledby="prompt-heading"
                            className="border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--accent-soft)]"
                        >
                            <p id="prompt-heading" className="text-xs font-medium uppercase tracking-wider text-[color:var(--accent)]">
                                Today&apos;s prompt
                            </p>
                            {promptLoading ? (
                                <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                                    The Caterpillar is thinking…
                                </p>
                            ) : (
                                <p className="mt-2 text-base sm:text-lg leading-relaxed">{prompt}</p>
                            )}
                            {context && (context.avgMood !== null || context.dormantGoals.length > 0) && (
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    {context.avgMood !== null && (
                                        <span className="px-2 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
                                            14-day mood avg: {context.avgMood}/10
                                        </span>
                                    )}
                                    {context.dormantGoals.slice(0, 2).map((g) => (
                                        <span
                                            key={g.id}
                                            className="px-2 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
                                        >
                                            Quiet: &ldquo;{g.title.slice(0, 32)}{g.title.length > 32 ? "…" : ""}&rdquo;
                                        </span>
                                    ))}
                                </div>
                            )}
                        </section>

                        <fieldset>
                            <legend className="text-sm font-medium mb-2">How are you feeling?</legend>
                            <MoodRating value={moodRating} onChange={setMoodRating} />
                        </fieldset>

                        <div>
                            <label htmlFor="checkin-content" className="block text-sm font-medium mb-1.5">
                                A few words on today
                            </label>
                            <textarea
                                id="checkin-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="One paragraph is plenty. What's true right now?"
                                rows={6}
                                className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md p-3 text-sm leading-relaxed resize-none"
                                required
                                minLength={10}
                            />
                        </div>

                        {goals.length > 0 && (
                            <section aria-labelledby="goals-checkin-heading">
                                <h2
                                    id="goals-checkin-heading"
                                    className="text-sm font-medium mb-3"
                                >
                                    Touch a goal
                                    <span className="ml-2 text-[color:var(--text-muted)] font-normal">
                                        {goalsTouched > 0 ? `(${goalsTouched} updated)` : "(optional)"}
                                    </span>
                                </h2>
                                <ul className="space-y-4 list-none">
                                    {goals.map((g) => {
                                        const pending = pendingChecks[g.id] ?? g.checkedCriteria;
                                        return (
                                            <li
                                                key={g.id}
                                                className="border border-[color:var(--border)] rounded-md p-4 bg-[color:var(--surface)]"
                                            >
                                                <p className="text-sm font-medium">{g.overview}</p>
                                                {g.streakDays > 0 && (
                                                    <p className="text-xs text-[color:var(--text-muted)] mt-1">
                                                        <span aria-hidden>🔥</span> {g.streakDays}-day streak
                                                    </p>
                                                )}
                                                <ul className="mt-3 space-y-2 list-none">
                                                    {g.acceptanceCriteria.map((c, idx) => {
                                                        const checked = pending[idx] ?? false;
                                                        return (
                                                            <li key={idx}>
                                                                <label className="flex items-start gap-3 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleCriterion(g.id, idx)}
                                                                        className="mt-1 h-4 w-4 cursor-pointer accent-[color:var(--accent)]"
                                                                    />
                                                                    <span className={`text-sm ${checked ? "line-through text-[color:var(--text-muted)]" : ""}`}>
                                                                        {c}
                                                                    </span>
                                                                </label>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}

                        {error && (
                            <div
                                role="alert"
                                className="border border-[color:var(--danger)] rounded-md p-3 bg-[color:var(--surface-muted)]"
                            >
                                <p className="text-sm text-[color:var(--danger)]">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || content.trim().length < 10}
                            className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? "Saving…" : "Complete check-in"}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}
