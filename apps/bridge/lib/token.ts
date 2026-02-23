import crypto from "crypto"

/**
 * Token payload shape
 */
type TokenPayload = {
    aud: "framer"
    origin: string
    iat: number
    exp: number
}

/**
 * Base64 URL encode
 */
function b64url(input: Buffer | string) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
    return buf
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
}

function b64urlJson(obj: any) {
    return b64url(JSON.stringify(obj))
}

/**
 * HMAC SHA256 signature
 */
function sign(data: string, secret: string) {
    return b64url(crypto.createHmac("sha256", secret).update(data).digest())
}

/**
 * Issue short-lived token tied to requesting origin
 */
export function issueToken(origin: string) {
    const secret = process.env.TOKEN_SECRET
    if (!secret) throw new Error("Missing TOKEN_SECRET")

    const ttl = Number(process.env.TOKEN_TTL_SECONDS ?? "300")
    const now = Math.floor(Date.now() / 1000)

    const payload: TokenPayload = {
        aud: "framer",
        origin,
        iat: now,
        exp: now + ttl,
    }

    const header = { alg: "HS256", typ: "JWT" }

    const encodedHeader = b64urlJson(header)
    const encodedPayload = b64urlJson(payload)
    const toSign = `${encodedHeader}.${encodedPayload}`
    const signature = sign(toSign, secret)

    return `${toSign}.${signature}`
}

/**
 * Verify token + origin binding
 */
export function verifyToken(token: string, origin: string) {
    const secret = process.env.TOKEN_SECRET
    if (!secret) throw new Error("Missing TOKEN_SECRET")

    const parts = token.split(".")
    if (parts.length !== 3) {
        return { ok: false as const, reason: "bad_format" }
    }

    const [headerB64, payloadB64, signature] = parts
    const toSign = `${headerB64}.${payloadB64}`
    const expected = sign(toSign, secret)

    const a = Buffer.from(expected)
    const b = Buffer.from(signature)

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false as const, reason: "bad_signature" }
    }

    const payloadJson = Buffer.from(
        payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
    ).toString("utf8")

    const payload = JSON.parse(payloadJson) as TokenPayload
    const now = Math.floor(Date.now() / 1000)

    if (payload.aud !== "framer") {
        return { ok: false as const, reason: "bad_aud" }
    }

    if (payload.exp <= now) {
        return { ok: false as const, reason: "expired" }
    }

    if (payload.origin !== origin) {
        return { ok: false as const, reason: "origin_mismatch" }
    }

    return { ok: true as const, payload }
}

/**
 * Origin allowlist logic
 */
export function isAllowedOrigin(origin?: string) {
    if (!origin) return false

    // Exact allowlist from env
    const allowed = (process.env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

    if (allowed.includes(origin)) return true

    // Optional support for Framer editor/preview
    const allowFramer = process.env.ALLOW_FRAMER_EDITOR_ORIGINS === "true"
    if (allowFramer) {
        const o = origin.toLowerCase()
        if (o.endsWith(".framercanvas.com")) return true
        if (o.endsWith(".framer.app")) return true
        if (o === "https://framer.com") return true
        if (o === "https://www.framer.com") return true
    }

    return false
}