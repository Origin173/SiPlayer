# 极简网易云第三方播放器 — Technical Spec

> Technical Spec v2.0  
> Baseline: 2026-08-19

## 0. 强制技术决策

### Mobile baseline

```text
Expo SDK 57 baseline
React Native version managed by Expo compatibility
React Native New Architecture
TypeScript strict
pnpm
```

不要手动将 React Native 升级到与当前 Expo SDK 不兼容的版本。

### Backend baseline

```text
Node.js >= 22
TypeScript
Fastify
Zod
```

### 网易云上游

唯一一期上游：

```text
NeteaseCloudMusicApiEnhanced/api-enhanced
```

Repository：

```text
https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced
```

Docs：

```text
https://neteasecloudmusicapienhanced.js.org/
```

截至本规范日期，GitHub 最新 release 为 `v4.40.1`。实现前仍必须重新检查当前 release / README / 文档，不能把本规范中的时间点当作永久事实。


---

## 1. 系统架构

```text
┌───────────────────────────────────────────────┐
│                apps/mobile                    │
│                                               │
│ Expo Router                                   │
│ Features / UI / Query / Player / Local Data  │
└────────────────────────┬──────────────────────┘
                         │ HTTPS
                         ▼
┌───────────────────────────────────────────────┐
│                apps/gateway                   │
│                                               │
│ Auth Session / Validation / Mapper / Cache    │
│ Stable API Contract / Rate Limit / Logging    │
└────────────────────────┬──────────────────────┘
                         │ private HTTP
                         ▼
┌───────────────────────────────────────────────┐
│             api-enhanced service              │
│                                               │
│ NeteaseCloudMusicApiEnhanced/api-enhanced     │
└────────────────────────┬──────────────────────┘
                         ▼
                    网易云上游
```

### 为什么需要 Gateway

Gateway 不是为了重新实现 `api-enhanced`，而是解决：

- 上游字段不稳定
- Session/Cookie 安全
- 统一错误模型
- App 与上游解耦
- 请求校验
- 缓存
- 限流
- 可观察性
- 上游升级兼容

### 不允许的架构

```text
React Native → api-enhanced public/raw endpoint
```

原因：这会让 App 直接绑定上游字段，并把会话和兼容性问题泄漏到客户端。

---

## 2. Monorepo 结构

推荐：

