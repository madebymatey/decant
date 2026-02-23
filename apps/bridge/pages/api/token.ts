import type { NextApiRequest, NextApiResponse } from "next"
import { isAllowedOrigin, issueToken } from "../../lib/token"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const origin = req.headers.origin

    // CORS
    res.setHeader("Vary", "Origin")
    if (origin && isAllowedOrigin(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin)
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    } else if (origin) {
        return res.status(403).json({ error: "Forbidden origin", origin })
    }

    if (req.method === "OPTIONS") return res.status(200).end()
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

    if (!origin) return res.status(400).json({ error: "Missing Origin header" })
    if (!isAllowedOrigin(origin)) return res.status(403).json({ error: "Forbidden origin", origin })

    const token = issueToken(origin)
    return res.status(200).json({ token })
}