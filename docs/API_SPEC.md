# 极简网易云第三方播放器 — Gateway API Spec

> API Contract v1  
> Prefix: `/v1`  
> 此文档定义 **Mobile ↔ Project Gateway** 的稳定协议，不是 `api-enhanced` 原始接口文档。

## 1. Contract 原则

1. 所有网易云 ID 在 App Contract 中使用 `string`，避免 JS 大整数/未来兼容问题。
2. 时间戳对外优先 ISO 8601；歌曲时长使用 `durationMs`。
3. App 不读取上游原始 `code`。
4. App 不读取上游 Cookie。
5. App 不直接依赖 `api-enhanced` 字段名。
6. 上游新增字段不会自动穿透给 App。
7. Stream URL 是临时数据，不属于 Track 永久模型。
8. 所有响应返回 `requestId`，方便问题定位。

---

## 2. Response Envelope

### Success

```json
{
  "data": {},
  "requestId": "req_xxx"
}
```

列表：

```json
{
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 30,
    "hasMore": true
  },
  "requestId": "req_xxx"
}
```

### Error

```json
{
  "error": {
    "code": "UPSTREAM_UNAVAILABLE",
    "message": "Music service is temporarily unavailable.",
    "retryable": true
  },
  "requestId": "req_xxx"
}
```

---

## 3. Core Models

## 3.1 ArtistSummary

```ts
interface ArtistSummary {
  id: string;
  name: string;
  avatarUrl?: string | null;
}
```

## 3.2 AlbumSummary

```ts
interface AlbumSummary {
  id: string;
  name: string;
  artworkUrl?: string | null;
  artists: ArtistSummary[];
  publishDate?: string | null;
}
```

## 3.3 Track

```ts
interface Track {
  id: string;
  name: string;
  artists: ArtistSummary[];
  artistText: string;
  album?: AlbumSummary | null;
  artworkUrl?: string | null;
  durationMs?: number | null;

  playable: boolean;
  availability?: {
    reason:
      | 'AVAILABLE'
      | 'AUTH_REQUIRED'
      | 'PRIVILEGE_REQUIRED'
      | 'REGION_RESTRICTED'
      | 'REMOVED'
      | 'UNKNOWN';
    message?: string;
  };

  liked?: boolean;
}
```

`playable=false` 时，移动端不能“试图绕过” availability。

## 3.4 PlaylistSummary

```ts
interface PlaylistSummary {
  id: string;
  name: string;
  artworkUrl?: string | null;
  creator?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  trackCount?: number | null;
  description?: string | null;
}
```

## 3.5 PlaylistDetail

```ts
interface PlaylistDetail extends PlaylistSummary {
  tracks: Track[];
  subscribed?: boolean;
  createdByCurrentUser?: boolean;
}
```

对于超大歌单，后续可将 tracks 改为分页子资源，但 Contract v1 首版可接受常规歌单完整返回；实现时应设置合理 size guard。

## 3.6 UserProfile

```ts
interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  signature?: string | null;
}
```

## 3.7 Lyrics

不要把 LRC 原始文本作为 UI 唯一接口。

```ts
interface LyricLine {
  startMs: number;
  endMs?: number | null;
  text: string;
  translation?: string | null;
  words?: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>;
}

interface Lyrics {
  type: 'LINE' | 'WORD' | 'NONE';
  lines: LyricLine[];
  raw?: {
    lrc?: string | null;
    translatedLrc?: string | null;
  };
}
```

Gateway 可以先返回 parsed lines，解析器也可以放在 mobile；**最终选一个位置，不要两端各维护一套不同算法**。推荐 Gateway 负责对齐上游数据，Mobile 只做渲染。

## 3.8 StreamInfo

```ts
type AudioQuality = 'auto' | 'standard' | 'high' | 'lossless' | 'hi_res';

interface StreamInfo {
  trackId: string;
  url: string;
  requestedQuality: AudioQuality;
  actualQuality: AudioQuality;
  mimeType?: string | null;
  bitrate?: number | null;
  sizeBytes?: number | null;
  expiresAt?: string | null;
}
```

如果不可播放，不返回假的 URL，而返回 `TRACK_UNAVAILABLE` / `AUTH_REQUIRED` 等错误。

---

## 4. Health

### GET `/health`

Response：

```json
{
  "data": {
    "status": "ok",
    "version": "1.0.0"
  },
  "requestId": "req_xxx"
}
```

### GET `/ready`

用于部署 readiness。

