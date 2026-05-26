"use client";

import { useState } from "react";
import MoodRating from "./MoodRating";
import VoiceRecorder from "./VoiceRecorder";
import { encryptString } from "@/lib/crypto";

interface JournalEntryResult {
  id: string;
  mood: string;
  moodScore: number;
  validation: string;
  clarity: string;
  affirmation: string;
  createdAt: Date;
}

interface JournalEntryProps {
  userId: string;
  cryptoKey: CryptoKey;
  onEntryCreated?: (entry: JournalEntryResult) => void;
}

export default function JournalEntry({ userId, cryptoKey, onEntryCreated }: JournalEntryProps) {
  const [mode, setMode] = useState<"pick" | "voice" | "write">("pick");
  const [content, setContent] = useState("");
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<JournalEntryResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || content.trim().length < 10) return;
    setIsSubmitting(true);
    try {
      const { ciphertext, iv } = await encryptString(content, cryptoKey);
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content, ciphertext, iv, moodRating }),
      });
      const data = (await res.json()) as { success: boolean; entry: JournalEntryResult };
      if (data.success) {
        setResult(data.entry);
        onEntryCreated?.(data.entry);
      }
    } catch (err) {
      console.error("Failed to submit journal entry:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setContent("");
    setMoodRating(null);
    setResult(null);
    setMode("pick");
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Today&apos;s entry</h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        What&apos;s on your mind today?
      </p>

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="border border-[color:var(--border)] rounded-md p-4 bg-[color:var(--accent-soft)]">
            <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--accent)]">
              Reflection
            </p>

            <div className="mt-3">
              <p className="text-xs text-[color:var(--text-muted)]">You&apos;re feeling</p>
              <p className="mt-0.5 text-sm leading-relaxed">{result.validation}</p>
            </div>

            {result.clarity && (
              <div className="mt-3">
                <p className="text-xs text-[color:var(--text-muted)]">A thought to consider</p>
                <p className="mt-0.5 text-sm leading-relaxed">{result.clarity}</p>
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs text-[color:var(--text-muted)]">Remember</p>
              <p className="mt-0.5 text-sm italic">{result.affirmation}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium underline underline-offset-4 hover:no-underline"
          >
            Write another entry
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {mode === "pick" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("voice")}
                className="flex flex-col items-start gap-1 min-h-[88px] p-5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--border-strong)] transition-colors text-left"
              >
                <span className="font-medium">Speak</span>
                <span className="text-sm text-[color:var(--text-muted)]">
                  Talk freely, we&apos;ll transcribe.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("write")}
                className="flex flex-col items-start gap-1 min-h-[88px] p-5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--border-strong)] transition-colors text-left"
              >
                <span className="font-medium">Write</span>
                <span className="text-sm text-[color:var(--text-muted)]">
                  Type at your own pace.
                </span>
              </button>
            </div>
          )}

          {mode === "voice" && (
            <VoiceRecorder
              onTranscript={(text) => { setContent(text); setMode("write"); }}
              onBack={() => setMode("pick")}
            />
          )}

          {mode === "write" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <button
                type="button"
                onClick={() => setMode("pick")}
                className="self-start text-sm underline underline-offset-4 hover:no-underline"
              >
                ← Back
              </button>

              <fieldset>
                <legend className="text-sm font-medium mb-2">
                  How are you feeling right now?
                </legend>
                <MoodRating value={moodRating} onChange={setMoodRating} />
              </fieldset>

              <div>
                <label htmlFor="journal-content" className="block text-sm font-medium mb-1.5">
                  Your entry
                </label>
                <textarea
                  id="journal-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write freely — this is just for you. What happened today? What felt hard?"
                  rows={8}
                  className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md p-3 text-sm leading-relaxed resize-none"
                  required
                  minLength={10}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || content.trim().length < 10}
                className="w-full sm:w-auto sm:self-start min-h-[44px] px-6 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting…" : "Submit entry"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
