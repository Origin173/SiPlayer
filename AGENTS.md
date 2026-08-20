# Repository Guidelines

## Project Structure

This is a pnpm workspace (`apps/*`, `packages/*`). The Expo Router client is in `apps/mobile` (`app/` routes and `src/` features, player, API, storage, and UI). The Fastify gateway is in `apps/gateway` (`src/routes`, `src/providers`, `src/auth`, `src/cache`, and `src/observability`). Shared Zod contracts live in `packages/contracts`; TypeScript and ESLint configuration lives in `packages/tsconfig` and `packages/eslint-config`. Specifications are in `docs/`, deployment notes in `infra/`, and release tooling in `scripts/release/`. Tests are colocated with source; provider fixtures are under `apps/gateway/src/providers/netease/fixtures`.

## Build, Test, and Development Commands

Use Node.js 22.13+ and pnpm 11.22.0.

```bash
pnpm install                         # install the locked workspace
pnpm dev:gateway                     # run the Fastify gateway with watch mode
pnpm dev:mobile                      # start Expo/Metro
pnpm lint                            # run ESLint
pnpm typecheck                       # type-check every workspace
pnpm test                            # run all Vitest suites
pnpm build                           # build all packages with build scripts
pnpm --filter @siplayer/gateway test # run one workspace's tests
```

CI also runs the Gateway build, Expo export, and Expo Doctor.

## Coding Style & Naming

Write TypeScript with two-space indentation, semicolons, and single-quoted imports. Run `pnpm lint`; ESLint enforces type-only imports, rejects explicit `any`, and permits unused parameters only when prefixed with `_`. Use `camelCase` for functions and variables, `PascalCase` for React components, and Expo Router’s file-based route names under `apps/mobile/app`. Keep UI values in shared theme tokens.

## Testing Guidelines

Vitest is used across the workspace. Name tests `*.test.ts` or `*.test.tsx` and place them beside the implementation. Add regression coverage for changed behavior, then run the focused package suite and `pnpm test`; no coverage threshold is currently configured. Validate background audio or lock-screen changes with an EAS Development Build, not only Expo Go.

## Configuration & Security

Copy the relevant `.env.example` before development. Never commit `.env` files, credentials, upstream cookies, or secrets in `EXPO_PUBLIC_*` variables. The mobile app talks to the Gateway, not the upstream API. Use a strong `SESSION_ENCRYPTION_KEY`, explicit production `ALLOWED_ORIGINS`, and keep temporary/session files on `D:\tmp\siplayer`. The JSON session store is single-instance only.

## Commits & Pull Requests

Follow the established Conventional Commit format, for example `fix(player): preserve shuffle history`, `test(mobile): ...`, or `docs(gateway): ...`. Keep commits focused. Pull requests should explain the behavior change, list validation commands, link the relevant issue or spec, and include screenshots or a short recording for UI changes. Call out platform/device coverage and any required environment or release configuration.
