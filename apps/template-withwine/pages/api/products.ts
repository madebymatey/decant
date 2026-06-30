import type { NextApiRequest, NextApiResponse } from "next"
import { parseFieldsParam, pickFields, toFramerProducts } from "@decant/framer"
import { getCatalogProducts } from "../../lib/catalog"
import { protectApi } from "../../lib/protect"
import { sendPlatformError } from "../../lib/respond"
import { resolvedConfig } from "../../storefront.config"

/**
 * GET /api/products -> Framer-ready product list. Origin + token protected.
 * Optional `?fields=image,title,price,category` trims each item server-side.
 */
export default protectApi(async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const products = await getCatalogProducts()
    const items = toFramerProducts(products, { locale: resolvedConfig.locale })
    const fields = parseFieldsParam(req.query.fields)
    res.status(200).json({
      items: fields ? items.map((p) => pickFields(p, fields)) : items,
    })
  } catch (e: unknown) {
    sendPlatformError(res, e)
  }
})
