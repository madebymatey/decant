import type { NextApiRequest, NextApiResponse } from "next"
import { protectApi } from "../../lib/protect"

/**
 * GET /api/collections -> Framer-ready collection list.
 *
 * TODO(withwine): implement once the WithWine collections/categories endpoint is
 * confirmed. Add `getCollections()` to the core PlatformAdapter interface and
 * the WithWine adapter, then map here. Returns an empty list for now.
 */
export default protectApi(async (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ items: [] })
})
