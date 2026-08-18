# 极简网易云第三方播放器 — UI/UX Spec

> UI/UX Spec v2.0  
> 目标：精致、克制、手机优先、跨平台、音乐内容优先。

## 1. 设计原则

### 1.1 Music First

任何视觉元素都不能抢过当前歌曲、专辑封面、歌词和主要播放控制。

### 1.2 Quiet UI

避免：

- 大面积高饱和渐变
- 多层阴影
- 过多描边
- 过多圆角小卡片
- 复杂 Banner
- 连续动画
- 大量 Badge

### 1.3 Clear Hierarchy

一屏最多有 1 个主视觉焦点。

层级建议：

```text
Page Title
→ Primary Content
→ Secondary Content
→ Metadata
```

### 1.4 One-hand Friendly

高频操作尽量位于屏幕中下部：

- Bottom Tabs
- Mini Player
- Player Controls
- Queue

### 1.5 Native Feel, Shared Identity

不追求 iOS 和 Android 像素完全相同，但：

- 信息架构一致
- Design Token 一致
- 主要交互一致
- 可使用平台合理差异处理系统行为

## 2. Design Tokens

所有 token 集中定义，例如：

```text
src/theme/tokens.ts
src/theme/light.ts
src/theme/dark.ts
```

业务组件禁止散落硬编码设计值。

## 2.1 Color — Light

```ts
export const lightColors = {
  background: '#F6F7FB',
  backgroundElevated: '#FAFAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F2F6',

  textPrimary: '#17181C',
  textSecondary: '#666B76',
  textTertiary: '#969BA6',
  textOnPrimary: '#FFFFFF',

  primary: '#6C5CE7',
  primaryPressed: '#5C4ED0',
  primarySoft: '#F0EEFD',

  success: '#2ECC71',
  successSoft: '#E8F8EE',
  warning: '#FF9F43',
  warningSoft: '#FFF4E8',
  danger: '#FF5C7A',
  dangerSoft: '#FFF0F3',

  border: '#E8E9EE',
  divider: '#F0F1F4',
  overlay: 'rgba(16, 18, 24, 0.42)',
};
```

## 2.2 Color — Dark

Dark Mode 从架构开始支持，即使 V0.1 只交付 Light。

```ts
export const darkColors = {
  background: '#0F1014',
  backgroundElevated: '#14161B',
  surface: '#191B21',
  surfaceMuted: '#22252D',

  textPrimary: '#F6F7FA',
  textSecondary: '#B6BAC4',
  textTertiary: '#7E838E',
  textOnPrimary: '#FFFFFF',

  primary: '#8B7CF6',
  primaryPressed: '#9A8CF8',
  primarySoft: '#292445',

  success: '#48D984',
  successSoft: '#173324',
  warning: '#FFAD5C',
  warningSoft: '#3A2B19',
  danger: '#FF718A',
  dangerSoft: '#3D1E25',

  border: '#2A2D35',
  divider: '#24272E',
  overlay: 'rgba(0, 0, 0, 0.58)',
};
```

### 颜色约束

- `primary` 不要铺满大面积普通容器。
- 专辑封面本身已经提供丰富色彩，周围 UI 应克制。
- Danger 仅用于真正危险动作，如退出登录确认中的 destructive action。
- Disabled 不使用低对比度到不可读，必须满足可访问性。

## 2.3 Typography

优先系统字体：

- iOS：系统 San Francisco 字体
- Android：系统无衬线字体

不要为了视觉统一打包第三方字体。

字阶：

| Token | Size | Weight | Line Height | 用途 |
|---|---:|---:|---:|---|
| `display` | 30 | 700 | 36 | 特殊首页大标题，少量使用 |
| `pageTitle` | 24 | 700 | 30 | 页面标题 |
| `sectionTitle` | 18 | 700 | 24 | Section |
| `title` | 16 | 600 | 22 | 卡片/列表主标题 |
| `body` | 15 | 400 | 22 | 正文 |
| `bodyMedium` | 15 | 500 | 22 | 可交互正文 |
| `secondary` | 13 | 400 | 18 | 元信息 |
| `caption` | 11 | 400 | 15 | 辅助标注 |
| `metric` | 20 | 700 | 24 | 数值类 |

