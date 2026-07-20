<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex ロゴ" width="80" />

# PrimeDex

**トレーナー、コレクター、好奇心旺盛なファンのための、高速なローカルファーストのポケモン図鑑と Pokémon TCG ワークスペース。**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[概要](#概要) · [はじめに](#はじめに) · [機能](#機能) · [アーキテクチャ](#アーキテクチャ) · [設定](#設定) · [デプロイ](#デプロイ)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · **日本語** · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 概要

PrimeDex は、Next.js の Web アプリ、共有 TypeScript パッケージ `@primedex/core`、Expo モバイルコンパニオンから成るオープンソースのモノレポです。アカウント作成を必須にせず、全国図鑑、対戦準備ツール、Pokémon TCG コレクションツール、個人の進行状況追跡をまとめています。

Web アプリは**9 世代・1,025 種のポケモン**を収録しています。UI は英語、フランス語、スペイン語、ドイツ語、イタリア語、日本語、韓国語、簡体字中国語に対応しています。このリポジトリにはポルトガル語版 README もあります。

> [!NOTE]
> PrimeDex は非営利のファンプロジェクトです。ポケモンのデータ、名称、画像は Nintendo、Game Freak、Creatures、The Pokémon Company に帰属します。PrimeDex はこれらの企業と提携・公認されていません。

## 機能

| 分野 | できること |
| --- | --- |
| **ポケモン図鑑** | 1,025 種を閲覧・絞り込みし、種族値、特性、技、進化、フォルム、出現場所、スプライト、対戦情報を確認できます。 |
| **育成ツール** | 6 匹のチーム作成と相性分析、ポケモン比較、タイプ相性表、努力値・個体値の計画、孵化確率の計算、第 9 世代バトルのシミュレーションを行えます。 |
| **リファレンス** | 技・特性・どうぐを検索し、技範囲チェックや対策候補を利用できます。 |
| **個人の進行** | お気に入り、Living Dex、チーム、最近見たページ、クイズ統計、設定を永続的なローカルストレージに保存し、JSON で入出力できます。 |
| **ゲームモード** | 6 モードのクイズ、Nuzlocke ランの記録、読み取り専用リンクでのチーム共有に対応します。 |
| **TCG ワークスペース** | カードとセットの検索、コレクションと欲しいものリストの管理、カード比較、価格履歴とアラート、60 枚デッキの作成ができます。 |
| **オフラインとモバイル** | PWA をインストールし、利用済みリソースをキャッシュから再利用できます。Expo アプリは現在、図鑑、詳細、お気に入り、チーム、アカウント、テーマ、言語に対応しています。 |

## はじめに

### 前提条件

- [Node.js](https://nodejs.org/) 20 以上
- npm 10 以上

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。PrimeDex は、`primedex-lang` Cookie またはブラウザの `Accept-Language` ヘッダーを使い、接頭辞のない URL を `/ja` のようなロケール URL へリダイレクトします。

> [!IMPORTANT]
> 開発では意図的に webpack を使用します。`npm run dev` は `next dev --webpack` を実行します。Next 設定に Turbopack root があっても、このコマンドを変更しないでください。

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | ポート 3000 で Next.js 開発サーバーを起動します。 |
| `npm run build` | 本番ビルドを作成します。 |
| `npm run start` | 本番ビルドを起動します。 |
| `npm run lint` | ESLint 9 を実行します。 |
| `npm run typecheck` | ファイルを出力せずに TypeScript を検査します。 |
| `npm run test` | jsdom で Vitest を実行します。 |

### モバイルアプリ

Expo コンパニオンは [`apps/mobile`](./apps/mobile) にあり、共有パッケージ [`@primedex/core`](./packages/core) を利用します。

```bash
cd apps/mobile
npx expo start
```

Expo の案内から iOS、Android、Web、Expo Go を開けます。対応画面は[モバイル README](./apps/mobile/README.md)を参照してください。

## 設定

ローカルで図鑑を閲覧するだけなら環境変数は不要です。任意の連携を有効にするときだけ、コミットしない `.env.local` を作成してください。

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | 正規の公開 URL を上書きします。既定値は `https://primedex.vercel.app` です。 |
| `NEXT_PUBLIC_SUPABASE_URL` | 任意の Supabase 認証とクラウド同期を有効にします。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase URL に対応する公開匿名キーです。 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | TCG 価格アラート用のブラウザ Push 購読を有効にします。 |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console の確認メタデータを追加します。 |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | 開発中に Agentation UI レビューツールバーを有効にします。 |

> [!TIP]
> Supabase がなくても、PrimeDex はローカルファーストで完全に利用できます。お気に入り、チーム、捕獲、フィルター、TCG の進行はブラウザに保存されます。モバイルでは `apps/mobile/.env` に `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` を使用します。

<details>
<summary><strong>開発時に Agentation を有効にする</strong></summary>

`.env.local` に次を追加し、開発サーバーを再起動します。

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

ツールは `http://localhost:4747` で動作します。開発 Origin と CSP は設定済みです。

</details>

## アーキテクチャ

```text
Poke/
├── src/                 Next.js 16 App Router Web アプリケーション
├── packages/core/       @primedex/core: API、状態、型、i18n、ヘルパー、Supabase
├── apps/mobile/         Expo / React Native コンパニオン
├── supabase/migrations/ 任意の Supabase スキーママイグレーション
└── public/              PWA アイコン、スクリーンショット、静的アセット
```

```text
React Server / Client Components
  ├── TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL、TCGdex
  └── Zustand selectors (@/store/primedex) ──▶ Web: IndexedDB / モバイル: AsyncStorage
```

- **UI:** Next.js 16、React 19、TypeScript 5、Tailwind CSS 4、Base UI、Framer Motion。Server Components が標準です。
- **データ:** 集中管理された API クライアントはリトライ付き Axios を使用します。TanStack Query がキャッシュを管理し、クエリキーは一か所に集約されています。
- **状態:** Zustand は個人データを ID とプリミティブとして Web では IndexedDB、モバイルでは AsyncStorage に永続化します。
- **多言語と耐障害性:** i18next はクライアントバンドルを遅延読み込みし、サーバー翻訳は静的レンダリングに使われます。PWA はアプリシェルと一部の PokéAPI、TCGdex、画像、Next リソースをキャッシュします。

## データソース

| ソース | 用途 |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST / GraphQL | ポケモン、図鑑テキスト、技、特性、タイプ、進化、出現情報。 |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG カード、セット、画像、レアリティ、カタログ情報。 |
| [Supabase](https://supabase.com/) | 任意の認証、クラウド同期、公開プロフィール、ゲームデータ、TCG 価格アラート。 |

コンポーネントはこれらのサービスを直接呼び出しません。リクエストはプロジェクトの API 層を経由します。

## デプロイ

PrimeDex は Vercel 用に設定されており、Next.js サーバーランタイムと画像最適化をサポートするホストで実行できます。

```bash
npm run build
npm run start
```

Vercel ではリポジトリをインポートし、標準の Next.js 設定を維持して、任意の公開環境変数をダッシュボードで追加してください。[`vercel.json`](./vercel.json) は意図的に最小限です。

## 謝辞

PrimeDex は [PokéAPI](https://pokeapi.co/)、[TCGdex](https://www.tcgdex.net/)、[Vercel](https://vercel.com/)、およびアプリケーションで使用するオープンソースプロジェクトによって支えられています。

ポケモンおよび関連するすべてのプロパティは各権利者の商標です。本プロジェクトは非公式かつ非営利のファンプロジェクトです。
