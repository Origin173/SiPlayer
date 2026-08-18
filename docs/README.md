# 极简网易云第三方播放器 — 开发规范总览

> Spec Version: 2.0  
> Baseline Date: 2026-08-19  
> Mobile: React Native + Expo + TypeScript  
> Upstream: `NeteaseCloudMusicApiEnhanced/api-enhanced`

## 1. 项目定位

这是一个 **手机优先、跨平台、音乐播放优先** 的第三方网易云播放器项目。

核心目标不是复刻网易云官方客户端，而是保留真正与“找歌、听歌、管理音乐”有关的能力，并去掉直播、社区、短视频、商城、活动流、复杂信息流等非核心模块。

产品关键词：

- 极简
- 精致
- 快速
- 低干扰
- 单手友好
- iOS / Android 一致但不僵硬
- 后台播放可靠
- API 解耦
- 可长期维护

## 2. 文档索引

| 文档 | 用途 |
|---|---|
| `PRODUCT_SPEC.md` | 产品范围、页面、用户流程、功能优先级、验收标准 |
| `UIUX_SPEC.md` | Design Tokens、组件、页面布局、动效、可访问性、响应式规范 |
| `TECH_SPEC.md` | React Native / Expo、播放器、状态管理、缓存、后端、部署、安全规范 |
| `API_SPEC.md` | App 与 Gateway 的稳定 API Contract、数据模型、错误模型、示例 |
| `ROADMAP.md` | 从 0 到可用版本的阶段计划和每阶段完成标准 |
| `AI_CODING_PROMPT.md` | 可直接交给 Cursor / Claude Code / Codex 等 Coding Agent 的总提示词 |
| `SOURCES.md` | 2026-08-19 规范制定时核对过的官方外部资料与版本基线 |

## 3. 已确定且不可随意改变的技术路线

### Mobile

```text
React Native
Expo SDK 57 baseline
TypeScript strict
Expo Router
TanStack Query
Zustand
expo-audio
expo-secure-store
expo-sqlite
expo-file-system
expo-image
react-native-reanimated
react-native-gesture-handler
react-native-safe-area-context
@shopify/flash-list v2
```

> React Native 版本由 Expo SDK 兼容矩阵决定，不单独强行覆盖版本。

### Backend Gateway

```text
Node.js 22+
TypeScript
Fastify
Zod
Pino
Fetch / Undici
SQLite（单实例起步）
Redis（需要多实例/高并发时再引入）
```

### 网易云上游

固定使用：

```text
https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced
```

官方文档入口：

```text
https://neteasecloudmusicapienhanced.js.org/
```

截至 2026-08-19，本规范基线验证到仓库最新 GitHub Release `v4.40.1`。生产环境应固定到经过验证的 release/tag/commit 或不可变镜像 digest，不使用漂移的 `latest` 作为唯一版本约束。

## 4. 总体架构

```text
┌──────────────────────────────────────────────┐
│              React Native App                │
│                                              │
│ UI / Navigation / Query / Player / Local DB │
└──────────────────────┬───────────────────────┘
                       │ HTTPS + JSON
                       ▼
┌──────────────────────────────────────────────┐
│              Project Gateway                 │
│                                              │
│ Session / Normalize / Cache / Errors / Logs │
└──────────────────────┬───────────────────────┘
                       │ Internal HTTP
                       ▼
┌──────────────────────────────────────────────┐
│ NeteaseCloudMusicApiEnhanced / api-enhanced │
└──────────────────────┬───────────────────────┘
                       ▼
                  网易云音乐上游
```

### 核心原则

1. **移动端不直接调用 `api-enhanced`。**
2. **移动端不保存网易云原始 Cookie。** App 只保存项目自己的 opaque session token。
3. **Gateway 不重新实现网易云加密逻辑。** 它只是一个薄 BFF/Adapter。
4. **App 不认识 `api-enhanced` 原始字段。** 所有数据先转换为项目自己的稳定模型。
5. **播放器生命周期不能跟页面生命周期绑定。** 切页面、锁屏、进入后台都不能意外停止。
6. **不依赖“解灰/绕过会员/地区/版权限制”作为产品能力。** 上游若返回不可播放，应在 UI 中准确呈现不可用状态。

## 5. 产品导航

主导航固定收敛为 3 个 Tab：

```text
首页    搜索    音乐库
```

Mini Player 常驻 Bottom Tab 上方。

```text
页面内容
   ↓
Mini Player
   ↓
Bottom Tab
   ↓
Safe Area
```

其他功能入口：

- Now Playing：点击 Mini Player 打开
- Queue：Now Playing 内打开 Bottom Sheet
- Settings：首页右上角头像/设置按钮进入
- Login：设置或音乐库未登录状态进入
- Playlist / Album / Artist：Push 页面

## 6. 第一版真正需要完成的闭环

```text
启动 App
  ↓
首页 / 搜索
  ↓
搜索歌曲
  ↓
进入歌曲结果
  ↓
点击播放
  ↓
Mini Player 出现
  ↓
打开 Now Playing
  ↓
播放 / 暂停 / Seek / 下一首
  ↓
查看歌词
  ↓
锁屏继续播放
```

随后再加入：

```text
二维码登录
  ↓
我的歌单
  ↓
喜欢的音乐
  ↓
歌单详情
  ↓
收藏 / 取消收藏
```

## 7. Windows + iPhone 开发方式

本项目默认开发机没有 Mac。

```text
Windows
  ↓
Expo / Metro
  ↓
iPhone 真机
  ↓
EAS Development Build
  ↓
EAS Build / TestFlight
```

Expo Go 可以用于纯 UI/业务逻辑的早期验证，但一旦需要验证后台音频、原生配置、完整锁屏控制，应使用 **EAS Development Build**，不要把 Expo Go 当作最终运行环境。

## 8. Source of Truth

发生冲突时按以下优先级处理：

```text
1. 当前官方 api-enhanced README / 文档 / 源码
2. 当前 Expo 官方文档
3. 当前 React Native 官方文档
4. 本 docs 规范
5. 旧教程、博客、历史代码
```

尤其禁止根据旧版 `Binaryify/NeteaseCloudMusicApi` 教程猜测现在的接口字段。

## 9. 开发原则

- 先做可运行的垂直闭环，再扩展页面数量。
- UI 组件必须来自统一 Token，不在业务页面散落硬编码颜色/圆角/间距。
- 网络数据交给 TanStack Query；纯本地交互状态交给 Zustand。
- 不把 React Query 服务器数据复制进 Zustand。
- 不把播放器对象、数据库实例等非序列化对象放进持久化 Store。
- 所有上游字段都在 Gateway Mapper 中消化。
- 所有错误必须有用户可理解的 UI 状态。
- 所有核心页面必须考虑 Loading / Empty / Error / Offline / Unauthorized。

