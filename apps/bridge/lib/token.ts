import crypto from "crypto"

type TokenPayload = {
    aud: "framer"
    origin: string
    exp: number
    iat: number
}

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

function sign(data: string, secret: string) {
    return b64url(crypto.createHmac("sha256", secret).update(data).digest())
}

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

export function verifyToken(token: string, origin: string) {
    const secret = process.env.TOKEN_SECRET
    if (!secret) throw new Error("Missing TOKEN_SECRET")

    const parts = token.split(".")
    if (parts.length !== 3) return { ok: false as const, reason: "bad_format" }

    const [h, p, s] = parts
    const toSign = `${h}.${p}`
    const expected = sign(toSign, secret)

    // constant-time compare
    const a = Buffer.from(expected)
    const b = Buffer.from(s)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false as const, reason: "bad_signature" }
    }

    const payloadJson = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    const payload = JSON.parse(payloadJson) as TokenPayload

    const now = Math.floor(Date.now() / 1000)
    if (payload.aud !== "framer") return { ok: false as const, reason: "bad_aud" }
    if (payload.exp <= now) return { ok: false as const, reason: "expired" }
    if (payload.origin !== origin) return { ok: false as const, reason: "origin_mismatch" }

    return { ok: true as const, payload }
}

export function isAllowedOrigin(origin?: string) {
    if (!origin) return false
    const allowed = (process.env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    return allowed.includes(origin)
}