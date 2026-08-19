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

工作流会在质量门禁通过后使用 EAS Build 云构建两个原生包：

- Android：`siplayer-vX.Y.Z-android.apk`，明确使用 APK 格式，可下载到 Android 设备直接安装。
- iOS：`siplayer-vX.Y.Z-ios.ipa`，使用 Apple store distribution 签名，可下载并提交到 TestFlight/App Store。

首次启用前需要在本地完成一次 EAS 项目初始化和凭据配置：

```powershell
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest build --platform android --profile release
pnpm dlx eas-cli@latest build --platform ios --profile release
```

然后在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置：

- Secret `EXPO_TOKEN`：Expo Personal Access Token。
- Variable `EXPO_PROJECT_ID`：EAS 项目的 UUID，对应 `extra.eas.projectId`。
- Variable `EXPO_PUBLIC_GATEWAY_URL`：正式 Gateway 的 HTTPS 地址。

EAS 负责保存 Android keystore 和 iOS signing credentials；不要把证书、私钥或 token 提交到仓库。GitHub Actions 只通过 `EXPO_TOKEN` 触发云构建。

注意：Android APK 可以直接下载安装（设备可能需要允许安装未知来源应用）。普通 iOS 用户不能仅凭下载的 IPA 直接安装；IPA 必须通过 TestFlight/App Store，或使用 Ad Hoc/Enterprise 签名并满足 Apple 的设备注册/企业分发条件。这是 Apple 的分发限制，不是 CI 能绕过的限制。

发布成功后的 changelog 回写需要仓库允许 `github-actions[bot]` 使用 `GITHUB_TOKEN` 写入默认分支；如果默认分支启用了禁止 Actions 直接 push 的保护规则，应将该 job 改为创建 Pull Request。
