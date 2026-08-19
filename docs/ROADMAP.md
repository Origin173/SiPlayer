# 极简网易云第三方播放器 — Implementation Roadmap

> 目标：避免“一次生成整个 App”导致大量不可运行代码。每阶段都必须形成可验证的纵向成果。

## Phase 0 — Repository Foundation

### 目标

建立可持续开发的 monorepo 和质量门禁。

### 工作

- pnpm workspace
- `apps/mobile`
- `apps/gateway`
- `packages/contracts`
- shared tsconfig / eslint
- env example
- docs directory
- basic CI

### Mobile

- Expo SDK 57 baseline
- Expo Router
- New Architecture
- TypeScript strict
- Safe Area
- Theme Provider

### Gateway

- Fastify server
- Zod
- `/health`
- `/ready`
- structured logger

### 完成标准

```text
pnpm install works
pnpm lint passes
pnpm typecheck passes
pnpm test passes
mobile starts
gateway starts
/health returns 200
```

### 不要做

- 不接真实登录
- 不做全部页面
- 不写复杂播放器

---

## Phase 1 — UI Shell + Mock Data

### 目标

先确认 UI/UX 结构和全局播放器容器，不被真实 API 阻塞。

### 页面

- Home
- Search
- Library
- Playlist Detail
- Now Playing
- Settings shell

### Components

- Screen
- AppCard
- SearchField
- SongRow
- PlaylistCard
- MiniPlayer
- BottomTabs
- IconButton
- EmptyState
- Skeleton

### Mock Player

可以使用一个合法测试音频 URL / 本地测试资产验证播放 engine，但不要用它模拟网易云数据协议。

### 完成标准

- 3 Tab 布局完整
- Mini Player 在 Tab 切换中保持
- Now Playing 可打开/关闭
- 小屏和 iPhone Safe Area 正常
- 所有页面有 Loading/Empty 视觉状态
- UI token 无明显业务硬编码

---

## Phase 2 — Gateway + api-enhanced Adapter

### 目标

建立真正可长期维护的上游隔离层。

### 工作

- 部署本地 api-enhanced
- 固定已验证 upstream version
- `NeteaseApiClient`
- mapper
- contract schemas
- upstream timeout
- error mapping

### 首批 endpoint

```text
GET /v1/search
GET /v1/tracks/:id
GET /v1/tracks/:id/lyrics
GET /v1/playlists/:id
```

### 测试

- sanitized upstream fixtures
- mapTrack
- mapPlaylist
- mapLyrics
- validation

### 完成标准

Mobile 不需要知道任何 raw upstream field，就能显示：

```text
Search Results
Playlist Detail
Lyrics data
```

---

## Phase 3 — Real Playback Vertical Slice

### 目标

完成真正的“搜索 → 播放 → 后台”闭环。

### Gateway

增加：

```text
GET /v1/tracks/:id/stream
```

### Mobile

实现：

- PlayerProvider
- PlaybackResolver
- QueueStore
- play/pause
- seek
- next/previous
- current progress
- buffering state
- stream re-resolve

### Native behavior

- expo-audio background config
- iOS background audio
- lock screen metadata
- Control Center
- Android media notification

### Windows/iPhone

从这一步开始必须使用 EAS Development Build 做真实验证。

### 完成标准

测试场景：

```text
Search a track
→ Play
→ Navigate to another tab
→ Audio continues
→ Open Now Playing
→ Seek
→ Lock iPhone
→ Audio continues
→ Metadata correct
→ Next track works
→ Return to app
→ UI state remains correct
```

---

## Phase 4 — Auth + Library

### 目标

让 App 真正能替代官方客户端的基础音乐库能力。

### Gateway

- QR challenge store
- QR start/check
- server-side upstream session
- encrypted upstream cookie
- project session token
- me profile
- me playlists
- like/unlike
- logout

### Mobile

- Login screen
- QR states
- SecureStore session
- Auth bootstrap
- Library
- liked songs
- created/subscribed playlist grouping

### 完成标准

```text
QR login works
App restart keeps project session
Raw upstream cookie never exists in mobile storage
Library loads
Like/unlike works
Logout revokes session
```

---

## Phase 5 — Lyrics / Queue Polish

### 目标

让播放器从“能播”变成“日常好用”。

### Lyrics

- line sync
- active line
- tap to seek
- translation
- word-by-word if stable
- manual scroll suspension

### Queue