要求：

- 支持系统字体缩放。
- 关键按钮不要用 10px 以下字号。
- 长标题必须设置明确的行数与截断策略。
- 歌曲名默认 1 行，歌手信息默认 1 行。

## 2.4 Spacing

以 4pt Grid 为基础：

```ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
};
```

页面水平边距：

- 标准手机：16–20
- 大屏手机：20–24
- 不根据屏宽无限扩大

## 2.5 Radius

```ts
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
};
```

使用规则：

- Album artwork：12–16
- 普通 Card：16
- 强调 Card：20
- Bottom Sheet 顶部：24
- Icon Button：full
- Segmented Control：full

不要“所有东西都 20px 大圆角”。

## 2.6 Shadows / Elevation

阴影必须非常轻。

设计参考：

```text
Card: y=4 blur=20 opacity≈0.04
Floating: y=6 blur=24 opacity≈0.08
Active capsule: y=2 blur=8 opacity≈0.08
```

React Native 实现时分别处理 iOS shadow props 与 Android elevation，但视觉效果要近似，不要把 CSS `box-shadow` 原样复制到 RN。

## 2.7 Touch Target

- 最小交互热区：44 × 44 pt/dp 左右。
- 图标本体可以 20–24，但 Pressable hitSlop 必须补足。
- 主播放按钮视觉 56–64。

## 3. Layout 基础规范

### Screen

- 使用 `SafeAreaInsets`。
- 页面内容区不手写刘海高度。
- ScrollView/List 底部 contentInset 要考虑 Mini Player + Bottom Tab。
- Keyboard 页面必须使用正确的 KeyboardAvoiding / Insets 策略。

### Max Width

手机为主要设备。

平板/大屏：

- 不把专辑封面拉到整屏宽。
- Now Playing 主内容推荐 maxWidth 560。
- 列表可以 maxWidth 720 并居中。

## 4. 基础组件规范

## 4.1 AppCard

默认：

- `surface`
- radius 16
- padding 16
- 默认无明显边框
- 仅在与背景区分不足时使用轻 border 或轻 shadow，不同时堆叠

Variant：

```text
default
muted
accent
interactive
```

## 4.2 Gradient Card

只用于：

- 登录欢迎
- 每日推荐等单一强调内容
- 极少量品牌视觉

渐变参考：

```text
#6C5CE7 → #8E44AD
#5B61F4 → #7F65F6
```

约束：一屏最多 1 张主渐变 Card。

## 4.3 Mini Metric Card

该组件不是播放器首页主角，只在设置/统计类页面使用。

- 高度 64–72
- radius 12–14
- value 18–20 / 700
- label 11–12

状态色：

```text
紫：#F0EEFD / #6C5CE7
绿：#E8F8EE / #2ECC71
橙：#FFF4E8 / #FF9F43
```

## 4.4 Menu Cell

- 高度 56–64
- 水平 padding 16
- 图标底座 32 × 32
- 图标底座 radius 8–10
- title 15 / 600
- subtitle 12–13
- trailing chevron 18–20
- divider 从文本区域起始，不穿过图标区域

## 4.5 Segmented Control

- 高度 38
- outer background：`surfaceMuted`
- radius full
- inner padding 3
- selected：surface + very light shadow
- label 13 / 600 selected
- label 13 / 400–500 unselected

切换动画：180–220ms。

## 4.6 Icon Button

尺寸：

```text
S 40
M 44
L 52
XL 60
```

图标：20 / 22 / 24 / 28。

Press State：

- scale 0.96–0.98
- 或浅背景变化
- 100–140ms

不要同时做强烈 scale + opacity + shadow 动画。

## 4.7 Buttons

### Primary

- 高 48
- radius 14 或 full，根据场景选择
- primary background
- white text 15 / 600

### Secondary

- 高 44–48
- surfaceMuted / border
- 不使用大面积灰色厚边框

### Text Button

- 最小触控区仍为 44
- 视觉可只有文字

## 4.8 Search Field

