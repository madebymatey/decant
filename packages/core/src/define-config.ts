import type { z } from "zod"
import { ConfigSchema } from "./config.schema"

export type Config = z.infer<typeof ConfigSchema>

export function defineConfig(input: unknown): Config {
  const result = ConfigSchema.safeParse(input)
  if (!result.success) {
    throw new Error(
      `Invalid platform config:\n${result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`
    )
  }
  return result.data
}
