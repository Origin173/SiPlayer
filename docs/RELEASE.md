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

当前产物是 Gateway 编译目录和 Expo JavaScript export，不是签名的 `.apk`、`.aab` 或 `.ipa`。商店包需要后续接入 EAS Build、签名证书和商店凭据，不能由当前 `expo export` 代替。

发布成功后的 changelog 回写需要仓库允许 `github-actions[bot]` 使用 `GITHUB_TOKEN` 写入默认分支；如果默认分支启用了禁止 Actions 直接 push 的保护规则，应将该 job 改为创建 Pull Request。
