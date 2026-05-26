"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        const onLoad = () => {
            navigator.serviceWorker.register("/sw.js").catch((err) => {
                console.warn("SW registration failed:", err);
            });
        };

        if (document.readyState === "complete") onLoad();
        else window.addEventListener("load", onLoad, { once: true });
    }, []);

    return null;
}
