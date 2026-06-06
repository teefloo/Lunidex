<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex 标志" align="center" width="80" />

# PrimeDex

**为追求速度、数据和设计的训练师打造的、最完整的在线宝可梦图鉴。**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

基于 Next.js 16 + React 19 的高性能仪表盘，覆盖全国图鉴：种族值、属性、进化、队伍构筑、TCG 卡牌与猜谜游戏，9 种语言可用。

[概述](#概述) · [功能](#功能) · [快速开始](#快速开始) · [路由](#路由) · [架构](#架构) · [数据源](#数据源) · [部署](#部署)

![PrimeDex — 桌面预览](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · **汉语** · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 概述

PrimeDex 是面向对战玩家、TCG 收藏者和好奇粉丝的开源宝可梦图鉴仪表盘。它覆盖 9 个世代共 **1,025 只**宝可梦，提供 9 种语言的本地化名称、并排的种族值比较、基于属性联防的队伍构筑器，以及包含 25,000+ 张卡牌的 TCG 目录。

应用基于官方的 [PokéAPI](https://pokeapi.co)（REST + GraphQL）和 [TCGdex](https://www.tcgdex.net) 构建，使用 TanStack Query 缓存、Zustand（IndexedDB）维持持久化 UI 状态、Next.js App Router 实现服务端组件与按路由的静态生成。

> [!NOTE]
> 本项目为非商业粉丝项目。宝可梦数据、名称与图像的版权归 Nintendo、Game Freak 和 The Pokémon Company 所有。

## 功能

- **完整的全国图鉴** — 1,025 只宝可梦、所有形态、所有世代，附带本地化名称与说明文字。
- **队伍构筑器** — 组建 6 只宝可梦的队伍，实时分析属性联防、检测共享弱点，并给出协同评分。
- **对比引擎** — 最多 3 只宝可梦的并排分析，配备交互式雷达图与种族值细分。
- **属性相克表** — 交互式展示 18 种属性的相克关系：优势、弱点、抗性与免疫。
- **招式数据库** — 可按威力、命中、PP、属性、分类与详细效果描述进行筛选。
- **TCG 卡牌目录** — 25,000+ 张卡牌，可按系列、稀有度、属性、阶段与 HP 检索，并支持收藏与愿望单跟踪。
- **猜谜游戏** — 6 种游戏模式：经典、剪影、种族值、限时、生存与马拉松。
- **Living Dex 追踪** — 持久的捕获管理，完全离线，存储在浏览器本地。
- **9 种语言** — 英语、法语、德语、西班牙语、意大利语、日语、韩语、简体中文、巴西葡萄牙语。
- **高级搜索** — 按世代、属性、种族值总和、蛋组与特殊状态进行多维筛选。
- **SEO & AEO 就绪** — JSON-LD（`WebApplication`、`ItemList`、`FAQPage`、`HowTo`）、`hreflang` 替代标签、`llms.txt` / `ai.txt` 发现机制，以及自动生成的站点地图。

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org) 20+
- npm 10+（随 Node.js 一起安装）
- 兼容 POSIX 的 Shell（脚本采用 `bash` 风格调用）

### 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. 安装依赖
npm install

# 3. 启动开发服务器（使用 webpack，而非 Turbopack）
npm run dev
```

应用现在运行在 <http://localhost:3000>。中间件会根据 `primedex-lang` Cookie 或浏览器的 `Accept-Language` 请求头，将 `/` 重定向到你的首选语言。

> [!IMPORTANT]
> `npm run dev` 固定使用 `next dev --webpack`，以确保 App Router 与 `next/dynamic` 边界下 HMR 的稳定性。**请勿**在本地切换为 Turbopack——`next.config.ts` 中关于 `turbopack.root` 的声明是刻意的，必须保留。

### Agentation 开发工具（可选）

PrimeDex 内置了用于 AI 辅助 UI 审查的 [Agentation](https://github.com/tldraw/agentation)。要启用它，请在 `.env.local` 中添加以下内容：

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

工具栏将运行在 <http://localhost:4747>（CSP 和 `allowedDevOrigins` 已预配置）。

## 技术栈

| 层级            | 工具                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| 框架            | [Next.js 16](https://nextjs.org)（App Router），[React 19](https://react.dev)        |
| 语言            | [TypeScript 5](https://www.typescriptlang.org)（strict，100% 类型安全）              |
| 样式            | [Tailwind CSS v4](https://tailwindcss.com)，[`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| UI 基础组件     | [`@base-ui/react`](https://base-ui.com)，`shadcn/ui`（`base-nova` 预设）              |
| 动画            | [Framer Motion](https://www.framer.com/motion/)                                     |
| 数据获取        | [TanStack Query v5](https://tanstack.com/query)                                     |
| 客户端状态      | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval)（IndexedDB） |
| 图表            | [Recharts](https://recharts.org)                                                    |
| 国际化          | [i18next](https://www.i18next.com/) + `react-i18next`                                |
| HTTP            | [Axios](https://axios-http.com) + `axios-retry`（指数回退）                          |
| 工具链          | ESLint v9（flat config）、Vitest + Testing Library、Puppeteer（视觉 QA）             |

## 路由

所有路由都带语言前缀（`/en`、`/fr`、`/ja`…）。中间件会透明地处理 308 重定向与重写。

| 路径                          | 描述                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `/`                           | 首页，含 Hero、推荐宝可梦与完整的图鉴网格。                                   |
| `/pokemon/[name]`             | 详情页，包含种族值、属性、进化、特性、招式与配招方案。                       |
| `/team`                       | 6 槽队伍构筑器，实时属性联防分析与协同评分。                                  |
| `/compare`                    | 最多 3 只宝可梦的并排对比。                                                   |
| `/favorites`                  | 个人收藏的宝可梦列表。                                                        |
| `/quiz`                       | “这是哪只宝可梦？”猜谜游戏，含 6 种模式。                                    |
| `/types`                      | 18 种属性的交互式属性表。                                                     |
| `/moves`                      | 可检索的招式数据库。                                                          |
| `/tcg`                        | 宝可梦 TCG 卡牌目录，可按系列、稀有度、属性与 HP 筛选。                      |
| `/tcg/cards/[id]`             | 单张 TCG 卡牌详情。                                                           |
| `/tcg/collection`             | 个人卡牌收藏追踪。                                                            |
| `/tcg/wishlist`               | TCG 愿望单。                                                                  |
| `/about`                      | 项目宗旨、数据源与联系方式。                                                  |
| `/faq`                        | 常见问题。                                                                    |
| `/cookies` `/legal` `/privacy` `/terms` | 法律页面。                                                          |

动态页面 `/pokemon/[name]` 为前 151 只宝可梦使用 `generateStaticParams`，并通过 `revalidate = 3600` 进行增量静态再生。

## 架构

### 数据流

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Zustand 选择器 (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- 所有 HTTP 请求都通过 `@/lib/api` 统一出口，组件从不直接使用 `fetch` 或 `axios`。
- Query key 在 `@/lib/api/keys` 集中管理，以保证稳定的缓存失效。
- Zustand Store 仅保存 ID 与基本类型数据（收藏、队伍、捕获、筛选、历史、设置），并持久化到 IndexedDB。**不会**将本地状态保存到 `localStorage`。
- 重型组件（`EvolutionChain`、`AdvancedInfo`、`PokemonCards`）通过 `next/dynamic` 加载，以保持首屏轻量。

### 国际化

- 支持的语言：`en`、`fr`、`es`、`de`、`it`、`ja`、`ko`、`zh`、`pt`。
- 客户端代码使用 `@/lib/i18n`，语言包按需懒加载；英语是初始包。
- 服务端代码使用 `@/lib/server-i18n`，所有语言包内置以支持 SSG/SSR。
- 每个页面声明 `hreflang` 替代语言以及指向 `/en` 的 `x-default`。
- `primedex-lang` Cookie 将用户偏好保存 1 年。

### 性能

- 默认使用 Server Components；`"use client"` 仅保留给需要交互的叶子组件。
- 所有图片使用 `next/image`（AVIF + WebP），并配有严格的 `remotePatterns` 白名单。
- 为 `/pokemon/[name]`（前 151 只）做静态生成 + 每小时 ISR。
- `/_next/static` 不可变缓存，图片 1 天缓存，`sitemap.xml` 与 `llms.txt` 1 小时缓存。
- TanStack Query 默认值：`staleTime` 10 分钟，`gcTime` 60 分钟，`retry` 1，不启用 `refetchOnWindowFocus`。

### 安全

- 每条路由都启用加固的响应头：`X-Content-Type-Options`、`X-Frame-Options: DENY`、带 `preload` 的 HSTS、严格的 `Referrer-Policy`、锁定的 `Permissions-Policy`。
- 强制实施严格的 Content-Security-Policy。来源：见 `next.config.ts`。
- Axios 重试机制结合指数回退处理瞬时网络错误和 HTTP 429。

## 数据源

| 数据源                                                                  | 用途                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| [PokéAPI](https://pokeapi.co)（REST）                                   | 宝可梦、招式、特性、属性、遭遇                      |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                      | 物种本地化名称与说明文字                            |
| [TCGdex](https://www.tcgdex.net)                                        | 宝可梦 TCG 卡牌、系列与稀有度                        |
| [PokeAPI 精灵图](https://github.com/PokeAPI/sprites)                    | 官方插画与动态精灵图                                |

所有数据均在服务端获取并每 3,600 秒重新校验。每个宝可梦页面都会显示数据来源说明。

## 配置

应用读取少量环境变量。**本地开发不需要任何环境变量**。

| 变量                                | 默认值                          | 用途                                          |
| ----------------------------------- | ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`               | `https://primedex.vercel.app`   | 站点规范 URL                                  |
| `NEXT_PUBLIC_ENABLE_AGENTATION`     | _(未设置)_                      | 切换 Agentation 开发工具栏                    |

## 脚本

| 命令                                 | 说明                                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| `npm run dev`                        | 使用 webpack 在 `:3000` 启动开发服务器。                   |
| `npm run build`                      | 生产构建。                                                 |
| `npm run start`                      | 运行生产构建。                                             |
| `npm run lint`                       | 使用项目 flat config 的 ESLint v9。                        |
| `npm run typecheck`                  | 对整个项目执行 `tsc --noEmit`。                            |
| `npm run test`                       | Vitest（jsdom）——见 `vitest.config.ts`。                   |
| `npx vitest path/to/file.test.ts`    | 运行单个测试文件。                                         |
| `npx vitest --ui`                    | 打开 Vitest UI。                                           |

> [!NOTE]
> 在添加测试之前，请确保 `src/test/setup.ts` 存在。Vitest 配置已指向该文件，但目前它是一个空壳。没有它，`npm run test` 将无法启动。

## 项目结构

```
src/
├── app/                # Next.js App Router — 路由位于此处
│   ├── api/            # 路由处理器（TCG）
│   ├── [locale]        # 带语言前缀的路由
│   ├── layout.tsx      # 根布局（RSC）
│   ├── providers.tsx   # TanStack Query、主题、国际化 Provider
│   └── ...
├── components/         # 可复用 UI（pokemon/、team/、tcg/、layout/、ui/）
├── lib/                # 纯 TS 工具 + API 统一出口
│   ├── api/            # REST + GraphQL + TCG 客户端
│   ├── i18n/           # 语言包（客户端懒加载）
│   ├── server-i18n.ts  # 服务端翻译
│   └── ...
├── store/primedex.ts   # Zustand Store（仅 ID 与基本类型）
├── types/pokemon.ts    # 领域类型的唯一真实来源
├── hooks/              # 自定义 React Hook
└── middleware.ts       # 语言 308 重定向与重写

public/                 # 静态资源（图标、截图、精灵图兜底）
```

## 部署

PrimeDex 是标准的 Next.js 16 应用，可部署到任何支持 Next.js standalone 输出的平台。

### Vercel（推荐）

仓库自带一份最简的 `vercel.json`（`{"name": "poke-app"}`）。在 Vercel 上导入项目，接受框架默认设置，生产构建即可开箱即用。`/pokemon/[name]` 上的 `revalidate = 3600` 会自动生效。

### 其他平台

```bash
npm run build
npm run start  # 在 :3000 启动生产服务器
```

请确保宿主机支持 Next.js 图像优化 API（或将图像预渲染到 CDN）。

## 贡献

欢迎提交 Issue、功能请求和 Pull Request。对于任何非微小的改动，请先开 Issue 讨论方案。

提交 Pull Request 时：

- 在本地运行 `npm run lint` 与 `npm run typecheck`。
- 在行为变化时新增或更新测试。
- 遵循 [`AGENTS.md`](./AGENTS.md) 以及各子目录的 `AGENT.md` 中的约定。

## 致谢

- [PokéAPI](https://pokeapi.co) — 该系列最权威的开源数据源。
- [TCGdex](https://www.tcgdex.net) — 卡牌浏览器使用的开源 TCG 目录。
- [Vercel](https://vercel.com) — 托管与边缘网络。
- [shadcn/ui](https://ui.shadcn.com) — 锚定设计系统的 `base-nova` 预设。

## 联系方式

- Issue：<https://github.com/teefloo/Poke/issues>
- 安全披露：见 [`.well-known/security.txt`](./public/.well-known/security.txt)
- 作者：Esteban Deloge（<contact@primedex.app>）

## 商标

宝可梦、宝可梦角色名称及相关权利均为 Nintendo、Game Freak 与 The Pokémon Company 的商标。PrimeDex 是仅用于教育与娱乐目的的非官方粉丝项目，与上述实体不存在任何关联、认可或赞助关系。
