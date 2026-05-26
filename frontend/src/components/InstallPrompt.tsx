"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "wellnessland_install_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return nav.standalone === true;
}

function isIosSafari(): boolean {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return isIos && isSafari;
}

function recentlyDismissed(): boolean {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
}

export default function InstallPrompt() {
    const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
    // For iOS, decide visibility once on mount via lazy init (avoids setState-in-effect).
    const [iosState] = useState(() => {
        if (typeof window === "undefined") return { showIos: false, visible: false };
        if (isStandalone() || recentlyDismissed()) return { showIos: false, visible: false };
        const ios = isIosSafari();
        return { showIos: ios, visible: ios };
    });
    const [androidVisible, setAndroidVisible] = useState(false);

    const showIos = iosState.showIos;
    const visible = iosState.visible || androidVisible;

    useEffect(() => {
        if (isStandalone() || recentlyDismissed()) return;

        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setEvent(e as BeforeInstallPromptEvent);
            setAndroidVisible(true);
        };
        window.addEventListener("beforeinstallprompt", onBeforeInstall);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        };
    }, []);

    const [dismissed, setDismissed] = useState(false);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setDismissed(true);
        setAndroidVisible(false);
    };

    const install = async () => {
        if (!event) return;
        await event.prompt();
        const { outcome } = await event.userChoice;
        if (outcome === "accepted") {
            setDismissed(true);
            setAndroidVisible(false);
        } else {
            dismiss();
        }
    };

    if (dismissed || !visible) return null;

    return (
        <div
            role="dialog"
            aria-labelledby="install-prompt-title"
            className="fixed left-4 right-4 top-4 sm:left-auto sm:right-6 sm:bottom-6 sm:top-auto sm:max-w-sm z-40 border border-[color:var(--border)] rounded-lg bg-[color:var(--surface)] shadow-lg p-4"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p id="install-prompt-title" className="font-semibold text-sm">
                        Install Wellnessland
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                        {showIos
                            ? "Tap the Share icon, then Add to Home Screen for the best experience."
                            : "Add it to your home screen for a phone-native feel."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss install prompt"
                    className="p-1 -m-1 text-[color:var(--text-muted)] hover:text-[color:var(--text)] shrink-0"
                >
                    ✕
                </button>
            </div>
            {!showIos && event && (
                <button
                    type="button"
                    onClick={install}
                    className="mt-3 w-full px-4 py-2 rounded-md font-medium text-sm bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] transition-colors"
                >
                    Install
                </button>
            )}
        </div>
    );
}
