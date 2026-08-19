# Infrastructure

The production topology keeps `api-enhanced` private and exposes only the Gateway.

## Fixed upstream bootstrap

The spec baseline is `v4.40.1`. Verify the release before deployment, then build it from the immutable tag instead of using a floating `latest` image:

```bash
git clone --branch v4.40.1 --depth 1 https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git
cd api-enhanced
pnpm install --frozen-lockfile
ENABLE_PROXY=false ENABLE_GENERAL_UNBLOCK=false PORT=3000 node app.js
```

The Gateway should reach this service only over a private network through `NETEASE_API_BASE_URL`. Do not expose port 3000 publicly.

## Gateway production start

From the repository root, install the workspace and compile the Gateway:

```bash
cd ~/gateway/SiPlayer
pnpm install --frozen-lockfile
pnpm --filter @siplayer/gateway build
```

Set the production environment variables before starting it. The minimum production configuration is:

```bash
export NODE_ENV=production
export HOST=127.0.0.1
export PORT=8787
export NETEASE_API_BASE_URL=http://127.0.0.1:3000
export SESSION_ENCRYPTION_KEY='replace-with-a-long-random-secret'
export SESSION_STORE_PATH=/var/lib/siplayer/gateway-sessions.json
export ALLOWED_ORIGINS=https://api.example.com
export TRUST_PROXY=true
pnpm --filter @siplayer/gateway start
```

Keep the Gateway behind Nginx/Caddy at the public HTTPS URL and proxy it to `127.0.0.1:8787`. The mobile app must use that public URL as `EXPO_PUBLIC_GATEWAY_URL`. The repository is a monorepo, but the Gateway build command above is intentionally run from the repository root; only EAS commands for the mobile app must run from `apps/mobile`.

## Deployment rules

- Keep解灰/绕过访问控制能力 explicitly disabled in deployment configuration.
- Set a production `SESSION_ENCRYPTION_KEY`, `SESSION_STORE_PATH`, and explicit `ALLOWED_ORIGINS`.
- Store Gateway secrets in environment/secret management, never in the mobile bundle.
- Run `pwsh -File infra/smoke-gateway.ps1 -BaseUrl https://gateway.example.com -Query "歌曲名"` after both services are healthy. The default smoke verifies health, ready/upstream availability, track search, track detail, stream, lyrics, and negative validation responses; it does not require login QR or a playlist.
- Use `-IncludeQr` to require the unauthenticated QR-start contract, `-PlaylistId <id>` to verify playlist detail, and `-TrackId <id>` to avoid selecting a track from search. Use `-SkipNegativeChecks` only when the environment forbids safe validation probes.
- HTTP failures are captured as structured diagnostics (`status`, `data.upstream`, `error.code`, `requestId`) instead of being hidden by PowerShell's HTTP exception. `TRACK_UNAVAILABLE` and `AUTH_REQUIRED` are classified explicitly; pass `-AcceptExpectedTrackErrors` only when that non-playable/auth-required result is intentional.
- The script requires successful envelopes with `requestId`, checks key data fields and HTTP(S) stream URLs, never prints response bodies/tokens/cookies, and exits non-zero after recording the checks completed before failure.
- The smoke must run against the pinned `api-enhanced` v4.40.1 tag (or a recorded immutable commit), not a floating `latest` image. Record the upstream tag/commit, Gateway version, date, and result in `docs/qa/MVP_REAL_DEVICE_MATRIX.md` or a release-specific QA record.
- Keep local temporary files under `D:\\tmp\\siplayer`.
