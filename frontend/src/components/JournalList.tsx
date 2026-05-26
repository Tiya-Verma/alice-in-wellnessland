"use client";

import { useEffect, useState } from "react";
import { decryptString } from "@/lib/crypto";
import JournalCard from "./JournalCard";

interface EncryptedEntry {
    _id: string;
    ciphertext?: string;
    iv?: string;
    content?: string;
    mood: string;
    moodScore: number;
    validation: string;
    affirmation: string;
    moodRating: number | null;
    createdAt: string;
}

interface DecryptedEntry {
    _id: string;
    content: string;
    mood: string;
    moodScore: number;
    validation: string;
    affirmation: string;
    moodRating: number | null;
    createdAt: string;
}

interface JournalListProps {
    userId: string;
    cryptoKey: CryptoKey;
    reloadKey?: number;
}

export default function JournalList({ userId, cryptoKey, reloadKey }: JournalListProps) {
    const [entries, setEntries] = useState<DecryptedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError("");
            try {
                const res = await fetch(`/api/journal?userId=${encodeURIComponent(userId)}`);
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error ?? "Failed to load entries.");
                    return;
                }
                const raw = (data.entries ?? []) as EncryptedEntry[];
                const decrypted: DecryptedEntry[] = [];
                for (const e of raw) {
                    let content = "";
                    if (e.ciphertext && e.iv) {
                        try {
                            content = await decryptString(
                                { ciphertext: e.ciphertext, iv: e.iv },
                                cryptoKey
                            );
                        } catch {
                            content = "[Could not decrypt — wrong passphrase?]";
                        }
                    } else if (e.content) {
                        // Legacy unencrypted entry. New writes never land here.
                        content = e.content;
                    }
                    decrypted.push({
                        _id: e._id,
                        content,
                        mood: e.mood,
                        moodScore: e.moodScore,
                        validation: e.validation,
                        affirmation: e.affirmation,
                        moodRating: e.moodRating,
                        createdAt: e.createdAt,
                    });
                }
                setEntries(decrypted);
            } catch (err) {
                setError(`Failed to load entries: ${(err as Error).message}`);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId, cryptoKey, reloadKey]);

    if (loading) {
        return <p className="text-sm text-[color:var(--text-muted)]">Decrypting your entries…</p>;
    }
    if (error) {
        return <p className="text-sm text-[color:var(--danger)]">{error}</p>;
    }
    if (entries.length === 0) {
        return null;
    }

    return (
        <section aria-labelledby="past-entries-heading" className="mt-12">
            <h2
                id="past-entries-heading"
                className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)] mb-3"
            >
                Past entries
            </h2>
            <ul className="space-y-4 list-none">
                {entries.map((entry) => (
                    <li key={entry._id}>
                        <JournalCard entry={entry} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
