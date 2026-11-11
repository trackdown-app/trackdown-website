import "@tanstack/react-start/server-only";
import { createHash, randomBytes, X509Certificate } from "node:crypto";
import cbor from "cbor";
import { Redis } from "@upstash/redis";
import { verifyAssertion, verifyAttestation } from "node-app-attest";
import { z } from "@/lib/zod";
import { ApiError } from "@/lib/api/api-error";
import { clientKeyHeader } from "@/lib/api/client-headers";
import { attestKeyIdSchema } from "@/lib/api/app-attest-schemas";

const recordSchema = z.object({
    publicKey: z.string(),
    signCount: z.number().int().nonnegative(),
});

function configuration() {
    const teamIdentifier = process.env["TRACKDOWN_ATTEST_TEAM_ID"];
    const bundleIdentifier = process.env["TRACKDOWN_ATTEST_BUNDLE_ID"];
    if (
        teamIdentifier == null ||
        teamIdentifier === "" ||
        bundleIdentifier == null ||
        bundleIdentifier === ""
    ) {
        throw new Error("App Attest app identity is not configured");
    }
    return { teamIdentifier, bundleIdentifier };
}

export function appAttestEnabled(): boolean {
    return (
        process.env["TRACKDOWN_ATTEST_MODE"] === "observe" ||
        process.env["TRACKDOWN_ATTEST_MODE"] === "enforce"
    );
}

function store() {
    // Never fall back to instance-local state: Vercel instances must share counters.
    return Redis.fromEnv();
}

function keyName(keyId: string): string {
    const { teamIdentifier, bundleIdentifier } = configuration();
    return `attest:${teamIdentifier}.${bundleIdentifier}:${keyId}`;
}

function invalid(): ApiError {
    return new ApiError("unknown_client", "App Attest proof is missing or invalid");
}

export async function issueAttestChallenge({ keyId }: { keyId: string }) {
    if (!appAttestEnabled())
        throw new ApiError("not_found", "App Attest is not enabled");
    const challenge = randomBytes(32).toString("hex");
    await store().set(`${keyName(keyId)}:challenge:${challenge}`, "1", { ex: 300 });
    return { challenge };
}

export async function registerAttestation(input: {
    keyId: string;
    challenge: string;
    attestation: string;
}) {
    if (!appAttestEnabled())
        throw new ApiError("not_found", "App Attest is not enabled");
    const redis = store();
    const name = keyName(input.keyId);
    // GETDEL makes a challenge single-use even across concurrent instances.
    if ((await redis.getdel(`${name}:challenge:${input.challenge}`)) == null)
        throw invalid();
    let publicKey: string;
    try {
        const attestation = Buffer.from(input.attestation, "base64");
        const decoded: unknown = cbor.decodeFirstSync(attestation);
        const certificates = z
            .object({
                attStmt: z.object({ x5c: z.array(z.instanceof(Buffer)).length(2) }),
            })
            .parse(decoded).attStmt.x5c;
        for (const certificate of certificates) {
            const parsed = new X509Certificate(certificate);
            if (
                Date.now() < Date.parse(parsed.validFrom) ||
                Date.now() > Date.parse(parsed.validTo)
            )
                throw invalid();
        }
        const result: unknown = verifyAttestation({
            ...configuration(),
            keyId: input.keyId,
            challenge: input.challenge,
            attestation,
            allowDevelopmentEnvironment:
                process.env["VERCEL_ENV"] !== "production" &&
                process.env["TRACKDOWN_ATTEST_ALLOW_DEVELOPMENT"] === "true",
        });
        publicKey = z.object({ publicKey: z.string() }).parse(result).publicKey;
    } catch {
        throw invalid();
    }
    // Re-registration must never reset an existing replay counter.
    await redis.set(name, JSON.stringify({ publicKey, signCount: 0 }), { nx: true });
    return { registered: true };
}

/** UTF-8, LF separators, no trailing LF. Body is hashed as transmitted. */
export async function assertionPayload(
    request: Request,
    timestamp: string,
): Promise<string> {
    const url = new URL(request.url);
    const body = Buffer.from(await request.clone().arrayBuffer());
    if (body.length > 65536) throw invalid();
    return [
        "trackdown-app-attest-v1",
        timestamp,
        request.method,
        url.pathname + url.search,
        createHash("sha256").update(body).digest("hex"),
    ].join("\n");
}

export async function checkAssertion(request: Request): Promise<void> {
    const keyId = attestKeyIdSchema.safeParse(
        request.headers.get("Trackdown-Attest-Key-Id"),
    );
    const assertion = request.headers.get("Trackdown-Attest-Assertion");
    const timestamp = request.headers.get("Trackdown-Attest-Timestamp") ?? "";
    if (
        !keyId.success ||
        assertion == null ||
        assertion.length > 4096 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(assertion) ||
        !/^\d{10}$/.test(timestamp) ||
        Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
    )
        throw invalid();
    const redis = store();
    const name = keyName(keyId.data);
    const record = recordSchema.safeParse(await redis.get(name));
    if (!record.success) throw invalid();
    const payload = await assertionPayload(request, timestamp);
    let signCount: number;
    try {
        const result: unknown = verifyAssertion({
            ...configuration(),
            ...record.data,
            assertion: Buffer.from(assertion, "base64"),
            payload,
        });
        signCount = z
            .object({ signCount: z.number().int().positive() })
            .parse(result).signCount;
    } catch {
        throw invalid();
    }
    // Compare-and-set prevents two requests verified against the same old counter
    // from both succeeding. A rejected out-of-order call may retry with new proof.
    const updated = await redis.eval<[number], number>(
        `
        local record = cjson.decode(redis.call('GET', KEYS[1]) or 'null')
        if record == cjson.null or record.signCount >= tonumber(ARGV[1]) then return 0 end
        record.signCount = tonumber(ARGV[1])
        redis.call('SET', KEYS[1], cjson.encode(record))
        return 1
    `,
        [name],
        [signCount],
    );
    if (updated !== 1) throw invalid();
}

/** Observe failures first; enforce only explicitly selected client keys. */
export async function appAttestError(request: Request): Promise<ApiError | null> {
    if (!appAttestEnabled()) return null;
    const path = new URL(request.url).pathname;
    if (path === "/api/v1/attest" || path === "/api/v1/attest/challenge")
        return null;
    try {
        await checkAssertion(request);
        return null;
    } catch (error) {
        console.warn("API App Attest verification failed", {
            path,
            unavailable: !(error instanceof ApiError),
        });
        const keys = (process.env["TRACKDOWN_ATTEST_REQUIRED_CLIENT_KEYS"] ?? "")
            .split(",")
            .map((key) => key.trim())
            .filter((key) => key !== "");
        return process.env["TRACKDOWN_ATTEST_MODE"] === "enforce" &&
            keys.includes(request.headers.get(clientKeyHeader)?.trim() ?? "")
            ? invalid()
            : null;
    }
}
