// apps/bridge/pages/api/token.ts

import type { NextApiRequest, NextApiResponse } from "next"
import { isAllowedOrigin, issueToken } from "../../lib/token"

type TokenApiResponse = { token: string; expiresIn: number }

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<TokenApiResponse | any>
) {
    const origin = req.headers.origin

    // Always vary by origin (important for caching/CDN)
    res.setHeader("Vary", "Origin")

    // Enforce allowlist + set CORS
    if (origin) {
        if (!isAllowedOrigin(origin)) {
            return res.status(403).json({ error: "Forbidden origin", origin })
        }

        res.setHeader("Access-Control-Allow-Origin", origin)
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    }

    // Preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end()
    }

    // Only POST allowed
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    if (!origin) {
        return res.status(400).json({ error: "Missing Origin header" })
    }

    try {
        const token = issueToken(origin)
        const expiresIn = Number(process.env.TOKEN_TTL_SECONDS ?? "300")
        return res.status(200).json({ token, expiresIn })
    } catch (e: any) {
        return res.status(500).json({
            error: "Failed to issue token",
            details: String(e?.message ?? e),
        })
    }
}