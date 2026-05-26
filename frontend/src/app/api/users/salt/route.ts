import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { randomBytes } from "crypto";

interface UserSaltDoc {
    userId: string;
    saltB64: string;
    // Verifier is a known plaintext encrypted with the user's derived key.
    // Lets the client confirm the passphrase is correct without server seeing it.
    verifierCiphertext?: string;
    verifierIv?: string;
    createdAt: Date;
    updatedAt?: Date;
}

// GET — return salt + verifier (if set). Salt is created on first call.
// Salt is not secret; it's only there to defeat cross-user rainbow tables.
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "userId query param is required" },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();
        const users = db.collection<UserSaltDoc>("user_salts");

        const existing = await users.findOne({ userId });
        if (existing) {
            return NextResponse.json({
                saltB64: existing.saltB64,
                verifierCiphertext: existing.verifierCiphertext ?? null,
                verifierIv: existing.verifierIv ?? null,
            });
        }

        const saltB64 = randomBytes(16).toString("base64");
        await users.insertOne({ userId, saltB64, createdAt: new Date() });

        return NextResponse.json({
            saltB64,
            verifierCiphertext: null,
            verifierIv: null,
        });
    } catch (error) {
        console.error("GET /api/users/salt error:", error);
        return NextResponse.json(
            { error: "Failed to get user salt" },
            { status: 500 }
        );
    }
}

// POST — set the verifier ciphertext/iv (called once, after user sets passphrase).
// Server stores ciphertext only; the plaintext "wellnessland:v1" is fixed
// (the client uses it to confirm key correctness on subsequent unlocks).
export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            userId: string;
            verifierCiphertext: string;
            verifierIv: string;
        };
        const { userId, verifierCiphertext, verifierIv } = body;

        if (!userId || !verifierCiphertext || !verifierIv) {
            return NextResponse.json(
                { error: "userId, verifierCiphertext, verifierIv are required" },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();
        const users = db.collection<UserSaltDoc>("user_salts");

        const existing = await users.findOne({ userId });
        if (!existing) {
            return NextResponse.json(
                { error: "Salt not initialized — call GET first" },
                { status: 400 }
            );
        }

        if (existing.verifierCiphertext) {
            return NextResponse.json(
                { error: "Verifier already set" },
                { status: 409 }
            );
        }

        await users.updateOne(
            { userId },
            { $set: { verifierCiphertext, verifierIv, updatedAt: new Date() } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/users/salt error:", error);
        return NextResponse.json(
            { error: "Failed to set verifier" },
            { status: 500 }
        );
    }
}