```text
repo/
├─ apps/
│  ├─ mobile/
│  │  ├─ app/
│  │  ├─ src/
│  │  ├─ assets/
│  │  ├─ app.config.ts
│  │  └─ package.json
│  └─ gateway/
│     ├─ src/
│     ├─ tests/
│     └─ package.json
│
├─ packages/
│  ├─ contracts/
│  │  ├─ src/
│  │  └─ package.json
│  ├─ eslint-config/
│  └─ tsconfig/
│
├─ infra/
│  ├─ docker-compose.yml
│  ├─ gateway.Dockerfile
│  └─ README.md
│
├─ docs/
│  ├─ README.md
│  ├─ PRODUCT_SPEC.md
│  ├─ UIUX_SPEC.md
│  ├─ TECH_SPEC.md
│  ├─ API_SPEC.md
│  ├─ ROADMAP.md
│  └─ AI_CODING_PROMPT.md
│
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

### Workspace 规则

- 使用 pnpm workspace。
- `packages/contracts` 可被 mobile 和 gateway 同时依赖。
- 不把 api-enhanced 源码复制进 app。
- 如果生产需要固定上游版本，优先通过独立容器/tag/commit 管理。

---

## 3. Mobile 技术栈

### 3.1 核心依赖

```text
expo
expo-router
expo-audio
expo-secure-store
expo-sqlite
expo-file-system
expo-image
expo-haptics           # P1
react-native-reanimated
react-native-gesture-handler
react-native-safe-area-context
@shopify/flash-list    # v2 / New Architecture
@tanstack/react-query
zustand
zod
```

可选：

```text
@gorhom/bottom-sheet
```

如果选用任何有原生代码的第三方包：

1. 先检查当前 New Architecture 兼容性。
2. 运行 `npx expo-doctor@latest`。
3. 使用 Development Build 真机验证。

### 3.2 明确不使用

- `expo-av`：音频 API 已迁移到 `expo-audio`。
- 旧式 RN Legacy Architecture 方案。
- `AsyncStorage` 保存 token/cookie 等敏感会话。
- Redux 仅为了“看起来企业级”而引入。
- Axios 仅为了发普通 JSON 请求而引入；默认使用封装后的 `fetch`。
- 旧版 FlashList v1 作为新项目基础。

---

## 4. Mobile 目录结构

```text
apps/mobile/
├─ app/
│  ├─ _layout.tsx
│  ├─ (tabs)/
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx              # Home
│  │  ├─ search.tsx
│  │  └─ library.tsx
│  ├─ playlist/[id].tsx
│  ├─ album/[id].tsx
│  ├─ artist/[id].tsx
│  ├─ login.tsx
│  ├─ settings.tsx
│  └─ now-playing.tsx
│
└─ src/
   ├─ api/
   │  ├─ client.ts
   │  ├─ queryKeys.ts
   │  └─ hooks/
   ├─ components/
   │  ├─ ui/
   │  └─ music/
   ├─ features/
   │  ├─ auth/
   │  ├─ home/
   │  ├─ search/
   │  ├─ library/
   │  ├─ playlist/
   │  ├─ lyrics/
   │  └─ player/
   ├─ player/
   │  ├─ PlayerProvider.tsx
   │  ├─ playerController.ts
   │  ├─ queueStore.ts
   │  ├─ playbackResolver.ts
   │  ├─ playbackTypes.ts
   │  └─ usePlayer.ts
   ├─ db/
   ├─ storage/
   ├─ theme/
   ├─ utils/
   └─ types/
```

### 目录约束

- `app/` 只负责路由入口和页面组合。
- 复杂业务逻辑不直接塞入 route file。
- 可复用 UI 放 `components`。
- 领域逻辑放 `features`。
- 播放器全局核心放 `player`，不属于任意页面。

---

## 5. 状态管理

### 5.1 TanStack Query — Server State

负责：

- Search results
- Track detail
- Playlist detail
- Album / Artist data
- Lyrics
- User playlists
- Account profile
- Recommendations
- Like state server sync

规则：

- Query Key 统一工厂生成。
- 网络返回必须运行 Zod contract validation 或最少在 Gateway 保证 schema。
- Mutation 成功后精确 invalidate，不全局清缓存。
- 不把 Query data 再复制到 Zustand。

示例：

```ts
queryKeys.search.songs(keyword, page)
queryKeys.playlist.detail(id)
queryKeys.track.lyrics(id)
queryKeys.me.playlists()
```

### 5.2 Zustand — Client State

负责：

- Logical playback queue
- Playback mode
- Current track id
- UI-only player state
- Settings snapshot
- Temporary UI state

不负责：

- API list responses
- Raw Session cookie
- AudioPlayer instance
- Database handle

### 5.3 SecureStore

仅保存：

```text
projectSessionToken
```

可附带：

```text
sessionCreatedAt
```

禁止保存：

```text
rawNeteaseCookie
password
proxy credential
upstream admin token
```

### 5.4 SQLite

本地数据库存：

- playback history metadata
- search history
- app settings（也可配合简单 KV）
- optional cached metadata index

不要把播放 URL 当永久数据保存。

---

## 6. 网络客户端

创建统一：

```ts
ApiClient
```

功能：

- Base URL
- Authorization header
- timeout
- JSON parse
- requestId capture
- typed error
- abort support
- basic retry policy

### Retry 规则

GET：

- 网络瞬断可 retry 1 次。
- 5xx 可视接口决定 retry 1 次。

Mutation：

- 默认不自动 retry，避免重复副作用。

Stream URL resolve：

- 失败可以重新 resolve 1 次。

### Timeout 建议

```text
ordinary metadata request: 8s
search: 8s
login polling request: 6s
stream URL resolve: 8s
```

不要给所有请求无限等待。

---

## 7. 播放器架构

## 7.1 为什么播放器不能写在 NowPlayingScreen 中

如果 player hook 只存在于页面组件：

- 页面卸载可能释放播放器
- 切 Tab 容易状态不一致
- 后台播放容易被生命周期破坏

因此播放器必须放在应用根部：

```text
Root Layout
└─ PlayerProvider
   └─ Navigation