- 高度 44–48
- radius 14–16
- background `surfaceMuted`
- 左侧 search icon 18–20
- clear button 20，hit area 44
- 输入文本 15
- placeholder `textTertiary`

聚焦时不需要高饱和粗边框，可使用：

- very subtle primary tint
- 1px primarySoft/primary alpha border

## 4.9 Song Row

标准高度：60–68。

结构：

```text
[Artwork/Index] [Title
                 Artist · Album] [Trailing]
```

规则：

- artwork 44–48
- title 15 / 600
- metadata 12–13
- trailing menu hit area 44
- 当前播放项可用 primary 小型 equalizer/图标或标题色强调
- 不可播放项整体降级，但仍保持可读

不要使用整行紫色背景表示当前歌曲。

## 4.10 Playlist Card

首页横滑卡片：

- artwork 120–148，根据屏宽决定
- radius 14
- title 最多 2 行
- subtitle 最多 1 行

网格页面：2 columns 为手机默认。

## 4.11 Skeleton

- 与实际内容尺寸一致
- 禁止整页 shimmer 强闪
- shimmer 低对比、周期约 1.2–1.8s
- Respect Reduce Motion：可退化为静态灰块

## 4.12 Empty State

包含：

```text
simple icon / illustration
short title
one sentence
optional single CTA
```

不要用大段说明文字。

## 4.13 Bottom Sheet

用途：

- Queue
- Track actions
- Quality selector
- Confirm-like secondary choices

规范：

- 顶部 radius 24
- drag indicator 36×4 左右
- 最大高度通常不超过屏幕 85–90%
- 背景 overlay 克制
- Safe Area bottom 必须处理

## 5. 音乐专用组件

## 5.1 Mini Player

位置：Bottom Tabs 上方。

视觉：

- 高度 64
- 左右边距 12–16
- background `surface`
- radius 16
- very light border/shadow
- artwork 46–48
- title 14–15 / 600
- artist 12
- play/pause hit area 44
- queue hit area 44

可选：顶部 2px 进度线，但不要与系统进度条一样抢眼。

## 5.2 Now Playing

### Portrait Layout

```text
Safe Area
Header

Artwork

Title
Artist

Progress Slider
Time Labels

Previous   Play/Pause   Next

Like   Mode   Lyrics   Queue
```

Artwork：

```text
width = clamp(screenWidth - 64, 240, 360)
```

小屏优先缩减 artwork，不压缩主控制热区。

### Header

- 左侧 close/down chevron
- 中间可显示“正在播放”或来源名称
- 右侧 more

避免再放一个大页面标题。

## 5.3 Progress Slider

视觉轨道可细：2–3。

但触控热区：至少约 32–44 高。

行为：

- dragging 时 UI 跟手
- 松开后才真正 Seek，减少频繁调用播放器
- 显示 current time / duration
- buffering 时不把 thumb 卡死

## 5.4 Playback Controls

- Previous / Next icon 28–32
- Play/Pause button 60
- Mode / Like / Lyrics / Queue 44 hit target
- active 状态可以使用 primary

## 5.5 Lyrics

### 字体层级

Current line：

- 20–24
- 700
- textPrimary

Nearby lines：

- 17–20
- 500–600
- textSecondary

Far lines：

- opacity / tertiary

### 滚动

- 当前行目标位置约屏幕纵向 40–48%
- 自动滚动 220–320ms
- 用户手动滚动后暂停自动跟随 2–4 秒或直到点击“回到当前歌词”
- 点击歌词行 Seek

### Translation

翻译显示在对应原文下方：

- 13–15
- textSecondary
- 不单独占一个大块 Card

## 5.6 Queue Row

- 当前项显示播放指示
- title / artist
- trailing remove
- P1 增加 drag handle

## 6. 页面级规范

## 6.1 Home

推荐布局：

```text
Header: Greeting + Avatar
Recent Played
My Playlists
Daily / Recommended (logged in)
```

Section 间距 24–32。

首页不要让所有 section 都套白色大卡片；可使用“背景 + 内容块 + 局部卡片”的混合层级。

## 6.2 Search

- Search Field 固定在顶部安全区域下方。
- Result tabs 跟随搜索结果。
- 大量结果使用 FlashList。
- Loading 不清空已有结果，可保留 stale content + small activity indicator。

