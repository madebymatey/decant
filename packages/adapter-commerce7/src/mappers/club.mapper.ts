import type { Club } from "@decant/core"
import { z } from "zod"

const C7ClubSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default(""),
  description: z.string().optional(),
})

export const mapC7ClubToClub = (raw: unknown): Club => {
  const parsed = C7ClubSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "", name: "" }
  }
  return parsed.data
}
