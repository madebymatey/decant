import type { Member } from "@decant/core"
import { z } from "zod"

const C7MemberSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export const mapC7MemberToMember = (raw: unknown): Member => {
  const parsed = C7MemberSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "" }
  }
  return parsed.data
}
