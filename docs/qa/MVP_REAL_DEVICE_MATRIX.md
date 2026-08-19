# MVP Real-device Verification Matrix

本文件记录可共享的验收状态。静态代码、单元测试和 Expo export 不能替代 iOS/Android Development Build 的系统行为验收。

状态：

- `PASS`：已在当前工作树执行并有输出证据。
- `PENDING`：需要真实上游、设备或人工操作，当前未验证。
- `BLOCKED`：存在明确环境阻塞，并记录原因。

## 自动化门禁

| 项目 | 状态 | 证据 |
|---|---|---|
| Mobile / Gateway / Contracts tests | PASS | `pnpm test` |
| TypeScript | PASS | `pnpm typecheck` |
| ESLint | PASS | `pnpm lint` |
| Gateway build | PASS | `pnpm --filter @siplayer/gateway build` |
| Mobile Web/iOS/Android export | PASS | `pnpm --filter @siplayer/mobile build` |
| No raw upstream cookie in mobile storage | PASS | Gateway session boundary + mobile session tests |

## Gateway / upstream

| 场景 | 状态 | 验证方式 |
|---|---|---|
| `/v1/health` | PENDING | 连接固定版本 Gateway |
| `/v1/ready` with upstream available | PENDING | 连接固定版本 `api-enhanced` |
| QR start/status | PENDING | 真实二维码流程 |
| Search → stream → lyrics | PENDING | `pwsh -File infra/smoke-gateway.ps1 -BaseUrl <gateway> -Query <query>` |
| Fixed `api-enhanced` v4.40.1 bootstrap | PENDING | 按 `infra/README.md` 启动私有 upstream |

## iOS Development Build

| 场景 | 状态 |
|---|---|
| Foreground search and playback | PENDING |
| Navigate tabs while audio continues | PENDING |
| Now Playing metadata and seek | PENDING |
| Background audio | PENDING |
| Lock-screen controls | PENDING |
| Headphone controls and audio interruption | PENDING |
| Wi-Fi → cellular and temporary URL recovery | PENDING |
| Session expiry and logout | PENDING |

## Android Development Build

| 场景 | 状态 |
|---|---|
| Foreground search and playback | PENDING |
| Background audio | PENDING |
| Media notification controls | PENDING |
| Headphone controls and audio interruption | PENDING |
| Wi-Fi → cellular and temporary URL recovery | PENDING |
| Session expiry and logout | PENDING |

## 记录要求

每次真实验收应补充：设备型号、OS 版本、Development Build ID、Gateway/upstream 版本、日期、网络条件、结果和失败日志。未执行的项目保持 `PENDING`，不要用 export 或静态代码改成 `PASS`。