```json
{
  "data": {
    "status": "ready",
    "upstream": "available"
  },
  "requestId": "req_xxx"
}
```

短时 upstream 错误应合理表达，不必导致容器崩溃重启循环。

---

## 5. Auth

## 5.1 POST `/auth/qr/start`

Gateway 内部调用当前 `api-enhanced` QR 登录相关接口。

Request：

```json
{}
```

Response：

```json
{
  "data": {
    "challengeId": "qr_challenge_xxx",
    "qrImageDataUrl": "data:image/png;base64,...",
    "expiresAt": "2026-08-19T02:10:00Z"
  },
  "requestId": "req_xxx"
}
```

注意：

- App 只拿 `challengeId`。
- 上游 unikey 等细节放 Gateway session/challenge store。

## 5.2 GET `/auth/qr/:challengeId`

Response waiting：

```json
{
  "data": {
    "status": "WAITING_SCAN"
  },
  "requestId": "req_xxx"
}
```

可能状态：

```text
WAITING_SCAN
WAITING_CONFIRM
AUTHORIZED
EXPIRED
```

AUTHORIZED：

```json
{
  "data": {
    "status": "AUTHORIZED",
    "sessionToken": "app_session_xxx",
    "user": {
      "id": "123",
      "nickname": "Example User",
      "avatarUrl": "https://..."
    }
  },
  "requestId": "req_xxx"
}
```

App 将 `sessionToken` 写入 SecureStore。

## 5.3 GET `/auth/me`

Header：

```text
Authorization: Bearer <sessionToken>
```

Response：`UserProfile`。

## 5.4 POST `/auth/logout`

Gateway revoke session。

Response：

```json
{
  "data": {
    "ok": true
  },
  "requestId": "req_xxx"
}
```

---

## 6. Search

### GET `/search`

Query：

```text
q=<keyword>
type=track|album|artist|playlist
page=1
pageSize=30
```

默认：

```text
type=track
page=1
pageSize=30
```

约束：

- `q` trim 后最少 1 字符。
- `pageSize` max 50。
- Gateway 不把未知 query 透传上游。

Track Response：

```json
{
  "data": {
    "items": [
      {
        "id": "123456",
        "name": "Example Track",
        "artists": [{ "id": "1", "name": "Artist" }],
        "artistText": "Artist",
        "album": {
          "id": "99",
          "name": "Album",
          "artists": [{ "id": "1", "name": "Artist" }]
        },
        "artworkUrl": "https://...",
        "durationMs": 240000,
        "playable": true
      }
    ],
    "page": 1,
    "pageSize": 30,
    "hasMore": true
  },
  "requestId": "req_xxx"
}
```

### Upstream mapping hint

优先检查 `api-enhanced` 当前 `cloudsearch` / search 类模块与文档，不根据旧教程硬写参数。

---

## 7. Tracks

## 7.1 GET `/tracks/:id`

Response：`Track`。

Gateway 根据当前歌曲详情/权限接口进行 normalize。

## 7.2 GET `/tracks/:id/stream`

Query：

```text
quality=auto|standard|high|lossless|hi_res
```

Response：`StreamInfo`。

### 规则

- App 每次即将播放新 Track 时调用。
- Gateway 不长期缓存 URL。
- 不返回任何用于绕过访问控制的额外参数。
- 上游实际音质与请求音质不同必须返回 `actualQuality`。

### Upstream mapping hint

当前 `api-enhanced` release notes 仍明确维护 `/song/url/v1` 等歌曲 URL 接口，但实现时必须以**当前版本文档/源码**确认参数和返回值。

## 7.3 GET `/tracks/:id/lyrics`

Response：`Lyrics`。

上游可能提供普通歌词、翻译或逐字歌词；Gateway Mapper 统一成 `LyricLine[]`。

## 7.4 PUT `/tracks/:id/like`

Requires Auth。

Response：

```json
{
  "data": {
    "liked": true
  },
  "requestId": "req_xxx"
}
```

## 7.5 DELETE `/tracks/:id/like`

Requires Auth。

Response：

```json
{
  "data": {
    "liked": false
  },
  "requestId": "req_xxx"
}
```

---

## 8. Playlists

## 8.1 GET `/playlists/:id`

Response：`PlaylistDetail`。

### 处理原则

- 先获取歌单基本信息/track ids。
- 如上游对完整歌曲详情有数量限制，Gateway 分批请求并合并。
- 保持 track 顺序。
- 某首详情失败不能导致整个歌单永久 500；可返回最小 fallback Track 或过滤并记录 observability，具体策略由实现测试确定。

