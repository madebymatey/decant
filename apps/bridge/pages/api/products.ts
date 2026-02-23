import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const baseUrl = process.env.C7_BASE_URL!
    const appId = process.env.C7_APP_ID!
    const appSecret = process.env.C7_APP_SECRET!
    const tenant = process.env.C7_TENANT!

    const auth = Buffer.from(`${appId}:${appSecret}`).toString("base64")

    const response = await fetch(`${baseUrl}/product?cursor=start`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        tenant: tenant,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({ error: text })
    }

    const data = await response.json()

    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}