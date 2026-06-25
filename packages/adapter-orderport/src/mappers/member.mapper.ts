import type { Member } from "@decant/core"
import { z } from "zod"

const OpMemberSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export const mapOpMemberToMember = (raw: unknown): Member => {
  const parsed = OpMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "" }
  }
  return parsed.data
}
