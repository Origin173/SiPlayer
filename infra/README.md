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

## Deployment rules

- Keep解灰/绕过访问控制能力 explicitly disabled in deployment configuration.
- Set a production `SESSION_ENCRYPTION_KEY`, `SESSION_STORE_PATH`, and explicit `ALLOWED_ORIGINS`.
- Store Gateway secrets in environment/secret management, never in the mobile bundle.
- Run `pwsh -File infra/smoke-gateway.ps1 -BaseUrl https://gateway.example.com -Query "歌曲名"` against `/v1/health`, `/v1/ready`, `/v1/auth/qr/start`, `/v1/search`, `/v1/tracks/:id/stream`, and `/v1/tracks/:id/lyrics` after both services are healthy.
- Keep local temporary files under `D:\\tmp\\siplayer`.