## 6.3 Library

模块优先级：

```text
Liked Songs
Recent
Created Playlists
Collected Playlists
```

喜欢的音乐可用轻品牌色 Card，但不要做成营销 Banner。

## 6.4 Playlist Detail

Header artwork 可 140–180。

手机宽度较小时：

```text
Artwork + metadata 纵向布局
```

不强制横排挤压文字。

Play All 使用明显但不巨大的主按钮。

## 6.5 Login

QR 是唯一主视觉。

页面结构：

```text
Title
Short instruction
QR card
Status
Secondary actions
```

避免同时展示手机号/邮箱/二维码三个复杂表单。

## 6.6 Settings

使用 grouped list，而非每行独立 Card。

Section：

```text
Playback
Appearance
Storage
Account
About
```

## 7. Bottom Tab Bar

- 内容高度 58–62
- Safe Area 额外计算
- background `surface`
- top border `divider` 或 very light shadow
- icon 22–24
- label 10–11
- active：primary / textPrimary
- inactive：textTertiary

Tab：

```text
Home
Search
Library
```

不设置中心凸起 FAB。

## 8. Motion

### Duration

| 类型 | Duration |
|---|---:|
| Press feedback | 100–140ms |
| Tiny state change | 140–180ms |
| Segmented switch | 180–220ms |
| Page/modal transition | 220–300ms |
| Bottom Sheet | 250–360ms |
| Lyrics auto scroll | 220–320ms |

### Easing

默认使用 ease-out / spring with low overshoot。

禁止：

- 大幅 bounce
- 持续旋转装饰
- 高频闪烁
- 每个元素进场都 stagger

### Reduce Motion

检测系统 Reduce Motion 后：

- 关闭大距离位移动画
- shimmer 可变静态 skeleton
- 保留必要的状态过渡

## 9. Haptics

P1 可加入轻触反馈：

适合：

- Like
- Play mode change
- Queue reorder drop
- destructive confirmation

不适合：

- 每次列表点击
- 每次歌词切换
- 每次播放进度更新

## 10. Accessibility

必须：

- 所有 Icon-only Button 有 accessibilityLabel。
- 播放按钮的 label 根据状态变成“播放”/“暂停”。
- 当前歌曲状态对屏幕阅读器可理解。
- 颜色不是唯一状态表达。
- 支持动态字体。
- 关键文本对比度足够。
- Slider 有可读的当前时间/总时长描述。
- Tab 有 selected state。

## 11. Safe Area / Keyboard / Device

- iPhone Home Indicator 不被 Tab/Sheet 覆盖。
- Dynamic Island / notch 由 Safe Area 处理。
- Android edge-to-edge 模式下同样依赖 Insets。
- Search 键盘弹出时 Mini Player 不应被错误顶到输入框上方。
- Bottom Sheet 与键盘同时出现时必须有明确策略。

## 12. UI 状态矩阵

每个网络页面至少设计：

```text
Initial
Loading
Success
Empty
Refreshing
Error
Offline
Unauthorized（如适用）
```

每个可播放 Track 至少有：

```text
Idle
Resolving URL
Buffering
Playing
Paused
Ended
Unavailable
Error
```

## 13. 禁止模式

不要：

- 在业务组件里写几十个 `#xxxxxx`。
- 每个 Section 都套 Card。
- 每个按钮都做胶囊。
- 使用 emoji 作为正式 UI 图标。
- 用 `>` 文本代替 Chevron 图标。
- 用纯黑粗阴影制造“高级感”。
- 将 Android UI 强行做成 iOS 系统设置页面。
- 将官方网易云品牌素材/页面布局逐像素复制。

## 14. UI 实现验收清单

一个页面提交前必须检查：

- Safe Area 正确
- 小屏不溢出
- 大字体不严重破版
- Loading / Empty / Error 都存在
- Touch target 足够
- 文本 truncation 明确
- 深色 token 没有被硬编码破坏
- 列表滚动流畅
- Mini Player / Bottom Tab 留白正确
- Android / iOS 至少真机或 build 环境验证一次

