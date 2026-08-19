# SiPlayer 使用测试指南

## 1. 自动化检查

在 `D:\Code\SiPlayer` 执行：

```powershell
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @siplayer/gateway build
pnpm --filter @siplayer/mobile build
npx expo-doctor@latest
```

全部通过后，再进行实际使用测试。

## 2. 启动 api-enhanced

单独打开一个 PowerShell。以下假设 api-enhanced 位于 `D:\Services\api-enhanced`：

```powershell
cd D:\Services\api-enhanced

$env:ENABLE_PROXY="false"
$env:ENABLE_GENERAL_UNBLOCK="false"
$env:PORT="3000"

node app.js
```

建议使用固定版本 `v4.40.1`，不要开启解灰或代理能力。

## 3. 启动 Gateway

打开第二个 PowerShell：

```powershell
cd D:\Code\SiPlayer

$env:NETEASE_API_BASE_URL="http://127.0.0.1:3000"
$env:SESSION_ENCRYPTION_KEY="dev-local-session-key-123456"
$env:ALLOWED_ORIGINS="*"

pnpm dev:gateway
```

确认 Gateway 正常：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/v1/health
Invoke-RestMethod http://127.0.0.1:8787/v1/ready
```

也可以运行完整 smoke test：

```powershell
pwsh -File infra/smoke-gateway.ps1 `
  -BaseUrl http://127.0.0.1:8787 `
  -Query "周杰伦"
```

## 4. 启动 Mobile

打开第三个 PowerShell：

```powershell
cd D:\Code\SiPlayer

$env:EXPO_PUBLIC_GATEWAY_URL="http://127.0.0.1:8787"

pnpm dev:mobile
```

然后根据测试环境选择：

- Web：按 `w`
- Android 模拟器：按 `a`
- iOS 模拟器：按 `i`，需要 macOS
- Expo Go：适合测试页面和基本交互
- EAS Development Build：用于后台播放、锁屏控制和系统媒体控制

Android 模拟器如果连接不到 Gateway，把地址改成：

```powershell
$env:EXPO_PUBLIC_GATEWAY_URL="http://10.0.2.2:8787"
```

实体手机应使用电脑局域网 IP，例如：

```powershell
$env:EXPO_PUBLIC_GATEWAY_URL="http://192.168.1.20:8787"
```

手机和电脑必须在同一网络，并且防火墙允许访问 `8787` 端口。发布或正式 Development Build 建议使用设备可访问的 HTTPS Gateway 地址。

## 5. App 功能验收顺序

1. 搜索歌曲，滚动加载更多结果。
2. 切换搜索类型：歌曲、专辑、歌手、歌单。
3. 打开专辑、歌手、歌单详情页。
4. 点击歌曲播放，确认 Mini Player 出现。
5. 打开 Now Playing，测试播放、暂停、进度拖动、上一首、下一首。
6. 打开歌词，测试歌词同步和翻译。
7. 打开播放队列，测试删除、清空后续、上下移动排序。
8. 进入设置，修改主题、播放模式、音质，重启 App 确认设置仍然保存。
9. 进入登录，测试二维码登录、音乐库、喜欢歌曲、最近播放。
10. 停止 api-enhanced，再测试错误提示和重试按钮。
11. 使用 EAS Development Build 测试后台播放、锁屏控制、耳机按键和切换网络。

## 6. 常见问题

### `/ready` 返回 503

通常表示 api-enhanced 没有启动，或者 Gateway 的 `NETEASE_API_BASE_URL` 配置错误。

### 手机无法连接 Gateway

不要在实体手机上使用 `127.0.0.1`。请改用电脑局域网 IP，并检查防火墙和端口 `8787`。

### Expo Go 中无法验证后台播放

Expo Go 只适合早期页面和交互验证。后台播放、锁屏 metadata、耳机控制必须使用 EAS Development Build 或本地 Native Development Build。

### Smoke Test 搜索不到歌曲

确认 api-enhanced 正常运行，并更换搜索词；也可以直接传入已知歌曲 ID：

```powershell
pwsh -File infra/smoke-gateway.ps1 `
  -BaseUrl http://127.0.0.1:8787 `
  -TrackId "歌曲ID"
```
