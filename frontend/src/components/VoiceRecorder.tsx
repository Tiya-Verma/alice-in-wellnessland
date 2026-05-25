"use client";

import { useMemo, useRef, useState } from "react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onBack: () => void;
}

const PROMPTS = [
  "What happened today?",
  "What's something that felt unclear or confusing?",
  "How did your team interactions feel today?",
  "What's been weighing on you lately?",
  "Is there something you wish you could say but haven't?",
  "What would make tomorrow feel better than today?",
];

export default function VoiceRecorder({ onTranscript, onBack }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], []);

  const handleStop = async () => {
    setIsTranscribing(true);
    setError(null);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = (await res.json()) as { transcript?: string; error?: string };
      if (data.transcript) {
        onTranscript(data.transcript);
      } else {
        setError("Couldn't transcribe the audio. Try again?");
      }
    } catch {
      setError("Couldn't transcribe the audio. Try again?");
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void handleStop();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm underline underline-offset-4 hover:no-underline"
      >
        ← Back
      </button>

      <div className="border border-[color:var(--border)] rounded-md p-4 bg-[color:var(--surface-muted)]">
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
          Prompt
        </p>
        <p className="mt-2 text-base leading-relaxed">{prompt}</p>
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Or talk freely — whatever comes to mind.
        </p>
      </div>

      <div className="flex items-center gap-4">
        {!isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={startRecording}
            className="px-5 py-2.5 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] transition-colors"
          >
            Start recording
          </button>
        )}

        {isRecording && (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="px-5 py-2.5 rounded-md font-medium bg-[color:var(--danger)] text-white hover:opacity-90 transition-opacity"
            >
              Stop recording
            </button>
            <p role="status" aria-live="polite" className="text-sm text-[color:var(--text-muted)]">
              Listening…
            </p>
          </>
        )}

        {isTranscribing && (
          <p role="status" aria-live="polite" className="text-sm text-[color:var(--text-muted)]">
            Transcribing…
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-[color:var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
