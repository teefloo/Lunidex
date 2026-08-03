<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Lunidex 标志" width="80" />

# Lunidex

**为训练家、收藏者和好奇粉丝打造的快速、本地优先宝可梦图鉴与 Pokémon TCG 工作空间。**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[概览](#概览) · [快速开始](#快速开始) · [功能](#功能) · [架构](#架构) · [配置](#配置) · [部署](#部署)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · **中文** · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 概览

Lunidex 是一个开源单体仓库，由 Next.js Web 应用、共享 TypeScript 包 `@primedex/core` 和 Expo 移动端伴侣应用组成。它将全国图鉴、对战准备工具、Pokémon TCG 收藏工具和个人进度追踪整合在一起，无需创建账户。

Web 应用涵盖**九个世代的 1,025 只宝可梦**。界面支持英语、法语、西班牙语、德语、意大利语、日语、韩语和简体中文；本仓库还提供葡萄牙语 README 翻译。

> [!NOTE]
> Lunidex 是非商业性粉丝项目。宝可梦数据、名称和图像归 Nintendo、Game Freak、Creatures 和 The Pokémon Company 所有。Lunidex 未与它们关联，也未得到其认可。

## 功能

| 领域 | 可以做什么 |
| --- | --- |
| **宝可梦图鉴** | 浏览和筛选全部 1,025 只宝可梦；查看种族值、特性、招式、进化、形态、遭遇地点、精灵图和对战信息。 |
| **培养工具** | 创建六只宝可梦的队伍并分析属性覆盖，比较宝可梦，探索属性表，规划努力值和个体值，计算孵化概率，并模拟第九世代对战。 |
| **资料库** | 搜索招式、特性和道具，使用招式覆盖检查和克制建议。 |
| **个人进度** | 将收藏、Living Dex、队伍、最近浏览、测验统计和设置持久化到本地存储，并以 JSON 导入或导出。 |
| **游戏模式** | 体验六种模式的测验，追踪 Nuzlocke 挑战，并以只读链接分享队伍。 |
| **TCG 工作空间** | 发现卡牌和卡组，管理收藏和心愿单，比较卡牌，查看价格历史和提醒，并构建 60 张卡牌的套牌。 |
| **离线和移动端** | 安装 PWA 并从缓存中重用已使用的资源。Expo 应用目前支持图鉴、详情、收藏、队伍、账户、主题和语言设置。 |

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 20 或更高版本
- npm 10 或更高版本

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。Lunidex 会根据 `primedex-lang` Cookie 或浏览器的 `Accept-Language` 请求头，将无前缀 URL 重定向到如 `/zh` 的语言路径。

> [!IMPORTANT]
> 开发环境有意使用 webpack：`npm run dev` 会执行 `next dev --webpack`。即使 Next 配置中也声明了 Turbopack root，也请保留该命令。

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 在 3000 端口启动 Next.js 开发服务器。 |
| `npm run build` | 创建生产构建。 |
| `npm run start` | 启动生产构建。 |
| `npm run lint` | 运行 ESLint 9。 |
| `npm run typecheck` | 在不生成文件的情况下检查 TypeScript。 |
| `npm run test` | 在 jsdom 中运行 Vitest。 |

### 移动应用

Expo 伴侣应用位于 [`apps/mobile`](./apps/mobile)，并使用共享包 [`@primedex/core`](./packages/core)。

```bash
cd apps/mobile
npx expo start
```

通过 Expo 提示可打开 iOS、Android、Web 或 Expo Go。有关当前支持的页面，请参阅[移动端 README](./apps/mobile/README.md)。

## 配置

本地浏览图鉴不需要任何环境变量。仅在启用可选集成时创建不提交的 `.env.local`。

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | 覆盖规范公共 URL；默认值为 `https://primedex.vercel.app`。 |
| `NEXT_PUBLIC_SUPABASE_URL` | 启用可选的 Supabase 身份验证和云端同步。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 与 Supabase URL 配套的公开匿名密钥。 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 启用 TCG 价格提醒的浏览器 Push 订阅。 |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | 添加 Google Search Console 验证元数据。 |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | 在开发期间启用 Agentation UI 审查工具栏。 |

> [!TIP]
> 即使没有 Supabase，Lunidex 仍可完全以本地优先模式使用：收藏、队伍、捕获、筛选和 TCG 进度都会保留在浏览器存储中。移动端请在 `apps/mobile/.env` 中使用 `EXPO_PUBLIC_SUPABASE_URL` 和 `EXPO_PUBLIC_SUPABASE_ANON_KEY`。

<details>
<summary><strong>在开发环境中启用 Agentation</strong></summary>

将以下值添加到 `.env.local` 后重启开发服务器：

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

该工具运行在 `http://localhost:4747`；开发 Origin 和 CSP 已预先配置。

</details>

## 架构

```text
Poke/
├── src/                 Next.js 16 App Router Web 应用
├── packages/core/       @primedex/core：API、状态、类型、i18n、工具函数、Supabase
├── apps/mobile/         Expo / React Native 伴侣应用
├── supabase/migrations/ 可选的 Supabase 数据库迁移
└── public/              PWA 图标、截图和静态资源
```

```text
React 服务端和客户端组件
  ├── TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL、TCGdex
  └── Zustand selectors (@/store/primedex) ──▶ Web IndexedDB / 移动端 AsyncStorage
```

- **界面：** 使用 Next.js 16、React 19、TypeScript 5、Tailwind CSS 4、Base UI 和 Framer Motion。默认采用 Server Components。
- **数据：** 集中式 API 客户端使用带重试的 Axios。TanStack Query 负责缓存，查询键集中管理。
- **状态：** Zustand 将个人数据以 ID 和基础值形式保存到 Web 的 IndexedDB 或移动端的 AsyncStorage。
- **多语言和韧性：** i18next 按需加载客户端语言包，服务端翻译用于静态渲染。PWA 会缓存应用外壳及部分 PokéAPI、TCGdex、图片和 Next 资源。

## 数据来源

| 来源 | 用途 |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST 和 GraphQL | 宝可梦、图鉴文本、招式、特性、属性、进化和遭遇数据。 |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG 卡牌、系列、图片、稀有度和目录信息。 |
| [Supabase](https://supabase.com/) | 可选身份验证、云端同步、公开资料、游戏数据和 TCG 价格提醒。 |

组件不会直接请求这些服务；所有请求都经过项目的 API 层。

## 部署

Lunidex 已为 Vercel 配置，也可运行在支持 Next.js 服务器运行时和图片优化的任意平台上。

```bash
npm run build
npm run start
```

在 Vercel 中导入仓库，保留标准 Next.js 设置，并在控制台添加可选的公共环境变量。[`vercel.json`](./vercel.json) 有意保持最小化。

## 致谢

Lunidex 基于 [PokéAPI](https://pokeapi.co/)、[TCGdex](https://www.tcgdex.net/)、[Vercel](https://vercel.com/) 以及应用中使用的开源项目构建。

Pokémon 和所有相关资产均为其各自所有者的商标。本项目为非官方、非商业的粉丝项目。