## 8.2 GET `/me/playlists`

Requires Auth。

Response：

```json
{
  "data": {
    "created": [],
    "subscribed": []
  },
  "requestId": "req_xxx"
}
```

移动端不需要根据 creator id 自己猜“创建/收藏”，Gateway 统一分类。

---

## 9. Recent / Recommendations

## 9.1 GET `/me/recent-tracks`

Requires Auth for cloud-synced history。

如果账号 API 不可用，Mobile 可以同时保留 local playback history 作为 fallback，但两者不能假装完全等价。

## 9.2 GET `/recommendations/tracks`

P1，Requires Auth。

## 9.3 GET `/recommendations/playlists`

P1，Requires Auth。

---

## 10. Albums

### GET `/albums/:id`

Response：

```ts
interface AlbumDetail extends AlbumSummary {
  description?: string | null;
  tracks: Track[];
}
```

---

## 11. Artists

### GET `/artists/:id`

Response basic artist profile。

### GET `/artists/:id/top-tracks`

Response Track[]。

### GET `/artists/:id/albums?page=1&pageSize=30`

P1。

---

## 12. Settings / Capabilities

### GET `/capabilities`

可选但推荐。

用于 App 在不升级的情况下知道 Gateway 当前支持哪些增强能力：

```json
{
  "data": {
    "lyrics": {
      "translation": true,
      "wordByWord": true
    },
    "quality": ["standard", "high", "lossless", "hi_res"],
    "recommendations": true
  },
  "requestId": "req_xxx"
}
```

不要把 `api-enhanced` 版本号直接当 capability 判断条件。

---

## 13. HTTP Status

推荐：

| HTTP | 场景 |
|---:|---|
| 200 | 成功 |
| 400 | 参数非法 |
| 401 | 未登录 / session 失效 |
| 404 | 资源不存在 |
| 409 | 状态冲突，可选 |
| 422 | 合法请求但资源不可播放/不可处理，可选 |
| 429 | Gateway rate limited |
| 502 | 上游错误 |
| 504 | 上游超时 |
| 500 | Gateway 未预期错误 |

Mobile 主要依赖稳定 `error.code`，HTTP status 用于网络层分类。

---

## 14. Error Codes

```text
VALIDATION_ERROR
AUTH_REQUIRED
AUTH_EXPIRED
QR_EXPIRED
NOT_FOUND
TRACK_UNAVAILABLE
QUALITY_UNAVAILABLE
UPSTREAM_TIMEOUT
UPSTREAM_UNAVAILABLE
RATE_LIMITED
INTERNAL_ERROR
```

### TRACK_UNAVAILABLE example

```json
{
  "error": {
    "code": "TRACK_UNAVAILABLE",
    "message": "This track is currently unavailable.",
    "retryable": false,
    "details": {
      "reason": "PRIVILEGE_REQUIRED"
    }
  },
  "requestId": "req_xxx"
}
```

---

## 15. Versioning

`/v1` 内允许：

- 新增 optional field
- 新增 endpoint
- 新增 enum 时要评估旧 App fallback

不允许无版本变更：

- 删除 required field
- 改变 field 类型
- 改变原有 enum 语义
- 把成功响应变成另一种结构

发生 breaking change：

```text
/v2
```

---

## 16. Upstream Adapter Mapping Rules

实现 `api-enhanced` Adapter 时：

1. 先读取当前仓库 README。
2. 读取在线文档。
3. 对关键 endpoint 直接检查当前 `module/*.js` 源码。
4. 不从旧博客复制 response interface。
5. 在 `rawTypes.ts` 中允许上游 nullable/optional 差异。
6. 在 `mapper.ts` 收敛为严格项目模型。
7. 为每个 mapper 保留脱敏 fixture test。

### 当前重点模块方向

仓库当前存在大量模块文件，例如：

```text
cloudsearch.js
album.js / album_detail.js
artist_detail.js / artist_top_song.js
...
```

歌曲 URL、歌词、用户歌单、QR 登录等模块也应在实现时通过仓库当前 module tree/文档确认。

不要假设“模块文件名永远等于 HTTP Path”；最终 path 以项目当前 router/documentation 为准。

---

## 17. 不允许透传的上游参数

Mobile Contract 禁止出现：

```text
proxy
randomCNIP
unblock
cookie
crypto
realIP
arbitrary eapi config
```

如果某个上游参数是 Gateway 合法运行必需，由 Gateway 根据服务器配置决定，绝不接受 App 任意指定。

