# WithWine SDK auth routes (placeholder)

The product/catalog read path does **not** need these. Add them only when you
wire WithWine **customer** auth/session (login, register, logout, club, orders),
which requires `@withwine/sdk` and a full Next.js Pages Router app — which this
template already is.

Per the WithWine Next.js docs, create these six routes here
(`pages/api/withwine/`), each wrapped with `withWithWineSessionApiRoute`:

| File                  | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `login.ts`            | Redirect to the WithWine authorization page        |
| `login-callback.ts`   | Handle the POST response; set session cookies      |
| `logout.ts`           | Redirect to the WithWine logout page               |
| `logout-callback.ts`  | Handle the GET response; destroy cookies           |
| `token-refresh.ts`    | Refresh an expired access token                     |
| `user.ts`             | Return the current user session (or `defaultUser`) |

SDK surface (from the WithWine docs):

```ts
import {
  getAuthorizationPath,
  getTokenUsingAuthorizationCode,
  getLogoutPath,
  logout,
  refreshToken,
  defaultUser,
  withWineFetchHeaders,
} from "@withwine/sdk"
import { withWithWineSessionApiRoute, withWithWineSessionSsr } from "@withwine/sdk/next"
import { useUser } from "@withwine/sdk/next-client"
import type { RefreshTokenPayload, User } from "@withwine/sdk/types"
```

Also required when enabling auth:

- `withwine.config.json` at the app root (`brandId`, `clientId`, `appBaseUrl`,
  `authBaseUrl`, `assetBaseUrl`, `apiBaseUrl` per environment)
- env: `WW_CLIENT_SECRET`, `WW_ENV`

> Provide these auth items and we'll fill in the routes + UI (`useUser`,
> login/logout links).

Docs:

- https://webdocs.withwine.com/docs/websites/javascript-sdk/next/authorization-api
- https://webdocs.withwine.com/docs/websites/javascript-sdk/next/authorization-ui
