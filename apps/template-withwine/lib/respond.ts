import type { NextApiResponse } from "next"
import { PlatformError } from "@decant/core"

/** Map a thrown error to a consistent JSON error response. */
export function sendPlatformError(res: NextApiResponse, e: unknown): void {
  if (e instanceof PlatformError) {
    res.status(e.httpStatus ?? 500).json({
      error: { code: e.code, message: e.message, platform: e.platform },
    })
    return
  }
  res.status(500).json({
    error: { code: "INTERNAL", message: "Unexpected error" },
  })
}
