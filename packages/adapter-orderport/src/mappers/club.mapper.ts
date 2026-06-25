import type { Club } from "@decant/core"
import { z } from "zod"

const OpClubSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default(""),
  description: z.string().optional(),
})

export const mapOpClubToClub = (raw: unknown): Club => {
  const parsed = OpClubSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "", name: "" }
  }
  return parsed.data
}
