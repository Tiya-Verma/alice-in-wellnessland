"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface InsightStats {
    avgMood: number;
    entryCount: number;
    recentMoods: string[];
}

interface InsightData {
    insight_text: string;
    character: string;
    stats: InsightStats;
}

export function WonderlandInsight() {
    const { user } = useUser();
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        const fetchInsight = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/dashboard?userId=${user.id}`);
                const data = await res.json();

                if (res.ok) {
                    setInsight(data);
                } else {
                    setError(data.error || "Failed to generate insight.");
                }
            } catch {
                setError("Something went wrong. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsight();
    }, [user?.id]);

    if (isLoading && !insight) {
        return (
            <section aria-busy="true" aria-live="polite" className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]">
                <p className="text-sm text-[color:var(--text-muted)]">Loading insights…</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]">
                <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>
            </section>
        );
    }

    if (!insight) {
        return (
            <section className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]">
                <p className="text-sm text-[color:var(--text-muted)]">
                    No insights yet. Add a few journal entries to get started.
                </p>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--accent-soft)]">
                <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--accent)]">
                    Reflection
                </p>
                <p className="mt-2 leading-relaxed whitespace-pre-line">
                    {insight.insight_text}
                </p>
            </div>

            <div className="border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--surface)]">
                <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--text-muted)] mb-3">
                    Quick stats
                </p>
                <dl className="grid grid-cols-2 gap-4">
                    <div>
                        <dt className="text-sm text-[color:var(--text-muted)]">Average mood</dt>
                        <dd className="text-lg font-semibold mt-0.5">{insight.stats.avgMood}/10</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-[color:var(--text-muted)]">Entries analyzed</dt>
                        <dd className="text-lg font-semibold mt-0.5">{insight.stats.entryCount}</dd>
                    </div>
                </dl>

                {insight.stats.recentMoods.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                        <p className="text-sm text-[color:var(--text-muted)] mb-2">Recent moods</p>
                        <ul className="flex flex-wrap gap-2">
                            {insight.stats.recentMoods.map((mood, i) => (
                                <li
                                    key={i}
                                    className="text-xs px-2.5 py-1 rounded-full border border-[color:var(--border)] capitalize"
                                >
                                    {mood}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}
