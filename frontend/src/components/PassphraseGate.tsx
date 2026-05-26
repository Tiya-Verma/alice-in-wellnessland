"use client";

import { useEffect, useState } from "react";
import {
    deriveKey,
    encryptString,
    decryptString,
    cacheKey,
    loadCachedKey,
} from "@/lib/crypto";

const VERIFIER_PLAINTEXT = "wellnessland:v1";

interface PassphraseGateProps {
    userId: string;
    onUnlock: (key: CryptoKey) => void;
    title?: string;
}

interface SaltMeta {
    saltB64: string;
    verifierCiphertext: string | null;
    verifierIv: string | null;
}

export default function PassphraseGate({ userId, onUnlock, title }: PassphraseGateProps) {
    const [meta, setMeta] = useState<SaltMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [passphrase, setPassphrase] = useState("");
    const [confirmPassphrase, setConfirmPassphrase] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!userId) return;
        (async () => {
            try {
                const cached = await loadCachedKey();
                if (cached) {
                    onUnlock(cached);
                    return;
                }
                const res = await fetch(
                    `/api/users/salt?userId=${encodeURIComponent(userId)}`
                );
                const data = await res.json();
                if (res.ok) setMeta(data);
                else setError(data.error ?? "Failed to load encryption metadata.");
            } catch (e) {
                setError(`Failed to load encryption metadata: ${(e as Error).message}`);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId, onUnlock]);

    const isFirstTime = meta && !meta.verifierCiphertext;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!meta) return;
        if (passphrase.length < 8) {
            setError("Use at least 8 characters.");
            return;
        }
        if (isFirstTime && passphrase !== confirmPassphrase) {
            setError("Passphrases don't match.");
            return;
        }

        setSubmitting(true);
        try {
            const key = await deriveKey(passphrase, meta.saltB64);

            if (isFirstTime) {
                const verifier = await encryptString(VERIFIER_PLAINTEXT, key);
                const res = await fetch("/api/users/salt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId,
                        verifierCiphertext: verifier.ciphertext,
                        verifierIv: verifier.iv,
                    }),
                });
                if (!res.ok) {
                    const d = await res.json();
                    throw new Error(d.error ?? "Failed to save passphrase");
                }
            } else {
                try {
                    const plain = await decryptString(
                        {
                            ciphertext: meta.verifierCiphertext!,
                            iv: meta.verifierIv!,
                        },
                        key
                    );
                    if (plain !== VERIFIER_PLAINTEXT) {
                        throw new Error("Wrong passphrase.");
                    }
                } catch {
                    setError("That passphrase doesn't match. Try again.");
                    setSubmitting(false);
                    return;
                }
            }

            await cacheKey(key);
            onUnlock(key);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]">
                <p className="text-sm text-[color:var(--text-muted)]">Checking your encryption keys…</p>
            </div>
        );
    }

    if (!meta) {
        return (
            <div className="border border-[color:var(--danger)] rounded-lg p-6 bg-[color:var(--surface)]">
                <p className="text-sm text-[color:var(--danger)]">{error || "Could not load encryption metadata."}</p>
            </div>
        );
    }

    return (
        <section
            aria-labelledby="passphrase-heading"
            className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]"
        >
            <h2 id="passphrase-heading" className="text-lg font-semibold">
                {title ?? (isFirstTime ? "Set your journal passphrase" : "Unlock your journal")}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {isFirstTime
                    ? "Your entries are encrypted on your device before they reach our servers. Pick a passphrase only you know — if you forget it, your past entries can't be recovered."
                    : "Enter your passphrase to decrypt your entries on this device."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                    <label htmlFor="passphrase" className="block text-sm font-medium mb-1.5">
                        Passphrase
                    </label>
                    <input
                        id="passphrase"
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        autoComplete={isFirstTime ? "new-password" : "current-password"}
                        autoFocus
                        className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md px-3 py-2.5 text-sm"
                    />
                </div>

                {isFirstTime && (
                    <div>
                        <label htmlFor="confirm-passphrase" className="block text-sm font-medium mb-1.5">
                            Confirm passphrase
                        </label>
                        <input
                            id="confirm-passphrase"
                            type="password"
                            value={confirmPassphrase}
                            onChange={(e) => setConfirmPassphrase(e.target.value)}
                            autoComplete="new-password"
                            className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md px-3 py-2.5 text-sm"
                        />
                    </div>
                )}

                {error && (
                    <p role="alert" className="text-sm text-[color:var(--danger)]">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting || passphrase.length < 8}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {submitting
                        ? isFirstTime
                            ? "Setting up encryption…"
                            : "Unlocking…"
                        : isFirstTime
                          ? "Set passphrase"
                          : "Unlock"}
                </button>
            </form>
        </section>
    );
}
