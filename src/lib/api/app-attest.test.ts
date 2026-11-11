import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import cbor from "cbor";
import {
    appAttestError,
    assertionPayload,
    checkAssertion,
    issueAttestChallenge,
    registerAttestation,
} from "@/lib/api/app-attest";
import { guarded, jsonResponse } from "@/lib/api/rest";

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    getdel: vi.fn(),
    set: vi.fn(),
    eval: vi.fn(),
    verifyAttestation: vi.fn(),
    verifyAssertion: vi.fn(),
}));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => mocks } }));
vi.mock("node-app-attest", () => ({
    verifyAttestation: mocks.verifyAttestation,
    verifyAssertion: mocks.verifyAssertion,
}));
const keyId = Buffer.alloc(32, 1).toString("base64");
const certificate = new X509Certificate(rootCertificates[0] ?? "").raw;
const attestation = (
    await cbor.encodeAsync({ attStmt: { x5c: [certificate, certificate] } })
).toString("base64");

function request(body = "") {
    return new Request(
        "https://trackdown.nl/api/v1/nl/puzzles/2/guesses?locale=nl",
        {
            method: "POST",
            body,
            headers: {
                "Trackdown-Client-Key": "new-key",
                "Trackdown-App-Version": "1.0.0",
                "Trackdown-Attest-Key-Id": keyId,
                "Trackdown-Attest-Assertion": "YWJj",
                "Trackdown-Attest-Timestamp": String(Math.floor(Date.now() / 1000)),
            },
        },
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TRACKDOWN_ATTEST_MODE", "observe");
    vi.stubEnv("TRACKDOWN_ATTEST_TEAM_ID", "TEAMID");
    vi.stubEnv("TRACKDOWN_ATTEST_BUNDLE_ID", "nl.trackdown.Trackdown");
    vi.stubEnv("TRACKDOWN_ATTEST_REQUIRED_CLIENT_KEYS", "new-key");
    vi.stubEnv("TRACKDOWN_CLIENT_KEYS", "new-key");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.get.mockResolvedValue({ publicKey: "public", signCount: 4 });
    mocks.getdel.mockResolvedValue("1");
    mocks.eval.mockResolvedValue(1);
    mocks.verifyAttestation.mockReturnValue({ publicKey: "public" });
    mocks.verifyAssertion.mockReturnValue({ signCount: 5 });
});

describe("App Attest", () => {
    it("issues random expiring challenges bound to a key", async () => {
        const first = await issueAttestChallenge({ keyId });
        const second = await issueAttestChallenge({ keyId });
        expect(first.challenge).toMatch(/^[a-f0-9]{64}$/);
        expect(first.challenge).not.toBe(second.challenge);
        expect(mocks.set).toHaveBeenCalledWith(expect.stringContaining(keyId), "1", {
            ex: 300,
        });
    });
    it("consumes challenges before verification and never resets counters", async () => {
        await registerAttestation({
            keyId,
            challenge: "challenge",
            attestation,
        });
        expect(mocks.getdel).toHaveBeenCalledWith(
            expect.stringContaining(":challenge:challenge"),
        );
        expect(mocks.set).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify({ publicKey: "public", signCount: 0 }),
            { nx: true },
        );
        mocks.getdel.mockResolvedValue(null);
        await expect(
            registerAttestation({
                keyId,
                challenge: "challenge",
                attestation,
            }),
        ).rejects.toMatchObject({ code: "unknown_client" });
        expect(mocks.verifyAttestation).toHaveBeenCalledTimes(1);
    });
    it("never allows development attestations in production", async () => {
        vi.stubEnv("VERCEL_ENV", "production");
        vi.stubEnv("TRACKDOWN_ATTEST_ALLOW_DEVELOPMENT", "true");
        await registerAttestation({
            keyId,
            challenge: "challenge",
            attestation,
        });
        expect(mocks.verifyAttestation).toHaveBeenCalledWith(
            expect.objectContaining({ allowDevelopmentEnvironment: false }),
        );
        expect(mocks.set).toHaveBeenCalledWith(
            expect.stringContaining("attest:production:"),
            expect.any(String),
            { nx: true },
        );
    });
    it("binds exact method, target and body without consuming original request", async () => {
        const req = request('{"guess":"ASD"}');
        expect(await assertionPayload(req, "1234567890")).toBe(
            [
                "trackdown-app-attest-v1",
                "1234567890",
                "POST",
                "/api/v1/nl/puzzles/2/guesses?locale=nl",
                createHash("sha256").update('{"guess":"ASD"}').digest("hex"),
            ].join("\n"),
        );
        expect(await req.text()).toBe('{"guess":"ASD"}');
    });
    it("rejects replay after cryptographic verification", async () => {
        await checkAssertion(request());
        mocks.eval.mockResolvedValue(0);
        await expect(checkAssertion(request())).rejects.toMatchObject({
            code: "unknown_client",
        });
    });
    it("rejects stale assertions before accessing storage", async () => {
        const req = request();
        req.headers.set("Trackdown-Attest-Timestamp", "1000000000");
        await expect(checkAssertion(req)).rejects.toMatchObject({
            code: "unknown_client",
        });
        expect(mocks.get).not.toHaveBeenCalled();
    });
    it("observes invalid proofs but enforces selected keys, including store outages", async () => {
        mocks.get.mockRejectedValue(new Error("offline"));
        expect(await appAttestError(request())).toBeNull();
        vi.stubEnv("TRACKDOWN_ATTEST_MODE", "enforce");
        expect(await appAttestError(request())).toMatchObject({
            code: "unknown_client",
        });
        vi.stubEnv("TRACKDOWN_ATTEST_REQUIRED_CLIENT_KEYS", "other-key");
        expect(await appAttestError(request())).toBeNull();
    });
    it("disables public caching for protected responses", async () => {
        const handler = guarded(() =>
            Promise.resolve(jsonResponse({}, 200, "deploy")),
        );
        const response = await handler({ request: request(), params: {} });
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    });
    it("leaves registration reachable during enforcement", async () => {
        vi.stubEnv("TRACKDOWN_ATTEST_MODE", "enforce");
        expect(
            await appAttestError(new Request("https://trackdown.nl/api/v1/attest")),
        ).toBeNull();
        expect(mocks.get).not.toHaveBeenCalled();
    });
});
