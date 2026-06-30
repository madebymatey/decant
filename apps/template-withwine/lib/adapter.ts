import type { Config, PlatformAdapter } from "@decant/core"
import { Commerce7Adapter } from "@decant/adapter-commerce7"
import { OrderPortAdapter } from "@decant/adapter-orderport"
import { WithWineAdapter } from "@decant/adapter-withwine"
import { resolvedConfig } from "../storefront.config"

/**
 * Pick the platform adapter for a config. Every adapter implements the same
 * `PlatformAdapter` contract over normalised `@decant/core` types, so the rest
 * of the runtime (API routes, feeds, cart, sync) is integration-agnostic — this
 * switch is the only place that knows which platform is in play.
 */
export function createAdapter(config: Config): PlatformAdapter {
  switch (config.platform) {
    case "withwine":
      return new WithWineAdapter(config)
    case "commerce7":
      return new Commerce7Adapter(config)
    case "orderport":
      return new OrderPortAdapter(config)
    default: {
      const _exhaustive: never = config.platform
      throw new Error(`Unsupported platform: ${String(_exhaustive)}`)
    }
  }
}

/** Single shared adapter instance for all API routes, selected by PLATFORM. */
export const adapter = createAdapter(resolvedConfig)
