import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface GoalDocument {
    _id?: ObjectId;
    userId: string;
    overview: string;
    strategies: string;
    acceptanceCriteria: string[];
    checkedCriteria: boolean[];
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
    streakDays: number;
    longestStreak: number;
    lastCheckInDate: string | null;
}

interface SerializedGoal {
    id: string;
    overview: string;
    strategies: string;
    acceptanceCriteria: string[];
    checkedCriteria: boolean[];
    completed: boolean;
    createdAt: string;
    streakDays: number;
    longestStreak: number;
    lastCheckInDate: string | null;
}

function serialize(doc: GoalDocument): SerializedGoal {
    return {
        id: doc._id!.toString(),
        overview: doc.overview,
        strategies: doc.strategies,
        acceptanceCriteria: doc.acceptanceCriteria,
        checkedCriteria: doc.checkedCriteria,
        completed: doc.completed,
        createdAt: doc.createdAt.toLocaleDateString(),
        streakDays: doc.streakDays ?? 0,
        longestStreak: doc.longestStreak ?? 0,
        lastCheckInDate: doc.lastCheckInDate ?? null,
    };
}

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
    const from = new Date(fromIso + "T00:00:00Z").getTime();
    const to = new Date(toIso + "T00:00:00Z").getTime();
    return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            userId: string;
            overview: string;
            strategies: string;
            acceptanceCriteria: string[];
        };

        const { userId, overview, strategies, acceptanceCriteria } = body;

        if (!userId || !overview?.trim() || !strategies?.trim() || !acceptanceCriteria?.length) {
            return NextResponse.json(
                { error: "userId, overview, strategies, and acceptanceCriteria are required" },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();

        const now = new Date();
        const doc: Omit<GoalDocument, "_id"> = {
            userId,
            overview: overview.trim(),
            strategies: strategies.trim(),
            acceptanceCriteria,
            checkedCriteria: acceptanceCriteria.map(() => false),
            completed: false,
            createdAt: now,
            updatedAt: now,
            streakDays: 0,
            longestStreak: 0,
            lastCheckInDate: null,
        };

        const result = await db
            .collection<Omit<GoalDocument, "_id">>("goals")
            .insertOne(doc);

        return NextResponse.json({
            goal: serialize({ ...doc, _id: result.insertedId } as GoalDocument),
        });
    } catch (error) {
        console.error("POST /api/goals error:", error);
        return NextResponse.json(
            { error: "Failed to create goal" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "userId query param is required" },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();

        const docs = await db
            .collection<GoalDocument>("goals")
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ goals: docs.map(serialize) });
    } catch (error) {
        console.error("GET /api/goals error:", error);
        return NextResponse.json(
            { error: "Failed to fetch goals" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            userId: string;
            goalId: string;
            checkedCriteria?: boolean[];
        };

        const { userId, goalId, checkedCriteria } = body;

        if (!userId || !goalId) {
            return NextResponse.json(
                { error: "userId and goalId are required" },
                { status: 400 }
            );
        }

        if (!ObjectId.isValid(goalId)) {
            return NextResponse.json({ error: "Invalid goalId" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const goals = db.collection<GoalDocument>("goals");

        const existing = await goals.findOne({
            _id: new ObjectId(goalId),
            userId,
        });

        if (!existing) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        const update: Partial<GoalDocument> = { updatedAt: new Date() };

        if (Array.isArray(checkedCriteria)) {
            update.checkedCriteria = checkedCriteria;
            update.completed = checkedCriteria.length > 0 && checkedCriteria.every(Boolean);

            // Streak: any newly-checked criterion today counts as a check-in.
            const newCheckExists = checkedCriteria.some(
                (v, i) => v && !existing.checkedCriteria[i]
            );

            if (newCheckExists) {
                const today = todayKey();
                const last = existing.lastCheckInDate;
                let streak = existing.streakDays ?? 0;

                if (!last) {
                    streak = 1;
                } else if (last === today) {
                    // Same day — no streak change.
                } else {
                    const gap = daysBetween(last, today);
                    streak = gap === 1 ? streak + 1 : 1;
                }

                update.streakDays = streak;
                update.longestStreak = Math.max(existing.longestStreak ?? 0, streak);
                update.lastCheckInDate = today;
            }
        }

        await goals.updateOne(
            { _id: new ObjectId(goalId), userId },
            { $set: update }
        );

        const updated = await goals.findOne({
            _id: new ObjectId(goalId),
            userId,
        });

        return NextResponse.json({ goal: serialize(updated!) });
    } catch (error) {
        console.error("PATCH /api/goals error:", error);
        return NextResponse.json(
            { error: "Failed to update goal" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const goalId = searchParams.get("goalId");

        if (!userId || !goalId) {
            return NextResponse.json(
                { error: "userId and goalId are required" },
                { status: 400 }
            );
        }

        if (!ObjectId.isValid(goalId)) {
            return NextResponse.json({ error: "Invalid goalId" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const result = await db
            .collection<GoalDocument>("goals")
            .deleteOne({ _id: new ObjectId(goalId), userId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/goals error:", error);
        return NextResponse.json(
            { error: "Failed to delete goal" },
            { status: 500 }
        );
    }
}
