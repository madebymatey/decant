import type { NextApiRequest, NextApiResponse } from "next"
import { isDemoMode } from "../../lib/catalog"

/** Unauthenticated liveness probe. `demo: true` means sample data is served. */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: "ok", platform: "withwine", demo: isDemoMode() })
}
