import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/secrets";

// Lazy singleton — initialized on first call, reused after
let _genAI: GoogleGenAI | null = null;

async function getGenAI(): Promise<GoogleGenAI> {
  if (!_genAI) {
    const apiKey = await getGeminiApiKey();
    _genAI = new GoogleGenAI({ apiKey });
  }
  return _genAI;
}

export async function getGeminiFlash() {
  return getGenAI();
}

// Eagerly-initialized singleton for route files that import `ai` directly
// Falls back gracefully if the env var isn't set yet (server will error on first call)
export const ai = {
  models: {
    async generateContent(opts: { model: string; contents: string | string[]; config?: Record<string, unknown> }) {
      const genAI = await getGenAI();
      return genAI.models.generateContent(opts);
    },
    async embedContent(opts: { model: string; contents: string }) {
      const genAI = await getGenAI();
      return genAI.models.embedContent(opts);
    },
  },
};

export async function getGeminiEmbedding() {
  return getGenAI();
}

export interface JournalAnalysis {
  mood: string;
  moodScore: number;
  validation: string;
  clarity: string;
  affirmation: string;
}

const FALLBACK_ANALYSIS: JournalAnalysis = {
  mood: "reflective",
  moodScore: 5,
  validation: "It takes courage to sit with these feelings.",
  clarity:
    "Try writing down exactly what's unclear and sharing it with your mentor.",
  affirmation: "Even Alice had to start somewhere in Wonderland.",
};

export async function analyzeJournalEntry(
  transcribedText: string,
  contextSummary?: string
): Promise<JournalAnalysis> {
  const basePrompt = `You are a warm, wise AI companion for a co-op intern navigating their first tech job. You speak like a caring mentor — never clinical, never dismissive. Analyze this journal entry and return ONLY valid JSON with: mood (one word emotion), moodScore (1-10, 10=happiest), validation (1 sentence acknowledging their feelings without toxic positivity), clarity (1-2 sentence practical suggestion — e.g. how to communicate with their tech lead, how to frame a question, how to approach an unclear ticket; when relevant you may gently reference a recent mood trend or a dormant goal from the context below), affirmation (1 warm encouraging sentence, can reference Alice in Wonderland characters subtly — Cheshire Cat, Caterpillar's 'Who are you?', etc.). Only return valid JSON, nothing else.`;

  const systemPrompt = contextSummary
    ? `${basePrompt}\n\nWhat you know about the user (use sparingly, only if it makes the response feel more seen):\n${contextSummary}`
    : basePrompt;

  try {
    const genAI = await getGeminiFlash();
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [systemPrompt, transcribedText],
    });

    const responseText = (result.text ?? "").trim();
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return JSON.parse(cleaned) as JournalAnalysis;
  } catch {
    return FALLBACK_ANALYSIS;
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const genAI = await getGeminiEmbedding();
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });
  return result.embeddings?.[0]?.values ?? [];
}
