# 极简网易云第三方播放器 — Product Spec

> Product Spec v2.0

## 1. 产品愿景

做一款“打开就是音乐”的手机播放器。

它不承担内容社区、直播平台、短视频平台或电商平台的职责，只关注：

```text
找音乐 → 听音乐 → 看歌词 → 管理音乐
```

## 2. 目标用户

主要用户：

- 已经使用网易云音乐生态，但不喜欢官方客户端复杂信息架构的人。
- 希望有更轻、更快、更安静播放器的人。
- 以 iPhone / Android 手机作为主要音乐设备的人。
- 需要后台播放、锁屏控制、耳机控制等正常播放器体验的人。

## 3. 产品成功标准

### 体验指标

- 冷启动后 1–2 次操作即可开始搜索或进入最近播放。
- 主要页面层级不超过 3 层。
- 任意页面都能看到当前播放状态。
- 用户不需要理解“API”“上游”“Cookie”等技术概念。
- 网络波动时播放器和 UI 不出现大面积卡死。

### 工程指标

- iOS / Android 都能正常构建。
- iOS 后台播放和锁屏控制稳定。
- Android 后台媒体通知与控制稳定。
- 上游接口变化时，优先只改 Gateway Adapter。
- 用户敏感会话不暴露给移动端日志或普通存储。

## 4. 信息架构

### 主导航

```text
┌───────────┬───────────┬───────────┐
│   首页    │   搜索    │  音乐库   │
└───────────┴───────────┴───────────┘
```

不增加“视频”“社区”“发现动态”等一级入口。

### 全局层级

```text
Root
├─ Tabs
│  ├─ Home
│  ├─ Search
│  └─ Library
├─ Playlist Detail
├─ Album Detail
├─ Artist Detail
├─ Settings
├─ Login
└─ Now Playing (full-screen modal)
   └─ Queue (bottom sheet)
```

## 5. 页面定义

### 5.1 Home

目标：让用户打开 App 后立即继续听歌或进入自己的常用音乐。

首版模块按优先级：

1. 顶部用户区域：头像 / 问候语 / 设置入口。
2. 最近播放。
3. 我的常用歌单。
4. 登录后可展示每日推荐歌曲/歌单。
5. 未登录时用简洁 Login Card 替代个性化模块。

禁止：

- 信息流瀑布流。
- 与音乐无关的内容卡片。
- 多层 Banner 轮播。
- 连续多个大渐变营销卡片。

### 5.2 Search

页面结构：

```text
Search Field
  ↓
Search History / Suggestions
  ↓
Result Segmented Control
  ↓
Songs / Albums / Artists / Playlists
```

P0 默认搜索类型为 Songs。

交互：

- 进入页时搜索框可快速聚焦。
- 输入使用 250–350ms debounce。
- 提交后写入本地搜索历史。
- 清空搜索框时返回历史/建议状态。
- 搜索请求失败保留原关键词并提供重试。

### 5.3 Library

登录状态下：

- 喜欢的音乐
- 创建的歌单
- 收藏的歌单
- 最近播放

未登录状态下：

- 保留“本机最近播放”入口。
- 明确提示登录后可同步网易云音乐库。
- 一个主 CTA：登录网易云。

### 5.4 Playlist Detail

内容：

- 封面
- 歌单名
- 作者/创建者
- 简短描述（可折叠）
- 歌曲数量
- Play All
- Shuffle
- Song List

行为：

- 点击歌曲：从该歌曲开始，以当前歌单为逻辑 Queue。
- Play All：从第一首可播放歌曲开始。
- 不可播放歌曲显示 Disabled 状态与原因，不直接隐藏。

### 5.5 Album Detail

与 Playlist 类似，但信息更简洁：

- 封面
- 专辑名
- 艺术家
- 发布时间
- Track List

### 5.6 Artist Detail

P1 页面。

首版只需要：

- 艺术家信息
- 热门歌曲
- 专辑入口

不做复杂动态、视频和百科堆叠。

### 5.7 Now Playing

播放器是整个 App 的核心页面。

默认内容：

```text
Header
Album Artwork
Track Title
Artist
Progress
Primary Controls
Secondary Controls
Artwork / Lyrics switch
```

主要动作：

- Play / Pause
- Previous
- Next
- Seek
- Loop mode
- Shuffle
- Like
- Queue
- Lyrics

### 5.8 Lyrics

支持：

- 普通逐行歌词
- 翻译歌词（存在时）
- 逐字歌词（上游存在且解析稳定时，P1）
- 点击某行 Seek
- 自动滚动跟随当前行

