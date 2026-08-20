# SiPlayer

SiPlayer is a phone-first, quiet, music-first Netease Cloud Music third-party player.

作者：**Origin173**

## Repository layout

```text
apps/mobile       Expo SDK 57 + Expo Router mobile app
apps/gateway      Fastify BFF and stable API boundary
packages/contracts Shared Zod contracts and app models
packages/tsconfig Shared strict TypeScript configurations
packages/eslint-config Shared lint configuration helpers
infra             Local/deployment notes
```

The mobile app never calls `api-enhanced` directly. The Gateway owns upstream sessions, mapping, validation, caching, and error normalization.

## Development

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:gateway
pnpm dev:mobile
```

The Gateway defaults to `http://127.0.0.1:8787`; the fixed upstream service is configured separately through `NETEASE_API_BASE_URL`. In development, encrypted server sessions persist at `D:\\tmp\\siplayer\\gateway-sessions.json`; set `SESSION_STORE_PATH`, a non-default `SESSION_ENCRYPTION_KEY`, and explicit `ALLOWED_ORIGINS` in production.

The file-backed Gateway session store is single-instance only. Do not run multiple Gateway replicas against the same JSON file; migrate sessions to Redis, SQLite, or another shared store before enabling multi-instance deployment.

For background audio and lock-screen controls, use an EAS Development Build (`eas build --profile development --platform android|ios`). Expo Go is only for early JS/UI validation. Set `EXPO_PUBLIC_GATEWAY_URL` to a device-reachable HTTPS Gateway URL for a physical-device build; the local default is for desktop/emulator development.

## Local cache policy

Project temporary/build caches belong on `D:\\tmp\\siplayer` (or another D: location), never on C:.

## Specs

Read the required specifications in `docs/` before changing architecture or contracts.
