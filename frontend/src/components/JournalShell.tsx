"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import PassphraseGate from "./PassphraseGate";
import JournalEntry from "./JournalEntry";
import JournalList from "./JournalList";

export default function JournalShell() {
    const { user, isLoaded } = useUser();
    const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    if (!isLoaded) {
        return <p className="text-sm text-[color:var(--text-muted)]">Loading…</p>;
    }

    if (!user) {
        return (
            <p className="text-sm text-[color:var(--text-muted)]">
                Sign in to write and read your journal.
            </p>
        );
    }

    if (!cryptoKey) {
        return <PassphraseGate userId={user.id} onUnlock={setCryptoKey} />;
    }

    return (
        <>
            <section
                id="journal-form"
                aria-label="New journal entry"
                className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface-muted)]"
            >
                <JournalEntry
                    userId={user.id}
                    cryptoKey={cryptoKey}
                    onEntryCreated={() => setReloadKey((k) => k + 1)}
                />
            </section>

            <JournalList userId={user.id} cryptoKey={cryptoKey} reloadKey={reloadKey} />
        </>
    );
}
