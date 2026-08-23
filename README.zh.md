<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Lunidex 标志" width="80" />

# Lunidex

**为玩家、训练家和 TCG 收藏者打造的专注型宝可梦工作空间。**

[![在线应用](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[在线应用](https://lunidex.app) · [代码仓库](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[概览](#概览) · [功能](#功能) · [快速开始](#快速开始) · [配置](#配置) · [架构](#架构) · [部署](#部署)

<img src="./public/screenshot-desktop.png" alt="Lunidex 桌面版宝可梦图鉴和收藏仪表板" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · **中文** · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 概览

Lunidex 是一个独立的开源 npm workspaces 单体仓库，将宝可梦图鉴、宝可梦参考工具、队伍构建工具、宝可梦 TCG 目录和与账户关联的个人工作空间整合在一起。

Web 应用涵盖**九个世代的 1,025 只宝可梦**，支持英语、法语、西班牙语、德语、意大利语、日语、韩语和简体中文八种界面语言。葡萄牙语作为翻译版 README 提供，但不是 Web 界面语言。

公开参考页面无需账户即可使用。个人工作空间（收藏、已捕获宝可梦、队伍、测验进度、TCG 收藏、愿望清单、已保存搜索、备注、套牌及相关功能）在配置并完成同步后使用 Neon Auth 和 Neon PostgreSQL。Web 显示偏好使用 IndexedDB，Expo 应用使用 AsyncStorage。

> [!NOTE]
> Lunidex 是一个独立的、非官方、非商业粉丝项目。宝可梦数据、名称、角色和图像归 Nintendo、Game Freak、Creatures 及 The Pokémon Company 所有。Lunidex 与这些公司没有关联，也未得到其认可。

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Lunidex 移动版宝可梦图鉴" width="280" />
</div>

## 功能

| 领域 | 可以做什么 |
| --- | --- |
| **宝可梦图鉴与参考** | 浏览并筛选全部 1,025 只宝可梦；查看种族值、属性、特性、招式、进化、形态、遭遇地点、精灵图和本地化种族数据。也可以搜索招式、特性和道具。 |
| **队伍与对战实验室** | 创建最多 6 只宝可梦的队伍，分析属性和招式覆盖、协同与定位，比较最多 3 只宝可梦，使用 18 属性相性表，规划 EV/IV，计算培育结果，并运行第九世代对战模拟器。 |
| **进度与游戏** | 跟踪收藏、已捕获宝可梦、Living Dex、活动、徽章和测验统计。通过 3 种挑战和 3 种游戏模式（包括每日玩法）进行测验，并记录 Nuzlocke 进度。 |
| **分享与社交功能** | 导入和导出 Showdown 队伍，分享只读队伍链接，创建公开资料，管理好友，查看测验排行榜，并使用与账户关联的对战房间。 |
| **宝可梦 TCG 工作空间** | 浏览卡牌和系列，筛选目录，比较卡牌，跟踪已拥有和想要的卡牌，查看系列进度，保存搜索和备注，构建套牌，并在 TCGdex 提供数据时显示价格字段。 |
| **PWA 与持久化** | 将 Web 应用安装为 PWA。Service Worker 会缓存应用外壳和部分上游资源，以提升重复访问的稳定性；账户数据仍由服务器 API 保护。 |
| **移动端伴侣应用** | 在 iOS、Android 或 Web 上使用 Expo 应用，并共享 `@primedex/core` 中的 API 客户端、类型、Zustand 状态、持久化契约、翻译和 Neon 工具。 |

## 探索应用

将 `en` 替换为受支持的语言：`en`、`fr`、`es`、`de`、`it`、`ja`、`ko` 或 `zh`。

| 页面 | 路径 |
| --- | --- |
| 首页 | [`/en`](https://lunidex.app/en) |
| 宝可梦图鉴 | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| 宝可梦详情 | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| 队伍构建器 | [`/en/team`](https://lunidex.app/en/team) |
| 属性相性表 | [`/en/types`](https://lunidex.app/en/types) |
| 测验 | [`/en/quiz`](https://lunidex.app/en/quiz) |
| 对战模拟器 | [`/en/battle`](https://lunidex.app/en/battle) |
| TCG 目录 | [`/en/tcg`](https://lunidex.app/en/tcg) |
| TCG 收藏 | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| 仪表板 | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

收藏、仪表板、社交功能和其他个人页面可能需要经过身份验证的同步会话。

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 22
- npm 和已提交的 `package-lock.json`
- [Git](https://git-scm.com/)

克隆仓库、安装 workspaces 并启动 Web 应用：

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。语言代理会根据 `primedex-lang` Cookie 或浏览器语言，将没有语言前缀的 URL 重定向到 `/zh` 等受支持的语言路径。

> [!IMPORTANT]
> 开发和生产构建有意使用 webpack：`npm run dev` 执行 `next dev --webpack`，`npm run build` 执行 `next build --webpack`。即使 Next.js 配置中也声明了 Turbopack root，也请保留此选项。

## 移动应用

Expo 伴侣应用位于 [`apps/mobile`](./apps/mobile)。当前包含图鉴列表和搜索、详情页、收藏、队伍、账户、主题和语言设置。它尚未实现完整的 Web 功能对等；其余工具仍可在 Next.js 应用中使用。

在仓库根目录启动：

```bash
npm run start --workspace=@primedex/mobile
```

通过 Expo 菜单可以打开 iOS、Android 或 Web 预览。该 package 也提供 `android`、`ios` 和 `web` 脚本：

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

有关 Expo 专用环境变量和架构说明，请参阅[移动端 README](./apps/mobile/README.md)。

## 配置

浏览公开参考页面不需要环境变量。启用账户、服务器、联系表单、通知或开发集成时，请复制模板：

```bash
cp .env.example .env.local
```

对于 Expo 应用，请使用 `apps/mobile/.env.example` 作为模板：

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| 变量 | 范围 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / 公开 | 规范站点 URL 和 API 基础 URL。默认值为 `https://lunidex.app`。 |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / 公开 | 浏览器客户端使用的 Neon Auth 端点。 |
| `NEON_AUTH_BASE_URL`、`NEON_AUTH_JWKS_URL` | 仅服务器 | Neon Auth 代理和 JWT 验证端点。 |
| `NEON_AUTH_COOKIE_SECRET`、`NEON_AUTH_JWT_ISSUER`、`NEON_AUTH_JWT_AUDIENCE` | 仅服务器 | 认证 Cookie 保护和 JWT 验证约束。 |
| `NEON_DATABASE_URL` / `DATABASE_URL` | 仅服务器 | Neon PostgreSQL 连接。Vercel 的 Neon 集成提供 `DATABASE_URL`；本地可以使用 `NEON_DATABASE_URL`。 |
| `EXPO_PUBLIC_NEON_AUTH_URL`、`EXPO_PUBLIC_APP_URL` | 移动端 / 公开 | Expo 使用的 Neon Auth 和已部署应用端点。 |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / 公开 | 可选的 Google Search Console 验证值。 |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | 开发环境 | 值为 `true` 时启用 Agentation UI 审查浮层。 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / 公开 | 可选的浏览器 Push 订阅公钥。 |
| `VAPID_PRIVATE_KEY`、`VAPID_SUBJECT` | 仅服务器 | 可选的服务器端 Push 发送配置。 |
| `RESEND_API_KEY`、`CONTACT_TO_EMAIL`、`CONTACT_FROM_EMAIL` | 仅服务器 | 通过 Resend 发送联系表单邮件（可选）。 |
| `SUPABASE_DB_URL` | 仅迁移 | 保留的 Supabase-to-Neon 导出脚本使用的源连接；绝不能作为 Web 或移动端 runtime 变量。 |

> [!WARNING]
> 不要通过 `NEXT_PUBLIC_*`、`EXPO_PUBLIC_*`、源文件、日志或提交暴露连接字符串、JWKS 设置、Cookie 密钥、VAPID 私钥材料、Resend 密钥或迁移 URL。

<details>
<summary><strong>在开发环境中启用 Agentation</strong></summary>

将以下值添加到 `.env.local`，然后重启开发服务器：

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

该工具使用 `http://localhost:4747`；开发 Origin 和 CSP 支持已预先配置。

</details>

## 脚本

请在仓库根目录运行 root 命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Next.js 开发服务器。 |
| `npm run build` | 创建生产构建。 |
| `npm run start` | 提供生产构建。 |
| `npm run lint` | 检查 Web、core 和 mobile 源码。 |
| `npm run typecheck` | 检查 Web workspace 类型。 |
| `npm run test -- --run` | 运行一次 Vitest 测试套件。 |
| `npx vitest run path/to/file.test.ts` | 运行指定测试文件。 |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | 检查 `@primedex/core` 类型。 |
| `npm run typecheck --workspace=@primedex/mobile` | 检查 Expo 应用类型。 |
| `npm run lint --workspace=@primedex/mobile` | 检查 Expo 应用。 |
| `npm run db:neon:export` | 导出保留源数据用于迁移。 |
| `npm run db:neon:import` | 应用 Neon 架构并导入准备好的导出文件。 |
| `npm run db:neon:verify` | 比较源数据和 Neon 迁移结果。 |

> [!WARNING]
> Neon 导入和验证命令会访问外部数据库。请先阅读 [`neon/AGENTS.md`](./neon/AGENTS.md) 和 [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md)，并使用获批准的测试或 staging 目标。

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) 中的 CI workflow 会安装依赖，运行 lint、Web/core 类型检查、测试、生产构建和移动端类型检查。

## 架构

```text
.
├── src/                 Next.js 16 / React 19 Web 应用
├── packages/core/       @primedex/core：共享 API 客户端、类型、store、i18n 和工具
├── apps/mobile/         @primedex/mobile Expo Router 伴侣应用
├── neon/migrations/     当前使用的 Neon PostgreSQL 应用架构
├── supabase/            保留的源迁移和兼容性资料
├── scripts/neon/        受控的导出、导入和验证脚本
├── public/              PWA 图标、截图、卡牌资源和静态文件
└── docs/                产品、设计、迁移、审计和实现说明
```

```text
Web (Next.js App Router)
  ├── 服务端和客户端路由组件
  ├── TanStack Query ──▶ 共享 API 客户端 ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ IndexedDB 显示偏好
  └── Route Handlers ──▶ Neon Auth + Neon PostgreSQL 用户工作空间

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + 配置后使用的 Neon Auth/API
```

主要边界：

- **Web：** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Base UI、Framer Motion、TanStack Query 和 PWA 层。
- **共享 core：** Web 和移动端共享与 UI 无关的领域类型、API 客户端、Zustand store、i18n 语言包、Neon 工具和纯函数工具。
- **数据访问：** 远程请求都经过 `src/lib/api` 和 `packages/core/src/api` 中的集中式 API 门面；展示组件不会自行创建 API 客户端。
- **持久化：** Web 显示偏好使用 IndexedDB 和浏览器 fallback；原生端使用 AsyncStorage。已认证的工作空间通过 Neon API 同步并存储在 `user_state` 中。
- **平台边界：** 对应的 `*.ts` 和 `*.native.ts` 适配器分离浏览器与 React Native 的存储和配置，不复制领域逻辑。
- **本地化：** 带语言前缀的路由和翻译语言包支持 `en`、`fr`、`es`、`de`、`it`、`ja`、`ko` 和 `zh`。

> [!IMPORTANT]
> Lunidex 是对外使用的产品名，但 `primedex`、`@primedex/core`、`@primedex/mobile`、`usePrimeDexStore`、存储键、路由 slug、Expo scheme 和 bundle identifier 都是对兼容性敏感的历史标识。除非进行明确迁移，否则不要修改它们。

## 数据来源与归属

| 来源 | 用途 |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST 和 GraphQL | 宝可梦、种族文本、能力值、属性、招式、特性、进化、遭遇地点和本地化名称。 |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | 宝可梦和道具精灵图及相关图像资源。 |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG 卡牌、系列、稀有度、图片、目录字段，以及上游提供时的价格字段。 |
| [Neon](https://neon.com/) | 可选身份验证、PostgreSQL 用户状态、资料、好友、排行榜、对战房间和服务器端工作空间功能。 |

上游数据的可用性、本地化覆盖、图片和价格字段都可能变化。Lunidex 不是卡牌交易市场，也不保证市场估值或完整的价格历史覆盖。

源代码根据 [`LICENSE`](./LICENSE) 中的 MIT 许可证发布。宝可梦知识产权和第三方数据仍受各自权利人及其条款约束。

## 部署

Lunidex 已针对 [Vercel](https://vercel.com/) 配置，也可以运行在支持 Next.js 服务器 runtime 和图片优化的主机上。

```bash
npm run build
npm run start
```

在 Vercel 上：

1. 将 `teefloo/Lunidex` 导入 Vercel 项目。
2. 在 Preview 和 Production 中配置 Neon Auth 参数以及仅服务器使用的数据库连接。
3. 使用标准 Next.js 构建设置。已提交的 [`vercel.json`](./vercel.json) 有意保持最小化。

当前 Web runtime 使用 Neon。保留的 Supabase 迁移和受控迁移脚本用于比较、备份和迁移工作，并不是 Web 应用的身份验证或数据库 runtime。

有关架构、环境边界和验证流程，请参阅 [Neon 迁移 runbook](./docs/neon-migration.md)。

## 相关文档

- [移动端设置和功能对等说明](./apps/mobile/README.md)
- [产品上下文](./PRODUCT.md)
- [设计系统](./DESIGN.md)
- [Neon 迁移 runbook](./docs/neon-migration.md)
- [GitHub Issues](https://github.com/teefloo/Lunidex/issues)
