import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { isAllowedOrigin, verifyToken } from "./token"

type ProtectOptions = {
    methods?: Array<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">
    allowHeaders?: string[]
}

function getBearerToken(req: NextApiRequest) {
    const h = req.headers.authorization
    if (!h) return null
    const m = /^Bearer\s+(.+)$/i.exec(h)
    return m?.[1] ?? null
}

export function protectApi(handler: NextApiHandler, opts: ProtectOptions = {}): NextApiHandler {
    const methods = opts.methods ?? ["GET"]
    const allowHeaders = opts.allowHeaders ?? ["Content-Type", "Authorization"]

    return async (req: NextApiRequest, res: NextApiResponse) => {
        const origin = req.headers.origin

        // Always vary by origin for caches
        res.setHeader("Vary", "Origin")

        // If browser origin exists, enforce allowlist + set CORS headers
        if (origin) {
            if (!isAllowedOrigin(origin)) {
                return res.status(403).json({ error: "Forbidden origin", origin })
            }

            res.setHeader("Access-Control-Allow-Origin", origin)
            res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(","))
            res.setHeader("Access-Control-Allow-Headers", allowHeaders.join(", "))
        }

        // Preflight
        if (req.method === "OPTIONS") return res.status(200).end()

        // Method check
        if (!req.method || !methods.includes(req.method as any)) {
            return res.status(405).json({ error: "Method not allowed" })
        }

        // Require origin for browser calls (you can relax this if you want)
        if (!origin) {
            return res.status(400).json({ error: "Missing Origin header" })
        }

        // Require bearer token
        const token = getBearerToken(req)
        if (!token) return res.status(401).json({ error: "Missing bearer token" })

        const v = verifyToken(token, origin)
        if (!v.ok) return res.status(401).json({ error: "Invalid token", reason: v.reason })

        return handler(req, res)
    }
}