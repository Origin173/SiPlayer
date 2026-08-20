# SiPlayer Release Workflow

发布由 Git tag 驱动，工作流位于 `.github/workflows/release.yml`。

## Tag 规则

- 稳定版：`v0.1.0`、`v0.1.1`
- 预发布版：`v0.1.0-alpha.1`、`v0.1.0-beta.1`、`v0.1.0-rc.1`

Tag 的基础版本必须同时匹配根目录 `package.json` 和 `apps/mobile/app.config.ts` 的版本。预发布后缀不写入 Expo app version，但会写入 Release 名称和产物名。

## 发布命令

```powershell
git tag v0.1.0-alpha.1
git push origin v0.1.0-alpha.1
```

稳定版使用同样流程：

```powershell
git tag v0.1.0
git push origin v0.1.0
```

带 `-alpha.N`、`-beta.N` 或 `-rc.N` 后缀的 tag 会自动创建 GitHub Pre-release；没有后缀的 tag 会创建正式 Release。

## 自动完成的工作

1. 检出 tag 对应源码。
2. 安装锁定依赖并运行 lint、typecheck、test。
3. 构建 Gateway 和 Expo Web/iOS/Android JavaScript export。
4. 根据上一个版本 tag 到当前 tag 的提交生成分组更新日志。
5. 创建或更新 GitHub Release，并上传 `tar.gz` 和 `SHA256SUMS.txt`。
6. 发布成功后，将同一条更新日志插入 `CHANGELOG.md` 并提交回默认分支。

提交信息建议使用 Conventional Commits，例如 `feat: ...`、`fix: ...`、`perf: ...`、`refactor: ...`。更新日志会按这些前缀分组；无法识别的提交进入 Other changes。

## 原生 APK / IPA 构建

Android 原生包由 GitHub Actions 的 `ubuntu-24.04` runner 执行 EAS local build。EAS 仍用于项目认证、remote credentials 和 remote app version，但不再使用 EAS 云端编译资源。iOS local build 的矩阵配置已准备好但保持注释，获得 Apple Developer 签名凭据后再启用。

- Android：`siplayer-vX.Y.Z-android.apk`，明确使用 APK 格式，可下载到 Android 设备直接安装。
- iOS：暂时不构建。没有 Apple Developer 账户时，不能生成可安装到真实 iPhone 或提交 TestFlight/App Store 的正式 IPA。

iOS 的 local build 配置已写入 workflow，但 matrix entry 默认注释。获得 Apple Developer Program 资格、配置 `com.origin173.siplayer` 的 EAS remote iOS credentials，并初始化 remote `ios.buildNumber` 后，只需取消 iOS matrix 项目的注释；workflow 会在 `macos-26`、Xcode 26.6 runner 上执行 `eas build --local`。本次不启用 iOS，也不执行 TestFlight/App Store 提交。

首次启用前需要完成 EAS 项目初始化和原生签名凭据配置。下面的本地命令只建议每个平台首次运行一次，用于验证配置和检查 EAS remote credentials；之后不需要每次发布都运行。配置完成后，GitHub Actions 会在 runner 上执行同样的 local build。

SiPlayer 是 pnpm monorepo，Expo App 根目录是 `apps/mobile`。EAS 命令必须从该目录执行，`apps/mobile/eas.json` 也必须保留在该目录；不要从仓库根目录执行 EAS 命令。

本地执行前，先使用真实的公网 Gateway 地址：

```powershell
$repoRoot = "D:\Code\SiPlayer"
Set-Location "$repoRoot\apps\mobile"
$env:EXPO_PROJECT_ID = "<Expo/EAS project UUID>"
$env:EXPO_PUBLIC_GATEWAY_URL = "https://你的-gateway-域名.example.com"
pnpm dlx eas-cli@21.7.1 login
pnpm dlx eas-cli@21.7.1 credentials --platform android
pnpm dlx eas-cli@21.7.1 build --platform android --profile release --local
# iOS requires Apple Developer credentials and is currently disabled.
# pnpm dlx eas-cli@21.7.1 credentials --platform ios
# pnpm dlx eas-cli@21.7.1 build --platform ios --profile release --local
```

如果 Android remote credentials 已经配置完成，可以跳过本地凭据检查。当前发布工作流只构建 Android，因此暂时不需要 iOS 签名凭据。

### Local build 工具链

Android local build 使用固定的 GitHub-hosted runner 和工具版本：

- Runner：`ubuntu-24.04`
- Node.js：`22.13.0`
- pnpm：`11.22.0`
- JDK：`17`
- Android Platform：`android-36`
- Android Build Tools：`36.0.0`
- Android NDK：`27.1.12297006`（NDK r27b）

`apps/mobile/eas.json` 保留 `appVersionSource: remote`、`autoIncrement: true` 和 `credentialsSource: remote`。因此 Android keystore 和 `versionCode` 仍由 EAS remote 管理，实际编译、签名和 APK 输出由 GitHub runner 完成。

### GitHub Actions 配置项

