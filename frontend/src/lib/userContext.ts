import { connectToDatabase } from "@/lib/mongodb";

export interface UserContext {
    recentMoodTrend: { date: string; score: number; mood: string }[];
    avgMood: number | null;
    activeGoals: {
        id: string;
        title: string;
        progress: number;
        streakDays: number;
        lastCheckIn: string | null;
    }[];
    dormantGoals: {
        id: string;
        title: string;
        daysSinceProgress: number;
    }[];
    recentJournalThemes: string[];
}

const MOOD_WINDOW_DAYS = 14;
const DORMANT_THRESHOLD_DAYS = 5;

function daysSince(iso: string | null): number {
    if (!iso) return Infinity;
    const then = new Date(iso + "T00:00:00Z").getTime();
    const now = Date.now();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export async function getUserContext(userId: string): Promise<UserContext> {
    if (!userId) {
        return {
            recentMoodTrend: [],
            avgMood: null,
            activeGoals: [],
            dormantGoals: [],
            recentJournalThemes: [],
        };
    }

    const { db } = await connectToDatabase();

    const since = new Date();
    since.setDate(since.getDate() - MOOD_WINDOW_DAYS);

    const [journals, goals] = await Promise.all([
        db
            .collection("journals")
            .find(
                { userId, createdAt: { $gte: since } },
                { projection: { embedding: 0, content: 0 } }
            )
            .sort({ createdAt: -1 })
            .limit(30)
            .toArray(),
        db.collection("goals").find({ userId }).toArray(),
    ]);

    const recentMoodTrend = journals
        .filter((j) => typeof j.moodScore === "number")
        .map((j) => ({
            date: (j.createdAt as Date).toISOString().slice(0, 10),
            score: j.moodScore as number,
            mood: (j.mood as string) ?? "unknown",
        }));

    const avgMood =
        recentMoodTrend.length > 0
            ? Number(
                  (
                      recentMoodTrend.reduce((s, e) => s + e.score, 0) /
                      recentMoodTrend.length
                  ).toFixed(1)
              )
            : null;

    const recentJournalThemes = Array.from(
        new Set(
            journals
                .map((j) => (j.mood as string)?.toLowerCase().trim())
                .filter((m): m is string => !!m)
        )
    ).slice(0, 6);

    const activeGoalDocs = goals.filter((g) => !g.completed);

    const activeGoals = activeGoalDocs.map((g) => {
        const checked = (g.checkedCriteria as boolean[]) ?? [];
        const total = checked.length || 1;
        const done = checked.filter(Boolean).length;
        return {
            id: g._id!.toString(),
            title: g.overview as string,
            progress: Math.round((done / total) * 100),
            streakDays: (g.streakDays as number) ?? 0,
            lastCheckIn: (g.lastCheckInDate as string | null) ?? null,
        };
    });

    const dormantGoals = activeGoalDocs
        .map((g) => ({
            id: g._id!.toString(),
            title: g.overview as string,
            daysSinceProgress: daysSince((g.lastCheckInDate as string | null) ?? null),
        }))
        .filter((g) => g.daysSinceProgress >= DORMANT_THRESHOLD_DAYS);

    return {
        recentMoodTrend,
        avgMood,
        activeGoals,
        dormantGoals,
        recentJournalThemes,
    };
}

export function summarizeContextForPrompt(ctx: UserContext): string {
    const parts: string[] = [];

    if (ctx.avgMood !== null) {
        parts.push(
            `Recent average mood: ${ctx.avgMood}/10 across ${ctx.recentMoodTrend.length} entries in the last ${MOOD_WINDOW_DAYS} days.`
        );
    } else {
        parts.push("No recent journal entries.");
    }

    if (ctx.recentJournalThemes.length > 0) {
        parts.push(`Recurring emotions: ${ctx.recentJournalThemes.join(", ")}.`);
    }

    if (ctx.activeGoals.length > 0) {
        parts.push(
            `Active goals:\n${ctx.activeGoals
                .map(
                    (g) =>
                        `- "${g.title}" — ${g.progress}% complete, ${g.streakDays}-day streak`
                )
                .join("\n")}`
        );
    } else {
        parts.push("No active goals.");
    }

    if (ctx.dormantGoals.length > 0) {
        parts.push(
            `Goals with no progress in 5+ days:\n${ctx.dormantGoals
                .map(
                    (g) =>
                        `- "${g.title}" — ${
                            g.daysSinceProgress === Infinity
                                ? "never checked in"
                                : `${g.daysSinceProgress} days since last check-in`
                        }`
                )
                .join("\n")}`
        );
    }

    return parts.join("\n\n");
}
