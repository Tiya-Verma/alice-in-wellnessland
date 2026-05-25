"use client";

import { SignInButton } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-6 py-16">
      <a href="#main" className="skip-link">Skip to content</a>

      <div className="w-full max-w-sm border border-[color:var(--border)] rounded-lg p-8 bg-[color:var(--surface)]">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Continue to your wellness companion.
        </p>

        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-6 w-full px-4 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] transition-colors"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    </main>
  );
}