```

## 7.2 MVP Player Engine

首版建议使用一个长期存活的 `expo-audio` player 作为底层 engine。

原因：网易云播放 URL 可能具有时效性，业务队列应该保存 Track ID，而不是提前把整张歌单所有临时 URL 解析后塞进播放器。

逻辑：

```text
Queue Track ID
   ↓
PlaybackResolver
   ↓
GET /v1/tracks/:id/stream
   ↓
short-lived playable URL
   ↓
expo-audio player.replace(...)
   ↓
play()
```

### Logical Queue

```ts
interface QueueItem {
  trackId: string;
  title: string;
  artistText: string;
  artworkUrl?: string;
  durationMs?: number;
}
```

不持久化：

```text
streamUrl
upstreamCookie
rawSourceHeaders
```

## 7.3 Player 状态机

```text
idle
→ resolving
→ loading
→ buffering
→ playing
↔ paused
→ ended
→ resolving(next)

failure branches:
resolving → unavailable
loading/buffering → error
```

UI 不能只用一个 `isPlaying` boolean 表达全部状态。

## 7.4 关键动作

PlayerController 至少提供：

```ts
playTrack(track, context?)
play()
pause()
toggle()
seekTo(seconds)
next()
previous()
setQueue(items, startIndex)
addNext(item)
addToQueue(item)
removeFromQueue(index)
clearQueue()
setMode(mode)
```

## 7.5 Background Playback

Expo `expo-audio` config plugin 必须启用 background playback。

运行时音频 session 需要支持后台播放，并正确配置 silent mode / interruption behavior。

iOS：

- 需要 `audio` background mode。
- 锁屏后继续播放。
- Control Center 显示 metadata。

Android：

- background playback 使用 media foreground service。
- 必须正确启用 lock-screen/media controls，避免后台播放被系统提前停止。

## 7.6 Lock Screen Metadata

每次 current track 变化更新：

```text
title
artist
album
artwork
```

不要在每次 progress tick 重写 metadata。

## 7.7 Progress

播放器内部 status update：约 250–500ms。

UI 显示：

- Normal progress 可以 250–500ms 更新。
- Slider 拖动时使用本地 drag state。
- 松手后执行一次 seek。

## 7.8 Next / Previous

`next()`：

1. 根据 queue mode 求下一个逻辑 index。
2. 解析新的 stream URL。
3. 替换 player source。
4. 更新 lock screen metadata。
5. 播放。

`previous()`：

- 如果当前进度 > 3–5 秒，优先 seek 到 0。
- 否则切换到上一首。

该阈值由 settings 常量统一管理。

## 7.9 URL 过期

播放 URL 视为临时资源。

规则：

- 尽量在真正开始播放前解析。
- 不永久缓存。
- 如果 load/play 失败且原因可能是 URL 失效，重新 resolve 一次。
- 第二次仍失败才进入用户可见错误。

## 7.10 AudioPlaylist

当前 `expo-audio` 已提供 AudioPlaylist / gapless 能力，但首版不强制采用完整 playlist engine。

后续只有在确认：

- URL 生命周期可管理
- 队列替换稳定
- lock screen remote next/previous 行为符合需求

后，再评估将底层 engine 升级到 AudioPlaylist。

不要为了“使用新 API”牺牲临时 URL 的可靠性。

---

## 8. 播放质量

移动端只使用项目自己的枚举：

```ts
type AudioQuality =
  | 'auto'
  | 'standard'
  | 'high'
  | 'lossless'
  | 'hi_res';
