import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { getUserContext } from "@/lib/userContext";

interface ChatMessage {
    role: "user" | "model";
    text: string;
}

interface ChatRequest {
    messages: ChatMessage[];
    goalsContext: string;
    userId?: string;
}

const SYSTEM_PROMPT = `You are the Goal Coach for Alice in Wellnessland — a warm, encouraging mentor with a light Alice in Wonderland sensibility (you can occasionally allude to the Cheshire Cat, Caterpillar, or White Rabbit when it feels natural; never force it).

Your job:
- Help the user refine, troubleshoot, and stay motivated on their SMART goals.
- Reference their goals directly by name when you can — show them you actually see what they're working on.
- Suggest small, concrete next steps. Avoid vague advice.
- If a goal looks stalled, gently surface it and ask what's getting in the way.
- Keep replies focused: 2–5 short paragraphs OR a tight bulleted list. Never write a wall of text.
- Use markdown lightly: **bold** for emphasis, bullet points where useful, ### for occasional section headers.

Tone: warm, curious, never clinical, never preachy. Treat the user like a capable adult who needs a thoughtful sounding board, not a cheerleader.`;

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as ChatRequest;
        const { messages, goalsContext, userId } = body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "messages array is required" },
                { status: 400 }
            );
        }

        // Pull fresh server-side context if userId is provided. This lets the coach see
        // mood trends (not just goal state) so it can soften tone when the user is depleted
        // and surface dormant goals by name.
        const ctx = userId ? await getUserContext(userId).catch(() => null) : null;
        const moodNote =
            ctx && ctx.avgMood !== null && ctx.avgMood < 4
                ? "\n\nIMPORTANT: The user's recent mood average is low (below 4/10). Soften your tone. Don't pile on more to-dos. Ask gentle, open questions and validate before suggesting."
                : "";
        const dormantNote =
            ctx && ctx.dormantGoals.length > 0
                ? `\n\nThese goals have gone quiet for 5+ days — feel free to bring them up by name if it would help: ${ctx.dormantGoals.map((g) => `"${g.title}"`).join(", ")}.`
                : "";
        const moodContextLine =
            ctx && ctx.avgMood !== null
                ? `\n\nRecent mood signal: ${ctx.avgMood}/10 average across ${ctx.recentMoodTrend.length} entries in the last 14 days.${
                      ctx.recentJournalThemes.length > 0
                          ? ` Recurring emotions: ${ctx.recentJournalThemes.join(", ")}.`
                          : ""
                  }`
                : "";

        const enrichedSystem = `${SYSTEM_PROMPT}${moodNote}${dormantNote}\n\n${goalsContext || "The user has no goals set yet."}${moodContextLine}`;

        const contents = [
            {
                role: "user" as const,
                parts: [
                    {
                        text: enrichedSystem,
                    },
                ],
            },
            {
                role: "model" as const,
                parts: [
                    {
                        text: "Understood — I'll keep their goals in mind as we talk.",
                    },
                ],
            },
            ...messages.map((m) => ({
                role: m.role,
                parts: [{ text: m.text }],
            })),
        ];

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: contents as unknown as string,
        });

        const reply = (result.text ?? "").trim();

        if (!reply) {
            return NextResponse.json(
                { reply: "Sorry, I couldn't come up with a response just now. Try rephrasing?" }
            );
        }

        return NextResponse.json({ reply });
    } catch (error) {
        console.error("POST /api/goals/chat error:", error);
        return NextResponse.json(
            { error: "Failed to generate coach reply" },
            { status: 500 }
        );
    }
}