在 GitHub 仓库进入 `Settings → Secrets and variables → Actions`。当前工作流只需要添加下面 1 个 Secret 和 2 个 Variable：

| 类型 | 名称 | 值 | 用途 |
| --- | --- | --- | --- |
| Secret | `EXPO_TOKEN` | Expo Personal Access Token | 让 GitHub Actions 登录 EAS、读取 remote credentials 和 remote app version |
| Variable | `EXPO_PROJECT_ID` | EAS 项目的 UUID | 指定 `siplayer` 对应的 Expo/EAS 项目 |
| Variable | `EXPO_PUBLIC_GATEWAY_URL` | 正式 Gateway 的 HTTPS 地址，例如 `https://api.example.com` | 编译时写入 App 的后端 API 地址 |

#### 必须添加的 Secret：`EXPO_TOKEN`

在 Expo 控制台创建 Personal Access Token，然后将完整 token 粘贴到 GitHub 的 **Secrets** → **New repository secret**：

```text
Name:  EXPO_TOKEN
Value: <Expo Personal Access Token>
```

Token 只放在 GitHub Secret 中，不要写入 `eas.json`、`.env`、App 源码或提交记录。不要把 `EXPO_PROJECT_ID` 和 `EXPO_PUBLIC_GATEWAY_URL` 错误地放到 Secret 中；它们是非敏感的构建配置，应放在 **Variables** → **New repository variable**。

#### 两个必须添加的 Variable

```text
Name:  EXPO_PROJECT_ID
Value: <Expo/EAS project UUID>
```

```text
Name:  EXPO_PUBLIC_GATEWAY_URL
Value: https://你的-gateway-域名.example.com
```

`EXPO_PUBLIC_GATEWAY_URL` 会被打包进客户端，因此它不是密码。它必须是手机可以访问的公网 HTTPS 地址，不能使用 `127.0.0.1`、`localhost` 或仅在服务器内部可访问的地址。修改这个 Variable 后，必须重新创建一个 tag 并重新构建 APK；已经下载的安装包不会自动更新。

#### 当前不需要添加的配置

- `GITHUB_TOKEN`：GitHub Actions 自动提供，工作流用于创建 Release 和回写 changelog，不需要手动创建。
- Android keystore：由 EAS Credentials 托管，不要复制到 GitHub Secret。GitHub Actions local build 会通过 `EXPO_TOKEN` 获取 remote credentials。
- iOS distribution certificate、provisioning profile：当前 iOS job 已暂停，暂时不需要；恢复 iOS 构建前必须配置 Apple Developer 凭据。
- `APPLE_ID`、`ASC_API_KEY_ID`、`ASC_ISSUER_ID`、`ASC_API_KEY`：当前 iOS job 已暂停，且工作流不执行 TestFlight/App Store 提交，因此暂时不需要。以后恢复 iOS 或增加 `eas submit` 时再单独配置。
- `NETEASE_API_BASE_URL`、`SESSION_ENCRYPTION_KEY`、`SESSION_STORE_PATH`：这些是 Gateway 服务器环境变量，不应写进 App 构建配置，也不应暴露给移动端。

配置完成后可使用 GitHub CLI 更新地址：

```powershell
gh variable set EXPO_PUBLIC_GATEWAY_URL --body "https://你的-gateway-域名.example.com"
```

然后创建新的发布 tag：

```powershell
git tag v0.1.0-alpha.2
git push origin v0.1.0-alpha.2
```

### 复用已经完成的构建产物

如果质量检查和 Android EAS 构建已经成功，但 `publish` job 因工作流问题失败，不要重新创建 tag 或重新构建。先将修复后的工作流推送到默认分支，然后在 GitHub 的 Actions → Release → Run workflow 中填写：

- `release_tag`：原来的 tag，例如 `v0.1.0-alpha.1`。
- `source_run_id`：原失败 workflow 的数字 run ID，即 Actions 运行页面 URL 中 `/actions/runs/` 后面的数字，不是 EAS build ID。

这个手动入口会从原 workflow run 下载 `release-package-*`、`release-notes-*` 和 `native-android-*` artifacts，重新上传到同一个 GitHub Release，并更新 changelog。Artifacts 默认只保留 14 天；如果已经过期，就必须重新运行完整构建。

EAS 继续负责保存 Android keystore 和 remote app version；不要把证书、私钥或 token 提交到仓库。GitHub Actions 使用 `EXPO_TOKEN` 获取 remote credentials，然后在 Ubuntu runner 本地完成 Android 编译和签名。

注意：Android APK 可以直接下载安装（设备可能需要允许安装未知来源应用）。普通 iOS 用户不能仅凭下载的 IPA 直接安装；IPA 必须通过 TestFlight/App Store，或使用 Ad Hoc/Enterprise 签名并满足 Apple 的设备注册/企业分发条件。这是 Apple 的分发限制，不是 CI 能绕过的限制。

发布成功后的 changelog 回写需要仓库允许 `github-actions[bot]` 使用 `GITHUB_TOKEN` 写入默认分支；如果默认分支启用了禁止 Actions 直接 push 的保护规则，应将该 job 改为创建 Pull Request。