缺失歌词时显示 Empty State，不展示报错堆栈。

### 5.9 Queue

表现形式：Bottom Sheet。

能力：

- 当前播放歌曲高亮
- 点选切歌
- 删除队列项
- 清空后续队列
- P1：拖动排序

### 5.10 Login

首选登录方式：二维码登录。

状态机：

```text
Generating
→ WaitingScan
→ ScannedWaitingConfirm
→ Authorized
or Expired / Error
```

禁止在 UI 暴露网易云原始 Cookie。

### 5.11 Settings

首版设置：

- 音质
- 播放行为
- 外观：跟随系统 / 浅色 / 深色
- 清理缓存
- API 服务状态
- 登录账号 / 退出登录
- 关于与版本

开发者调试信息只能在开发模式或隐藏 Debug 页面出现。

## 6. Mini Player

全局存在条件：存在 Current Track。

结构：

```text
Artwork | Title + Artist | Play/Pause | Queue
```

行为：

- 点击主体：打开 Now Playing。
- Play/Pause 不能触发页面跳转。
- 上滑手势可作为增强功能，但不能成为唯一打开方式。
- Mini Player 在 Tab 切换时不能卸载。

## 7. 播放队列语义

App 中只有一个全局 Queue。

Queue 模式：

```text
Sequential
Repeat All
Repeat One
Shuffle
```

点击不同来源的歌曲：

- 在搜索结果中点击单曲：创建以当前搜索歌曲结果为上下文的队列，或只播放当前单曲；实现时选择行为必须一致。
- 在歌单中点击：队列上下文为该歌单。
- Play All：完整载入可播放 Track ID 列表作为逻辑队列。

“逻辑 Queue”只保存稳定 Track ID 和元数据，不长期缓存上游临时播放 URL。

## 8. P0 / P1 / P2 功能优先级

### P0 — 首个可日用版本

- App Shell / 3 Tabs
- Search Songs
- Playlist Detail
- Basic Library
- QR Login
- Play / Pause / Seek / Next / Previous
- Queue
- Lyrics
- Like / Unlike
- Recent Play
- Background Playback
- Lock Screen Metadata + Controls
- Error / Empty / Loading states
- Light Theme

### P1 — 完整体验

- Dark Mode
- Album / Artist 完整页
- Search multi-type
- Daily Recommendations
- Lyrics translation / word-by-word
- Queue reorder
- Haptics
- Better caching
- Audio quality selector
- Offline metadata cache

### P2 — 可选增强

- 经过授权的离线音乐下载
- Crossfade / Gapless 优化
- Home widgets
- Siri / Shortcuts
- CarPlay / Android Auto（需要重新评估原生能力）

## 9. 明确不做

首个正式版本不做：

- 直播
- 短视频
- 云村动态
- 商城
- 评论社区
- 用户动态信息流
- 复杂等级/任务系统
- 抢购/活动入口
- 绕过会员、版权、地区、访问控制的功能

## 10. 错误体验

### 网络错误

用户文案：

```text
网络连接不稳定
[重试]
```

### 上游不可用

```text
音乐服务暂时不可用
稍后重试
```

### 歌曲不可播放

```text
当前歌曲暂不可播放
```

如果 Gateway 能返回明确合法原因，可进一步显示：

```text
需要相应账号权限
当前地区不可用
资源已下架
```

不要展示：

- HTTP 502
- ECONNRESET
- stack trace
- api-enhanced 原始错误 JSON

## 11. Offline 行为

没有网络时：

- App 可打开。
- 可查看最近加载过的基础元数据。
- 可查看本地搜索历史。
- 播放中的已缓冲内容由系统播放器自然处理，但不能承诺持续离线播放。
- 未明确授权缓存的在线音乐不应当被作为永久离线资源保存。

## 12. 验收场景

### 核心播放闭环

1. 用户打开 Search。
2. 输入关键词。
3. 结果在合理时间内出现。
4. 点击歌曲。
5. Mini Player 出现并开始播放。
6. 点击 Mini Player 打开 Now Playing。
7. Seek 到新的位置。
8. 锁屏。
9. 音乐继续播放。
10. 锁屏界面显示正确歌曲信息。
11. 下一首可正常切换。
12. 回到 App 后进度与状态一致。

### 登录闭环

1. 打开 Login。
2. QR 正常生成。
3. 手机网易云扫码并确认。
4. App 检测登录成功。
5. Library 加载账号歌单。
6. 退出登录后服务器 Session 被销毁，本地 token 被删除。

