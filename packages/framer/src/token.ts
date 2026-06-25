import crypto from "node:crypto"

/**
 * Short-lived, origin-bound HMAC token used to gate middleware API routes that
 * a Framer code component calls from the browser. Lifted from the original
 * bridge app and made reusable + env-overridable.
 */
export type FramerTokenOptions = {
  /** HMAC secret. Defaults to `process.env.TOKEN_SECRET`. */
  secret?: string
  /** Token lifetime in seconds. Defaults to `TOKEN_TTL_SECONDS` env or 300. */
  ttlSeconds?: number
}

type TokenPayload = {
  aud: "framer"
  origin: string
  iat: number
  exp: number
}

type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: string }

function resolveSecret(secret?: string): string {
  const resolved = secret ?? process.env.TOKEN_SECRET
  if (!resolved) {
    throw new Error("Missing TOKEN_SECRET")
  }
  return resolved
}

function resolveTtl(ttlSeconds?: number): number {
  if (typeof ttlSeconds === "number") {
    return ttlSeconds
  }
  return Number(process.env.TOKEN_TTL_SECONDS ?? "300")
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj))
}

function sign(data: string, secret: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest())
}

/** Issue a short-lived token bound to the requesting origin. */
export function issueToken(origin: string, opts: FramerTokenOptions = {}): string {
  const secret = resolveSecret(opts.secret)
  const ttl = resolveTtl(opts.ttlSeconds)
  const now = Math.floor(Date.now() / 1000)

  const payload: TokenPayload = {
    aud: "framer",
    origin,
    iat: now,
    exp: now + ttl,
  }

  const encodedHeader = b64urlJson({ alg: "HS256", typ: "JWT" })
  const encodedPayload = b64urlJson(payload)
  const toSign = `${encodedHeader}.${encodedPayload}`
  return `${toSign}.${sign(toSign, secret)}`
}

/** Verify a token's signature, expiry, audience, and origin binding. */
export function verifyToken(
  token: string,
  origin: string,
  opts: FramerTokenOptions = {}
): VerifyResult {
  const secret = resolveSecret(opts.secret)

  const parts = token.split(".")
  if (parts.length !== 3) {
    return { ok: false, reason: "bad_format" }
  }

  const [headerB64, payloadB64, signature] = parts
  const expected = sign(`${headerB64}.${payloadB64}`, secret)

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" }
  }

  const payloadJson = Buffer.from(
    payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8")

  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    return { ok: false, reason: "bad_payload" }
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "bad_payload" }
  }
  const payload = parsed as TokenPayload

  const now = Math.floor(Date.now() / 1000)
  if (payload.aud !== "framer") {
    return { ok: false, reason: "bad_aud" }
  }
  if (payload.exp <= now) {
    return { ok: false, reason: "expired" }
  }
  if (payload.origin !== origin) {
    return { ok: false, reason: "origin_mismatch" }
  }

  return { ok: true, payload }
}
