import type { NextApiRequest, NextApiResponse } from "next"
import { isAllowedOrigin, issueToken } from "../../lib/token"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const origin = req.headers.origin

    // Always vary for caches/CDN
    res.setHeader("Vary", "Origin")

    // CORS + allowlist enforcement
    if (origin) {
        if (!isAllowedOrigin(origin)) {
            return res.status(403).json({ error: "Forbidden origin", origin })
        }

        res.setHeader("Access-Control-Allow-Origin", origin)
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    }

    // Preflight
    if (req.method === "OPTIONS") return res.status(200).end()

    // Only POST allowed
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    if (!origin) {
        return res.status(400).json({ error: "Missing Origin header" })
    }

    try {
        const token = issueToken(origin)
        return res.status(200).json({ token })
    } catch (e: any) {
        return res.status(500).json({
            error: "Failed to issue token",
            details: String(e?.message ?? e),
        })
    }
}