```

Gateway Mapper 再转换成当前 `api-enhanced` 所支持的真实 level。

原因：上游可能增加/修改音质枚举，不应该让 App 到处出现上游字面值。

返回 stream 时包含：

```ts
requestedQuality
actualQuality
```

如果账号权限不足，Gateway 可以降级到合法可用音质，但必须告诉 App 实际音质。

---

## 9. api-enhanced 服务部署

## 9.1 Development

可独立运行：

```bash
pnpm i
node app.js
```

默认端口当前 README 为 3000。

## 9.2 Production

推荐：

```text
Docker / immutable deployment
Gateway and api-enhanced on private network
Only Gateway exposed publicly
```

示意：

```yaml
services:
  gateway:
    # public
  netease-api:
    # private only
```

### Version pinning

生产不要只写：

```text
image: ...:latest
```

推荐：

```text
verified release tag
or immutable digest
or pinned git commit build
```

每次更新 api-enhanced：

1. 新分支升级。
2. 运行 Gateway contract tests。
3. 运行登录 / 搜索 / 歌词 / stream smoke tests。
4. 验证成功再上线。

## 9.3 Upstream 环境变量

`api-enhanced` 当前 README 中存在代理、随机 IP、音质及解锁相关配置。

本项目规范：

- 不把这些开关透传给移动端。
- 不允许 App 传任意 `proxy` 参数。
- 代理如因服务器网络环境确有需要，只由运维层配置。
- 随机 IP 等能力默认关闭，除非有明确合法运维需求。
- **不要依赖或启用用于绕过版权、会员、地区或访问控制的“解锁/解灰”能力。** 如果部署版本默认开启相关能力，应在项目部署配置中显式关闭。

目标是做第三方客户端，而不是规避服务访问控制。

---

## 10. Gateway 技术设计

目录：

```text
apps/gateway/src/
├─ server.ts
├─ app.ts
├─ config/
├─ routes/
├─ schemas/
├─ services/
├─ providers/
│  └─ netease/
│     ├─ client.ts
│     ├─ endpoints.ts
│     ├─ mapper.ts
│     ├─ rawTypes.ts
│     ├─ errors.ts
│     └─ index.ts
├─ auth/
├─ db/
├─ cache/
├─ middleware/
└─ observability/
```

## 10.1 NeteaseApiClient

唯一负责调用 `api-enhanced`。

职责：

- build upstream URL
- attach upstream cookie
- timeout
- parse raw response
- identify raw errors
- sanitize logs

禁止：

- 把 Fastify request 直接整对象传给 upstream。
- 自动转发所有 query 参数。
- 输出 cookie 到 logger。

## 10.2 Mapper

Mapper 是兼容性核心。

示例：

```text
RawNeteaseSong
  ↓
mapTrack()
  ↓
Track
```

上游字段变化只能影响：

```text
providers/netease/rawTypes.ts
providers/netease/mapper.ts
```

理想情况下 App 和 route response 不改。

## 10.3 Shared Contracts

`packages/contracts` 中定义：

```text
TrackSchema
ArtistSchema
AlbumSchema
PlaylistSummarySchema
PlaylistDetailSchema
LyricsSchema
StreamInfoSchema
UserProfileSchema
ApiErrorSchema
```

Gateway response 在开发/测试环境验证。

Mobile 使用同一 TypeScript 类型，必要时做 runtime parse。

---

## 11. Authentication / Session

### 11.1 原则

移动端不保存原始网易云 Cookie。

流程：

```text
App
→ POST /v1/auth/qr/start
→ Gateway
→ api-enhanced QR endpoints

用户扫码确认

