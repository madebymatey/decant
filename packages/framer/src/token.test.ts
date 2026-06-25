import { describe, it, expect } from "vitest"
import { issueToken, verifyToken } from "./token"

const SECRET = "test-secret"
const ORIGIN = "https://client.example.com"

describe("framer token", () => {
  it("round-trips a valid origin-bound token", () => {
    const token = issueToken(ORIGIN, { secret: SECRET, ttlSeconds: 300 })
    const result = verifyToken(token, ORIGIN, { secret: SECRET })
    expect(result.ok).toBe(true)
  })

  it("rejects a token presented from a different origin", () => {
    const token = issueToken(ORIGIN, { secret: SECRET })
    const result = verifyToken(token, "https://evil.example.com", {
      secret: SECRET,
    })
    expect(result).toMatchObject({ ok: false, reason: "origin_mismatch" })
  })

  it("rejects a token signed with a different secret", () => {
    const token = issueToken(ORIGIN, { secret: SECRET })
    const result = verifyToken(token, ORIGIN, { secret: "other-secret" })
    expect(result).toMatchObject({ ok: false, reason: "bad_signature" })
  })

  it("rejects an expired token", () => {
    const token = issueToken(ORIGIN, { secret: SECRET, ttlSeconds: -1 })
    const result = verifyToken(token, ORIGIN, { secret: SECRET })
    expect(result).toMatchObject({ ok: false, reason: "expired" })
  })

  it("rejects a malformed token", () => {
    const result = verifyToken("not-a-token", ORIGIN, { secret: SECRET })
    expect(result).toMatchObject({ ok: false, reason: "bad_format" })
  })
})
