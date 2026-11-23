# Isolated Live E2E Suite (`e2e-live`)

> **Status:** Live end-to-end scenarios are **pending** implementation in later remediation phases.
> Creating `playwright.live.config.ts` and this directory claims **zero** live provider or backend acceptance. No synthetic or placeholder tests are included here.

## Isolation & Endpoint Binding Contract

`playwright.live.config.ts` is separated from the mocked default suite (`playwright.config.ts`):

- **Default mocked suite (`playwright.config.ts`)**: targets `./e2e`, owns its own `vite preview` server on `http://127.0.0.1:5173`, and sets `reuseExistingServer: false` so it never attaches to an arbitrary already-running server.
- **Explicit live suite (`playwright.live.config.ts`)**: targets `./e2e-live` and requires **both**:
  - `E2E_LIVE_FRONTEND_URL` (e.g., `http://127.0.0.1:4173`)
  - `E2E_LIVE_BACKEND_URL` (e.g., `http://127.0.0.1:18080`)
- **Strict URL validation at config load time**:
  - Missing or blank URLs throw immediately.
  - Only explicit `http:` loopback root-origin URLs (`127.0.0.1`, `localhost`, `::1`) with an explicit numeric port (`1..65535`) are accepted.
  - External/shared URLs, `https:`, non-root paths, query strings, hashes, embedded credentials (never echoed in errors), and same-origin frontend/backend collisions are rejected before Playwright starts.
- **Owned frontend server & API binding**:
  - `playwright.live.config.ts` owns its own isolated Vite dev server (`reuseExistingServer: false`, `--strictPort`, `--mode e2e` on the validated frontend host/port).
  - The remediation worktree contains no copied `.env` file, and `--mode e2e` avoids `.env.development` overrides while `webServer.env` explicitly pins **both** `VITE_API_BASE_URL` to `${backend.origin}/api` (used by `src/lib/http.ts` for `/v1/...` calls) and `VITE_API_PROXY_TARGET` to `backend.origin` (used by `vite.config.ts` for `/api` and `/ws` proxies).

## Config Behavior Unit Tests

```powershell
node --test tools/verification/test-playwright-config.mjs
```

## Coordinator Verification Commands

1. Confirm missing URLs fail closed before Playwright runs:
   `npx playwright test -c playwright.live.config.ts --list`
2. Confirm external/shared URLs are rejected:
   `$env:E2E_LIVE_FRONTEND_URL="http://shared.example.com:4173"; $env:E2E_LIVE_BACKEND_URL="http://127.0.0.1:18080"; npx playwright test -c playwright.live.config.ts --list`
3. Confirm distinct loopback URLs pass config validation (reporting zero tests until later-phase live specs are added):
   `$env:E2E_LIVE_FRONTEND_URL="http://127.0.0.1:4173"; $env:E2E_LIVE_BACKEND_URL="http://127.0.0.1:18080"; npx playwright test -c playwright.live.config.ts --list`
4. Confirm mocked suite stays green using its own preview server:
   `npm run build && npx playwright test -c playwright.config.ts`