App polls Gateway
→ Gateway obtains upstream session/cookie
→ Gateway stores upstream cookie server-side
→ Gateway returns project session token
→ App stores token in SecureStore
```

### 11.2 Project Session

App Header：

```text
Authorization: Bearer <opaque-project-session-token>
```

Gateway：

```text
project token
  ↓ lookup
server-side session
  ↓
upstream cookie
```

### 11.3 Server-side session storage

单实例个人部署起步：SQLite 可接受。

字段示意：

```text
id
session_hash
upstream_cookie_encrypted
user_id
created_at
expires_at
last_seen_at
revoked_at
```

Cookie 在 DB 中要加密存储，密钥只来自环境变量。

多实例部署：迁移到 Redis / shared store。

### 11.4 Logout

必须：

1. Gateway revoke server-side session。
2. App 删除 SecureStore token。
3. 清理 me/* Query cache。
4. 保留不敏感本地播放历史由产品策略决定。

---

## 12. Caching

## 12.1 Gateway cache

建议起始 TTL：

| 数据 | TTL |
|---|---:|
| Track detail | 6h |
| Album detail | 3h |
| Artist basic | 3h |
| Lyrics | 6h |
| Playlist detail | 1–5min |
| Search | 30–60s |
| User playlists | 30–60s |
| Recommendations | 1–5min |
| Stream URL | 不持久化；最多极短内存缓存 |
| Auth status | 不缓存 |

TTL 是默认值，不是协议承诺。

### 缓存 Key

必须包含会影响结果的维度：

```text
track id
query
page
user/session scope
quality
```

不要把用户私有响应当公共缓存。

## 12.2 Mobile query cache

TanStack Query staleTime 可与 Gateway TTL 不同。

建议：

- metadata：分钟级 stale
- lyrics：长 stale
- library：短 stale
- search：短 stale

### Artwork

使用 `expo-image`，利用其内存/磁盘缓存能力，避免自己重复实现图片缓存系统。

---

## 13. 本地数据库

建议表：

```sql
playback_history
search_history
app_setting
cached_entity_index   -- optional
```

### playback_history

```text
track_id TEXT PRIMARY KEY
played_at INTEGER
play_count INTEGER
title TEXT
artist_text TEXT
artwork_url TEXT NULL
duration_ms INTEGER NULL
```

只存最小可显示快照。

### search_history

```text
id INTEGER PRIMARY KEY
keyword TEXT UNIQUE
searched_at INTEGER
```

最多保留例如 20–50 条，由设置常量控制。

---

## 14. Error Model

Gateway 统一：

```ts
interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  requestId: string;
}
```

错误码至少：

```text
AUTH_REQUIRED
AUTH_EXPIRED
UPSTREAM_UNAVAILABLE
UPSTREAM_TIMEOUT
NOT_FOUND
TRACK_UNAVAILABLE
QUALITY_UNAVAILABLE
RATE_LIMITED
VALIDATION_ERROR
INTERNAL_ERROR
```

不要把上游 `code` 直接当 App 的稳定错误协议。

---

## 15. Security

### 必须

- Gateway 公网只开放 HTTPS。
- Session token 至少 128-bit 随机强度。
- Server DB 只保存 session token hash，不保存明文 token。
- Upstream cookie 加密存储。
- 日志 redaction：authorization / cookie / password / token。
- Gateway request body/query 用 Zod 白名单验证。
- Rate limit auth/search 等高频入口。
- 配置来源只用环境变量/secret manager。
- CORS 不使用无意义的全开放配置作为生产默认。
- 不向客户端暴露 api-enhanced internal URL。

### SSRF / Proxy 防护

禁止客户端提交：

```text
proxy URL
arbitrary upstream URL
custom host
custom protocol
```

Gateway 只调用配置中固定的 api-enhanced base URL。

---

## 16. Observability

Gateway 使用结构化日志。

每个请求：

```text
requestId
route
statusCode
durationMs
upstreamDurationMs (when relevant)
errorCode
```

禁止记录：

```text
Authorization header
raw cookie
QR login secrets
password
full upstream raw body when it may contain sensitive data
```

### Health

提供：

```text
GET /health
GET /ready
```

`/health`：进程活着。

`/ready`：Gateway 关键依赖状态可用；不要因为网易云短时错误把整个进程杀掉。

---

## 17. Testing

## 17.1 Mobile

至少：

- unit: queue algorithm
- unit: time formatting
- unit: lyrics parser / merger
- unit: player state reducer/controller pure logic
- component: SongRow states
- component: MiniPlayer states
- integration: Search → play mocked track

## 17.2 Gateway

至少：

- mapper fixture tests
- contract schema tests
- auth session tests
- route validation tests
- upstream timeout/error mapping tests
- stream unavailable tests

### Upstream fixtures

可以保留经过脱敏的真实响应 fixture，用于防止 api-enhanced 升级后 mapper 悄悄失效。

禁止把真实 cookie/token 写入 fixture。

## 17.3 Smoke Tests

升级 api-enhanced 后必须人工/自动 smoke：

```text
search
track detail
stream URL
lyrics
QR login
me profile
user playlists
```

---

## 18. Performance

### Mobile

- 大列表优先 FlashList v2。
- Row renderItem 保持稳定引用。
- Artwork 使用尺寸合理的 source。
- 不在 render 中做歌词解析/复杂 map。
- 歌词预处理一次后缓存。
- progress tick 不触发整棵页面树重渲染。
- Player status selector 粒度尽量小。

### App startup

启动阶段不要阻塞：

```text
restore session
open local DB
prepare theme
mount player
```

可以并行的工作并行执行。

不要在 splash 阶段等待 Home 所有网络数据加载完。

---

## 19. iOS / Android Build Strategy

### Windows + iPhone

Windows 没有 iOS Simulator，因此 iOS 测试以物理 iPhone 为主。

### Early UI

Expo Go 可做：

- layout
- navigation
- basic fetch
- many JS-only interactions

### Real player validation

使用 EAS Development Build：

- background audio
- lock screen control
- native config plugin
- release-like behavior

### EAS profiles

```text
development
preview
production
```

`development`：dev client。

`preview`：内部测试。

`production`：商店/TestFlight。

---

## 20. CI

每个 PR：

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
npx expo-doctor@latest
```

