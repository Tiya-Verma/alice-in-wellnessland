// Client-side E2EE primitives for journal entries.
//
// Trade-off note: We use PBKDF2-SHA256 (600k iterations) because it's built into
// the Web Crypto API with zero dependencies. Argon2id is the modern best practice
// for password hashing; the plan called for it as a hardening follow-up. PBKDF2 at
// 600k iterations is what Bitwarden uses and is defensible for a hackathon prototype.
// To upgrade later: replace `deriveKey` with @noble/hashes/argon2.

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_LENGTH_BITS = 256;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

// Both helpers return ArrayBuffer-backed Uint8Arrays (not SharedArrayBuffer)
// so the result satisfies Web Crypto's BufferSource constraint under strict TS.
export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(b64);
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
    const buf = new ArrayBuffer(n);
    const out = new Uint8Array(buf);
    crypto.getRandomValues(out);
    return out;
}

export function newSaltB64(): string {
    return toBase64(randomBytes(SALT_BYTES));
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
    const salt = fromBase64(saltB64);
    const passKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        passKey,
        { name: "AES-GCM", length: KEY_LENGTH_BITS },
        true,
        ["encrypt", "decrypt"]
    );
}

export interface Encrypted {
    ciphertext: string;
    iv: string;
}

export async function encryptString(plaintext: string, key: CryptoKey): Promise<Encrypted> {
    const iv = randomBytes(IV_BYTES);
    const buf = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(plaintext)
    );
    return { ciphertext: toBase64(new Uint8Array(buf)), iv: toBase64(iv) };
}

export async function decryptString(payload: Encrypted, key: CryptoKey): Promise<string> {
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.ciphertext);
    const buf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
    );
    return dec.decode(buf);
}

const KEY_CACHE_NAME = "wellnessland_journal_key_v1";

export async function cacheKey(key: CryptoKey): Promise<void> {
    const jwk = await crypto.subtle.exportKey("jwk", key);
    sessionStorage.setItem(KEY_CACHE_NAME, JSON.stringify(jwk));
}

export async function loadCachedKey(): Promise<CryptoKey | null> {
    const raw = sessionStorage.getItem(KEY_CACHE_NAME);
    if (!raw) return null;
    try {
        const jwk = JSON.parse(raw) as JsonWebKey;
        return await crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "AES-GCM", length: KEY_LENGTH_BITS },
            true,
            ["encrypt", "decrypt"]
        );
    } catch {
        sessionStorage.removeItem(KEY_CACHE_NAME);
        return null;
    }
}

export function clearCachedKey(): void {
    sessionStorage.removeItem(KEY_CACHE_NAME);
}
