import type { NextApiRequest, NextApiResponse } from "next"
import { parseFieldsParam, pickFields, toFramerProduct } from "@decant/framer"
import { getCatalogProduct } from "../../../lib/catalog"
import { protectApi } from "../../../lib/protect"
import { sendPlatformError } from "../../../lib/respond"
import { resolvedConfig } from "../../../storefront.config"

/**
 * GET /api/products/:id -> single Framer-ready product. Origin + token protected.
 * Supports the same `?fields=` selection as the list route.
 */
export default protectApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!id) {
    return res
      .status(400)
      .json({ error: { code: "MISSING_ID", message: "Missing product id" } })
  }

  try {
    const product = toFramerProduct(await getCatalogProduct(id), {
      locale: resolvedConfig.locale,
    })
    const fields = parseFieldsParam(req.query.fields)
    res.status(200).json({
      product: fields ? pickFields(product, fields) : product,
    })
  } catch (e: unknown) {
    sendPlatformError(res, e)
  }
})