Gateway 额外：

```text
contract tests
route tests
```

main/tag：

- 可触发 EAS preview/production build。
- 不要求每个 commit 都执行昂贵 iOS build。

---

## 21. Upstream Upgrade Playbook

当 `api-enhanced` 更新：

1. 阅读 release notes。
2. 确定是否涉及当前使用 endpoint。
3. 在开发环境升级固定版本。
4. 运行 raw fixture/mapper tests。
5. 运行 smoke tests。
6. 如 raw schema 变化，只改 provider raw types / mapper。
7. 如果 stable contract 不必变化，严禁顺手修改 mobile model。
8. 验证登录 cookie/session 行为。
9. 验证 stream URL / lyrics。
10. 合并并固定新版本。

---

## 22. 技术债边界

首版允许：

- 单实例 Gateway + SQLite session store
- Light mode 先交付
- 无永久音乐下载
- 单 AudioPlayer engine

首版不允许：

- App 直接调用 upstream
- 所有代码塞在 screen 文件
- raw any 到处传播
- token 明文普通存储
- UI 写死上游 enum
- 播放 URL永久化
- 依赖旧 `expo-av`
- 依赖解锁/解灰绕过权限

---

## 23. Definition of Done

一个技术功能完成必须满足：

```text
TypeScript no error
Lint pass
Relevant tests pass
Loading/error state present
No secrets in logs
No raw upstream type leaked to mobile
iOS + Android behavior considered
Docs updated if contract/architecture changed
```

播放器相关功能额外：

```text
foreground test
background test
lock screen test
route navigation test
network failure test
stream URL refresh test
```

