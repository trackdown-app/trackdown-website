import { createHash, generateKeyPairSync, sign } from "node:crypto";
import cbor from "cbor";
import { describe, expect, it } from "vitest";
import { verifyAssertion, verifyAttestation } from "node-app-attest";

// Exercise the real verifier, independently of the orchestration mocks.
const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
});
const identity = {
    teamIdentifier: "TEAMID",
    bundleIdentifier: "nl.trackdown.Trackdown",
};
const payload = "trackdown-app-attest-v1\n1234567890\nGET\n/api/v1/meta\nhash";
const authenticatorData = Buffer.alloc(37);
createHash("sha256")
    .update(`${identity.teamIdentifier}.${identity.bundleIdentifier}`)
    .digest()
    .copy(authenticatorData);
authenticatorData.writeUInt32BE(5, 33);
const nonce = createHash("sha256")
    .update(
        Buffer.concat([
            authenticatorData,
            createHash("sha256").update(payload).digest(),
        ]),
    )
    .digest();
const assertion = await cbor.encodeAsync({
    authenticatorData,
    signature: sign("sha256", nonce, privateKey),
});
const options = {
    ...identity,
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    assertion,
    payload,
    signCount: 4,
};

describe("App Attest cryptography", () => {
    it("accepts valid signatures with increasing counters", () => {
        expect(verifyAssertion(options)).toEqual({ signCount: 5 });
    });
    it("rejects modified payloads, identities, counters and signatures", async () => {
        const badAssertion = await cbor.encodeAsync({
            authenticatorData,
            signature: Buffer.alloc(70),
        });
        expect(() =>
            verifyAssertion({ ...options, payload: payload + "tampered" }),
        ).toThrow();
        expect(() =>
            verifyAssertion({ ...options, teamIdentifier: "OTHER" }),
        ).toThrow();
        expect(() => verifyAssertion({ ...options, signCount: 5 })).toThrow();
        expect(() =>
            verifyAssertion({
                ...options,
                assertion: badAssertion,
            }),
        ).toThrow();
    });
    it("rejects untrusted or malformed enrollment objects", async () => {
        const untrustedAttestation = await cbor.encodeAsync({
            fmt: "apple-appattest",
            authData: authenticatorData,
            attStmt: {
                x5c: [Buffer.from("fake"), Buffer.from("fake")],
                receipt: Buffer.from("fake"),
            },
        });
        expect(() =>
            verifyAttestation({
                ...identity,
                challenge: "challenge",
                keyId: "key",
                attestation: untrustedAttestation,
            }),
        ).toThrow();
    });
});