- current highlight
- select item
- remove item
- clear next
- queue mode
- shuffle
- repeat one/all
- P1 drag reorder

### 完成标准

- 长歌词滚动不明显掉帧
- progress 更新不导致整页重渲染
- Queue 状态与播放器状态不脱节
- Repeat/Shuffle 有 unit tests

---

## Phase 6 — Home / Recommendation / Detail Pages

### 目标

完善“打开 App 就能继续听”的体验。

### Home

- recent
- user playlists
- optional daily recommendations

### Detail

- Album
- Artist
- multi-type search

### 完成标准

首页依然保持克制，不因为上游有 200+ API 就把所有接口做成入口。

---

## Phase 7 — Dark Mode + Accessibility + Performance

### Dark Mode

- system/light/dark
- album art contrast check
- sheet/modal dark theme

### Accessibility

- screen reader labels
- dynamic font
- reduce motion
- focus state
- touch target audit

### Performance

- FlashList
- image cache
- Query tuning
- render profiling
- startup profiling
- lyrics render profiling

### 完成标准

- Core flows under large text usable
- Reduce Motion usable
- Search/playlist long lists smooth
- No obvious unnecessary global re-renders from player progress

---

## Phase 8 — Production Hardening

### Gateway

- rate limit
- secret redaction
- DB backup
- session cleanup
- request metrics
- upstream upgrade tests

### Deployment

- HTTPS
- gateway public
- api-enhanced private network
- pinned upstream build
- EAS preview
- TestFlight
- Android internal testing

### QA Matrix

```text
iOS foreground
iOS background
iOS lock screen
iOS headphone controls
Android foreground
Android background
Android lock screen/media notification
Wi-Fi → cellular
network off/on
session expiration
upstream timeout
unplayable track
very long playlist
very long lyrics
```

---

# MVP Release Gate

不能因为“首页还不够丰富”推迟 MVP。

MVP 真正 release gate：

```text
1. Search works
2. Playback works
3. Background works
4. Lock screen works
5. Lyrics works
6. Playlist works
7. Login works
8. Library works
9. Error states work
10. No raw upstream secret on mobile
```

如果以上十项稳定，产品已经具备替代臃肿官方客户端的基础价值。

# Feature Decision Rule

每次想增加功能时问：

```text
这个功能是否直接帮助：
找歌？
听歌？
看歌词？
管理音乐？
```

如果都不是，默认不进入核心版本。

# Current Implementation Checkpoint

当前仓库已经从“功能拼装”进入 **MVP 候选版稳定性收口** 阶段。代码审查中提出的几项明确回归已经在后续实现中处理：

- 队列行同时保留上移/下移与移除操作。
- 设置写入通过串行队列合并，避免并发字段丢失。
- 歌曲、专辑、歌手和歌单搜索均支持继续加载分页结果。
- `/ready` 会校验上游 HTTP 状态；Gateway 代理信任和 session 持久化失败具备显式配置/日志边界。
- Now Playing、歌手详情和队列弹层使用列表虚拟化，降低大数据量渲染压力。

本轮继续推进 Phase 3 / Phase 7 的稳定性工作：

- 将 stream resolve → metadata → play 生命周期抽成可单测的运行时协调器。
- 旧请求完成时不再覆盖新歌曲；暂停 resolve 中的歌曲会使请求失效。
- 旧歌曲的音频 `error` / `didJustFinish` 状态不会被新歌曲消费。
- Provider 卸载或暂停时，未完成的 stream resolve 不会再触碰音频实例。
- 设置 hydration 不会覆盖用户在加载期间刚选择的音质/播放模式。
- 增加播放器运行时、Provider 组件、stream resolver 和 player store 回归测试。
- Search → Play 只把可播放歌曲放入队列，并按过滤后的队列重新计算选中索引，避免不可播放结果造成切歌偏移；Search screen 已有结果点击、分页追加、错误重试的集成契约测试。
- Now Playing 使用显式 `playQueueIndex` 语义点选队列歌曲，不再把 `setQueue` 当作隐式播放 API。
- `AuthProvider` 覆盖 session hydration、过期清理、QR 授权、logout 和卸载后的异步完成保护。

下一道可验证门槛：固定 `api-enhanced` 版本执行 Gateway smoke，并进入 iOS/Android Development Build 的真实验收矩阵。不可用的上游或系统能力必须在 QA 文档中记录为未验证，而不是以静态代码推断通过。

