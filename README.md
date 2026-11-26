<!-- spell-checker: disable -->

<div align="center">
  <h1>South Plus Liquid Glass</h1>
</div>
<br>
<div align="center">

「 南+ Apple Liquid Glass 液态玻璃重构脚本 」

</div>

[📦 安装](#安装)

[⚙ 设置](#设置)

[📚 功能](#功能)

[👻 兼容性](#兼容性)

[🐛 版本历史与更新日志](#版本历史与更新日志)

[📌 更新计划](#更新计划)

[📕 文档站点](#文档站点)

[📖 参与开发](#参与项目)

[❤ 捐助](#捐助)

# 安装
需要浏览器装有 [Tampermonkey](https://tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 插件, 下方表格中挑一个链接安装.

**注意事项**
- **⚠ 使用正式版 (GitHub 源) 须翻墙.**
- 支持南+ (South Plus / North Plus / White Plus / Level Plus / Spring Plus / Summer Plus / Snow Plus / Soul Plus / Blue Plus / East Plus / imoutolove.me 等官方镜像站), 打开任意镜像站即可自动生效.
- 也可直接手动新建脚本, 将仓库内的 [`south-plus-liquid-glass.user.js`](./south-plus-liquid-glass.user.js) 全部内容粘贴保存.

| 正式版 (jsDelivr 源)                                                                                             | 正式版 (GitHub 源)                                                                                              | 预览版 |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| [安装](https://cdn.jsdelivr.net/gh/Jenision/south-plus-liquid-glass@main/south-plus-liquid-glass.user.js)        | [安装](https://raw.githubusercontent.com/Jenision/south-plus-liquid-glass/main/south-plus-liquid-glass.user.js) |        |

# 设置
脚本启用后, 可通过右上角 **macOS 控制中心弹层** 或设置弹窗一键调节外观与偏好:

- 外观模式: **自动 / 浅色 / 深色**
- 玻璃通透度: **标准玻璃 / 高透水晶 / 高对比磨砂**
- 光学折射与色散强度: **柔和 / 标准 / 强烈**
- 强调色板: **清澈、深蓝、樱雾、翡翠、暖金** 5 套强调色
- 布局选项: 宽屏模式与紧凑密度

## 快捷键

| 快捷键 | 功能 |
| :--- | :--- |
| `Ctrl + K` / `⌘ + K` | 打开 Spotlight 全局快速跳转面板 |
| `/` | 聚焦顶部搜索 / 页内实时过滤框 |
| `G` | 打开 / 关闭全部版块目录抽屉 |
| `R` | 在帖子页滚动并聚焦至快速回复框 |
| `T` | 平滑返回页面顶部 |
| `[` / `]` | 切换上一页 / 下一页 |
| `Esc` | 关闭灯箱、Spotlight、设置面板或弹层 |
| `Ctrl / ⌘ + Enter` | 在快速回复框内直接提交回复 |

# 功能
将南+ (South Plus / North Plus / White Plus / Level Plus 等官方镜像站) 全面重构为 **Apple Liquid Glass (macOS Tahoe 26 / iOS 26)** 视觉风格与现代交互操作逻辑的 Tampermonkey 油猴脚本.

- **Apple Liquid Glass 官方 HIG 三层架构 (v1.0.0)**: 严格遵循 macOS Tahoe 26 / iOS 26 液态玻璃分层准则——只对顶层悬浮导航与弹层拉满真实光学折射, 主体内容轻量化, 彻底杜绝“玻璃叠玻璃”与滚动卡顿:
  - **Tier 1 顶层悬浮导航与弹层（真实 Chromium SVG 光学折射管线）**: 仅对顶部悬浮胶囊栏（`.lg-topbar-cluster`、`.lg-search-capsule`）、左侧离岸悬浮侧边栏外框（`.lg-sidebar`）、右下角悬浮 Dock（`.lg-dock`）以及控制中心/用户资料弹层/Spotlight/设置弹窗/全部版块抽屉/Toast 等浮层启用 Chromium `backdrop-filter: url(#svg-filter)`, 同屏活跃 SVG `<filter>` 严格控制在个位数, 保障 60fps 流畅滚动.
    - **Canvas SDF + Snell 定律位移贴图**: 根据每个浮层实际尺寸与圆角半径实时生成红（X）/ 绿（Y）通道凸透镜位移贴图（中心平缓、边缘强折射弯曲）.
    - **RGB 棱镜色散 & Schlick 菲涅尔高光**: 通过 `<feDisplacementMap>` 配合 3 组 `<feColorMatrix>` 拆分 R/G/B 通道施加微差 `scale`, 叠加方向性菲涅尔边缘高光并兼容 `<base href>`; 所有浮层启用高可读性 `overlay` 扩散折射预设, 防止与底层文字混叠.
  - **Tier 2 侧边栏与局部导航控件（克制纯 CSS 玻璃）**: 侧边栏未选中导航项保持极简通透, 仅悬停与选中态呈现玻璃胶囊高光与指针微光; 个人中心标签栏、分段开关与筛选芯片采用轻量化纯 CSS 高光与 `140ms` 干脆切换过渡, 不再挂载重型多通道 SVG 位移滤镜或布局拉伸动画.
  - **Tier 3 主体内容层（轻量化 Apple Inset Grouped 卡片）**: 主题列表、帖子楼层、图墙卡片与个人主页正文面板移除重型 `backdrop-filter`, 采用高对比度柔和半透明底色与 `1px` 内高光分隔, 既保证长文阅读清晰度, 也让内容滚过顶栏与 Dock 下方时的光学折射层次更加分明.
  - **动态环境背景与指针高光**: 搭配 `#sp-lg-backdrop` 焦散光晕与跟随鼠标指针移动的镜面高光 (`--lg-mx` / `--lg-my`).
- **macOS 风格悬浮侧边栏 + 胶囊顶栏**: 可收起的悬浮圆角侧边栏（含探索 / 个人 / 收藏版块分组）与分段式胶囊顶栏.
- **Spotlight 全局命令面板 (`Ctrl / ⌘ + K`)**: 一键检索缓存的主版块、子版块、执行快捷指令（切换深浅色、切换玻璃材质、宽屏模式等）或直达全站搜索.
- **iOS 26 自动收折底部悬浮胶囊**: 向下滚动时自动精简体积减少遮挡, 上滑或悬停即刻恢复展开（含楼层电梯、回到顶部、快速回复/发帖）.
- **Apple Inset Grouped List & 图墙画廊**: 版块列表采用苹果分组圆角列表; 图墙模式支持裁剪/完整比例切换与 Apple Preview 风格悬浮 HUD 灯箱.
- **完整保留原生功能**: 发帖、回复（支持 `Ctrl/⌘ + Enter` 提交）、引用、收藏（真实对接站内 `verifyhash` 与 `pw_ajax.php` 收藏夹流程）、付费资源购买卡片、评分、只看楼主、屏蔽插件 (`#peacemakerconfig`) 均原生兼容; 已专项适配首页、版块列表/图墙、帖子阅读（含付费/引用/评分）、登录页 (`login.php`)、个人中心全部子页 (`u.php` 首页/资料/主题/回复/收藏/好友/商品)、账号设置 (`profile.php`)、积分管理 (`userpay.php`)、短消息 (`message.php`)、社区任务及搜索页面.

# 配置
## 最低配置

## 推荐配置

# 兼容性

## 脚本管理器

### [Tampermonkey](https://tampermonkey.net/) / [Violentmonkey](https://violentmonkey.github.io/)
兼容.

### [Greasemonkey](https://www.greasespot.net/)

### [AdGuard](https://adguard.com/zh_cn/adguard-windows/overview.html)

## 浏览器

推荐使用**最新版** Chrome / Edge 等 Chromium 内核浏览器（以获得完整的 `backdrop-filter: url(#svg-filter)` 真实 SVG 光学折射效果）.

# 版本历史与更新日志

# 更新计划

# 文档站点

# 开发者

<a href="https://github.com/Jenision/south-plus-liquid-glass/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Jenision/south-plus-liquid-glass" />
</a>

## 参与项目

## 更换 CDN

# 隐私声明
本脚本所有偏好设置与缓存数据均在本地保存和处理, 不会向任何第三方服务器收集或上传用户数据.

# 开源许可

MIT License.

# 第三方开源组件

# 相关推荐

----

<a id="捐助"></a>

**喜欢的话就点个⭐Star 吧(°∀°)ﾉ**

**或者也可以考虑捐助支持一下哦(｀・ω・´)**

支付宝

<img alt="支付宝" src="./images/alipay.jpg" width="400">

微信

<img alt="微信" src="./images/wechat.jpg" width="400">

----

# 我写的其他一些玩意

## [South Plus Fluent 2](https://github.com/Jenision/south-plus-fluent2)
将南+重构为新一代 Microsoft Fluent 2 Design System (Windows 11 Bloom Mica) 风格的油猴脚本

## [South Plus MD3E](https://github.com/Jenision/south-plus-md3e)
将南+重构为 Google Material Design 3 Expressive (MD3E) 风格的油猴脚本

----
