import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";

interface ValidateRequest {
    overview: string;
    strategies: string;
    criteriaLines: string[];
}

interface ValidateResult {
    isSmartGoal: boolean;
    isCriteriaSpecific: boolean;
    feedback: string;
}

const FALLBACK: ValidateResult = {
    isSmartGoal: true,
    isCriteriaSpecific: true,
    feedback: "Couldn't reach the AI validator — proceeding without critique.",
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as ValidateRequest;
        const { overview, strategies, criteriaLines } = body;

        if (!overview?.trim() || !strategies?.trim() || !criteriaLines?.length) {
            return NextResponse.json(
                { error: "overview, strategies, and criteriaLines are required" },
                { status: 400 }
            );
        }

        const prompt = `You are a SMART-goal critic for a wellness journaling app. Evaluate the user's goal and return ONLY valid JSON with three fields:

- isSmartGoal (boolean): true if the overview+strategies together cover Specific, Measurable, Achievable, Relevant, and Time-bound.
- isCriteriaSpecific (boolean): true if every acceptance criterion is concrete and checkable (not vague like "do better" or "feel happier").
- feedback (string): one or two sentences. If both checks pass, briefly affirm the goal. If either fails, name which SMART dimensions are weak and which criteria are vague, with a concrete rewrite suggestion. Speak warmly, like a mentor — never clinical.

Goal overview:
${overview.trim()}

Strategies:
${strategies.trim()}

Acceptance criteria:
${criteriaLines.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return ONLY the JSON object, nothing else.`;

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        });

        const responseText = (result.text ?? "").trim();
        const cleaned = responseText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        try {
            const parsed = JSON.parse(cleaned) as ValidateResult;
            return NextResponse.json(parsed);
        } catch {
            return NextResponse.json(FALLBACK);
        }
    } catch (error) {
        console.error("POST /api/goals/validate error:", error);
        return NextResponse.json(
            { error: "Failed to validate goal" },
            { status: 500 }
        );
    }
}
