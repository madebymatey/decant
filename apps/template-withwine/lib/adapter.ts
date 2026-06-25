import { WithWineAdapter } from "@decant/adapter-withwine"
import { resolvedConfig } from "../withwine.config"

/** Single shared adapter instance for all API routes. */
export const adapter = new WithWineAdapter(resolvedConfig)
