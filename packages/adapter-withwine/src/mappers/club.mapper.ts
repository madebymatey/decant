import type { Club } from "@decant/core"
import { z } from "zod"

const WwClubSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default(""),
  description: z.string().optional(),
})

export const mapWwClubToClub = (raw: unknown): Club => {
  const parsed = WwClubSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "", name: "" }
  }
  return parsed.data
}
