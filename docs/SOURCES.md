# External Source Baseline

> Verified: 2026-08-19  
> 该文件用于记录 Spec 制定时依赖的外部官方资料。外部项目会继续更新，因此实现某个具体 API 前仍需重新核对当前文档。

## 1. NeteaseCloudMusicApiEnhanced/api-enhanced

Repository:

```text
https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced
```

README:

```text
https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/README.MD
```

Releases:

```text
https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/releases
```

Online Docs:

```text
https://neteasecloudmusicapienhanced.js.org/
```

本 Spec 制定时确认：

- README 要求 Node.js 22+，推荐 pnpm。
- 默认服务端口为 3000。
- 支持 Docker 部署和 Node.js / TypeScript 方式使用。
- 仓库包含大量搜索、歌曲、歌词、用户、歌单、登录等模块。
- 2026-08-19 查看到的最新 GitHub Release 为 `v4.40.1`，发布于 2026-08-18。
- `v4.40.1` release notes 仍包含 `/song/url/v1` 相关更新。

注意：README 中存在代理、随机 IP、解灰/解锁等配置。本项目不把规避访问控制作为能力，生产部署不依赖这些功能，并应按项目安全规范关闭相应绕过能力。

## 2. Expo Audio

```text
https://docs.expo.dev/versions/latest/sdk/audio/
```

本 Spec 制定时确认：

- `expo-audio` 支持 background playback。
- Expo config plugin 可配置 `enableBackgroundPlayback`。
- iOS 会配置 `audio` background mode。
- Android 会配置 media playback foreground service。
- `setAudioModeAsync` 可设置后台播放行为。
- `setActiveForLockScreen` 支持 iOS/Android 锁屏媒体信息与控制。
- `updateLockScreenMetadata` 可更新歌曲 metadata。
- 当前版本还提供 `AudioPlaylist`，但本项目 MVP 因临时 stream URL 生命周期选择先用逻辑队列 + 单 player engine。

## 3. Expo New Architecture

```text
https://docs.expo.dev/guides/new-architecture/
```

本 Spec 制定时确认：

- Expo SDK 55+ 完全运行在 New Architecture，不能关闭。
- 当前文档提供 SDK 57 新项目创建示例。
- 第三方依赖应使用 `expo-doctor` 检查兼容性。

## 4. React Native Versions

```text
https://reactnative.dev/versions
```

原则：

- 不在 Expo 项目中随意手工覆盖 React Native 版本。
- 以当前 Expo SDK 的兼容版本为准。

## 5. EAS Build / Development Build

```text
https://docs.expo.dev/develop/development-builds/introduction/
https://docs.expo.dev/build/introduction/
https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/
https://docs.expo.dev/submit/ios/
```

本 Spec 制定时确认：

- EAS 云构建可以从 Windows 创建 iOS build。
- Windows 开发 iOS 时应使用物理 iPhone；iOS Simulator 只在 macOS 可用。
- Background audio / config-plugin 功能应通过 Development Build 真机验证。
- iOS Development Build 需要正确签名/设备注册流程。

## 6. FlashList v2

```text
https://shopify.github.io/flash-list/docs/
https://github.com/Shopify/flash-list
```

本 Spec 制定时确认：

- FlashList v2 面向 React Native New Architecture。
- 适合歌曲/搜索结果等长列表。
- 不要求所有短列表都强行使用 FlashList。

