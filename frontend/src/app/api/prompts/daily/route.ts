import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { getUserContext, summarizeContextForPrompt } from "@/lib/userContext";

const FALLBACK_PROMPTS = [
    "The Caterpillar puffs his pipe and asks: what feeling are you sitting with this morning?",
    "Down the rabbit hole again — what's one thing you noticed about yourself today?",
    "The Cheshire Cat is smiling: name one small thing that went right.",
    "What's been spinning in your head that you haven't said out loud yet?",
    "If today were a tea party, who or what would you invite to the table?",
];

function fallback(): string {
    return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
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

        const ctx = await getUserContext(userId);
        const summary = summarizeContextForPrompt(ctx);

        const systemPrompt = `You are the gentle voice of a Wonderland-themed journaling companion. Generate ONE short journal prompt (1–2 sentences) that the user will see at the start of their daily check-in.

Guidelines:
- Ground the prompt in the user's recent state below — reference a mood trend or a dormant goal by name when it would feel natural. Don't force it.
- If a goal has gone dormant 5+ days, you may gently ask about it.
- If mood has been low (avg < 4), soften the tone and invite small honesty rather than ambitious reflection.
- If mood has been high (avg > 7), invite them to capture what's working.
- You may use a light Alice in Wonderland reference (Cheshire Cat, Caterpillar, White Rabbit, tea party) but no more than once.
- Never sound clinical. Never use the word "data" or "patterns".
- Return ONLY the prompt text — no quotes, no preamble, no JSON.

User state:
${summary}`;

        try {
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: systemPrompt,
            });
            const prompt = (result.text ?? "").trim().replace(/^["']|["']$/g, "");
            return NextResponse.json({ prompt: prompt || fallback(), context: ctx });
        } catch {
            return NextResponse.json({ prompt: fallback(), context: ctx });
        }
    } catch (error) {
        console.error("GET /api/prompts/daily error:", error);
        return NextResponse.json(
            { error: "Failed to generate daily prompt" },
            { status: 500 }
        );
    }
}
