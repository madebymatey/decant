import type { Member } from "@decant/core"
import { z } from "zod"

const WwMemberSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export const mapWwMemberToMember = (raw: unknown): Member => {
  const parsed = WwMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "" }
  }
  return parsed.data
}
