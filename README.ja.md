<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex ロゴ" align="center" width="80" />

# PrimeDex

**スピード、データ、デザインにこだわるトレーナーための、最も完成されたオンライン図鑑。**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

全国ポケモン図鑑を網羅する、Next.js 16 + React 19 による高性能ダッシュボード。ステータス、タイプ、進化、チーム構築、TCG カード、クイズまで、9 言語で利用できます。

[概要](#概要) · [機能](#機能) · [クイックスタート](#クイックスタート) · [ルート](#ルート) · [アーキテクチャ](#アーキテクチャ) · [データソース](#データソース) · [デプロイ](#デプロイ)

![PrimeDex — デスクトッププレビュー](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · **日本語** · [한국어](./README.ko.md) · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 概要

PrimeDex は、対戦勢、TCG コレクター、そして好奇心旺盛なファンに向けたオープンソースのポケモン図鑑ダッシュボードです。9 世代にわたる全 **1,025 匹**のポケモンを網羅し、9 言語にローカライズされた名前、ステータスの並列比較、タイプ相性に基づくチームビルダー、25,000 枚を超える TCG カタログを備えています。

アプリは公式の [PokéAPI](https://pokeapi.co) (REST + GraphQL) と [TCGdex](https://www.tcgdex.net) をもとに構築されており、キャッシュには TanStack Query、永続的な UI 状態には Zustand (IndexedDB)、サーバーコンポーネントとルート単位の静的生成には Next.js App Router を採用しています。

> [!NOTE]
> 非商用のファンプロジェクトです。ポケモンのデータ・名称・画像は © Nintendo、Game Freak、The Pokémon Company に帰属します。

## 機能

- **全国ポケモン図鑑を完全網羅** — 1,025 匹すべて、すべてのフォーム、すべての世代をローカライズ名とフレーバーテキスト付きで収録。
- **チームビルダー** — 6 匹のチームを編成し、リアルタイムのタイプ相性解析、共通の弱点検出、相性スコアを表示。
- **比較エンジン** — 最大 3 匹のポケモンを並列に分析。インタラクティブなレーダーチャートと種族値の内訳付き。
- **タイプ相性表** — 全 18 タイプの相性をインタラクティブに表示。強み、弱点、耐性、抜群を網羅。
- **わざデータベース** — 威力、命中、PP、タイプ、分類、効果の詳細でフィルタ可能。
- **TCG カタログ** — 25,000 枚以上のカードをセット、レア度、タイプ、ステージ、HP で検索可能。コレクション・ウィッシュリストの追跡機能付き。
- **クイズ** — クラシック、シルエット、ステータス、タイムアタック、サバイバル、マラソンの 6 モード。
- **リビングデックストラッカー** — 捕獲状況を永続的に管理。完全オフラインでブラウザ内に保存。
- **9 言語対応** — 英語、フランス語、ドイツ語、スペイン語、イタリア語、日本語、韓国語、簡体字中国語、ブラジルポルトガル語。
- **高度な検索** — 世代、タイプ、種族値合計、タマゴグループ、特殊状態による多次元フィルタ。
- **SEO & AEO 対応** — JSON-LD (`WebApplication`, `ItemList`, `FAQPage`, `HowTo`)、`hreflang` 代替、`llms.txt` / `ai.txt` の検出、生成されたサイトマップ。

## クイックスタート

### 前提条件

- [Node.js](https://nodejs.org) 20 以上
- npm 10 以上 (Node.js に同梱)
- POSIX 互換シェル (付属スクリプトは `bash` 形式で呼び出します)

### ローカルで実行

```bash
# 1. リポジトリをクローン
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. 依存関係をインストール
npm install

# 3. 開発サーバーを起動 (webpack を使用、Turbopack ではありません)
npm run dev
```

アプリは <http://localhost:3000> で起動します。`primedex-lang` クッキー、またはブラウザの `Accept-Language` ヘッダーに基づいて、ミドルウェアが `/` を適切なロケールにリダイレクトします。

> [!IMPORTANT]
> `npm run dev` は App Router と `next/dynamic` 境界での安定した HMR のために `next dev --webpack` に固定されています。ローカルで Turbopack に切り替えないでください。`next.config.ts` 内の `turbopack.root` の宣言は意図的なもので、そのまま残す必要があります。

### Agentation 開発ツール (任意)

PrimeDex には AI を活用した UI レビュー用の [Agentation](https://github.com/tldraw/agentation) が同梱されています。有効化するには、`.env.local` に以下を追加してください:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

ツールバーは <http://localhost:4747> で配信されます (CSP と `allowedDevOrigins` は事前設定済み)。

## 技術スタック

| レイヤー          | ツール                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| フレームワーク    | [Next.js 16](https://nextjs.org) (App Router)、[React 19](https://react.dev)          |
| 言語              | [TypeScript 5](https://www.typescriptlang.org) (strict、100% 型安全)                  |
| スタイリング      | [Tailwind CSS v4](https://tailwindcss.com)、[`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| UI プリミティブ   | [`@base-ui/react`](https://base-ui.com)、`shadcn/ui` (`base-nova` プリセット)         |
| アニメーション    | [Framer Motion](https://www.framer.com/motion/)                                       |
| データ取得        | [TanStack Query v5](https://tanstack.com/query)                                       |
| クライアント状態  | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| チャート          | [Recharts](https://recharts.org)                                                      |
| i18n              | [i18next](https://www.i18next.com/) + `react-i18next`                                  |
| HTTP              | [Axios](https://axios-http.com) + `axios-retry` (指数バックオフ)                       |
| ツール            | ESLint v9 (flat config)、Vitest + Testing Library、Puppeteer (ビジュアル QA)          |

## ルート

すべてのルートはロケールでプレフィックスされます (`/en`, `/fr`, `/ja`…)。ミドルウェアが 308 リダイレクトとリライトを透過的に処理します。

| パス                          | 説明                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `/`                           | ヒーロー、注目のポケモン、全国ポケモン図鑑のグリッドを備えたホーム。                  |
| `/pokemon/[name]`             | ステータス、タイプ、進化、特性、わざ、育成論を備えた詳細ページ。                      |
| `/team`                       | リアルタイムのタイプ相性と相性スコアを備えた 6 体パーティビルダー。                   |
| `/compare`                    | 最大 3 匹のポケモンを並列比較。                                                       |
| `/favorites`                  | お気に入りポケモンの個人リスト。                                                      |
| `/quiz`                       | 6 つのゲームモードで「誰だっけポケモン？」を楽しめます。                              |
| `/types`                      | 全 18 タイプのインタラクティブな相性表。                                              |
| `/moves`                      | 検索可能なわざデータベース。                                                          |
| `/tcg`                        | セット、レア度、タイプ、HP でフィルタ可能なポケモン TCG カタログ。                    |
| `/tcg/cards/[id]`             | 個別 TCG カードの詳細ページ。                                                         |
| `/tcg/collection`             | カードコレクションのトラッカー。                                                      |
| `/tcg/wishlist`               | TCG のウィッシュリスト。                                                              |
| `/about`                      | プロジェクト概要、データソース、連絡先。                                              |
| `/faq`                        | よくある質問。                                                                        |
| `/cookies` `/legal` `/privacy` `/terms` | 法的ページ。                                                                  |

動的ページ `/pokemon/[name]` は最初の 151 匹のポケモンに対して `generateStaticParams` を使用し、`revalidate = 3600` で段階的静的再生成を行います。

## アーキテクチャ

### データフロー

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Zustand セレクタ (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- すべての HTTP 呼び出しは `@/lib/api` バレルを経由します。コンポーネントが直接 `fetch` や `axios` を使うことはありません。
- クエリキーは `@/lib/api/keys` に集約されており、無効化処理を安定させています。
- Zustand ストアには ID とプリミティブ値 (お気に入り、チーム、捕獲、フィルタ、履歴、設定) のみが保持され、IndexedDB に永続化されます。**ローカルストレージには保存されません**。
- 重いコンポーネント (`EvolutionChain`, `AdvancedInfo`, `PokemonCards`) は `next/dynamic` 経由で読み込まれ、初回描画を軽量に保ちます。

### 国際化

- サポート対象ロケール: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`。
- クライアントコードは `@/lib/i18n` を使い、言語バンドルは遅延読み込み。英語が初期バンドルです。
- サーバーコードは `@/lib/server-i18n` を使い、SSG/SSR 用に全バンドルが組み込まれています。
- 各ページは `hreflang` 代替と `/en` を指す `x-default` を宣言します。
- `primedex-lang` クッキーが 1 年間ユーザーの設定を保持します。

### パフォーマンス

- デフォルトで Server Components。`"use client"` はインタラクティビティが必要な末端のみ。
- すべての画像は `next/image` (AVIF + WebP) で配信し、厳格な `remotePatterns` 許可リストを使用。
- `/pokemon/[name]` (最初の 151 匹) は静的生成 + 1 時間ごとの ISR。
- `/_next/static` は不変キャッシュ、画像は 1 日キャッシュ、`sitemap.xml` と `llms.txt` は 1 時間キャッシュ。
- TanStack Query の既定値: `staleTime` 10 分、`gcTime` 60 分、`retry` 1、`refetchOnWindowFocus` 無効。

### セキュリティ

- 全ルートに強化済みヘッダー: `X-Content-Type-Options`、`X-Frame-Options: DENY`、`preload` 付き HSTS、厳格な `Referrer-Policy`、ロックダウンされた `Permissions-Policy`。
- 厳格な Content-Security-Policy を強制。出典: `next.config.ts` を参照。
- Axios のリトライで一時的なネットワークエラーおよび HTTP 429 を指数バックオフで処理。

## データソース

| ソース                                                                    | 用途                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------- |
| [PokéAPI](https://pokeapi.co) (REST)                                      | ポケモン、わざ、特性、タイプ、出会い               |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                        | 種族名のローカライズとフレーバーテキスト             |
| [TCGdex](https://www.tcgdex.net)                                          | ポケモン TCG のカード、セット、レア度               |
| [PokeAPI スプライト](https://github.com/PokeAPI/sprites)                  | 公式アートワークおよびアニメーションスプライト       |

すべてのデータはサーバー側で取得され、3,600 秒ごとに再検証されます。各ポケモン画面にソース帰属が表示されます。

## 設定

アプリは少数の環境変数を読み取ります。ローカル開発で必須の変数はありません。

| 変数                                | 既定値                         | 目的                                          |
| ----------------------------------- | ------------------------------ | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`               | `https://primedex.vercel.app`  | サイトの正規 URL                              |
| `NEXT_PUBLIC_ENABLE_AGENTATION`     | _(未設定)_                     | Agentation 開発ツールバーの切り替え          |

## スクリプト

| コマンド                                | 説明                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                           | webpack で `:3000` の開発サーバーを起動。                  |
| `npm run build`                         | 本番ビルドを実行。                                         |
| `npm run start`                         | 本番ビルドを起動。                                         |
| `npm run lint`                          | プロジェクトの flat config で ESLint v9 を実行。           |
| `npm run typecheck`                     | プロジェクト全体で `tsc --noEmit` を実行。                 |
| `npm run test`                          | Vitest (jsdom) — `vitest.config.ts` を参照。               |
| `npx vitest path/to/file.test.ts`       | 単一のテストファイルを実行。                               |
| `npx vitest --ui`                       | Vitest の UI を起動。                                       |

> [!NOTE]
> テストを追加する前に `src/test/setup.ts` が存在することを確認してください。Vitest の config は既にそこを指していますが、現状はスタブです。これがないと `npm run test` は起動できません。

## プロジェクト構成

```
src/
├── app/                # Next.js App Router — ルートはここに配置
│   ├── api/            # ルートハンドラ (TCG)
│   ├── [locale]        # ロケールプレフィックス付きルート
│   ├── layout.tsx      # ルートレイアウト (RSC)
│   ├── providers.tsx   # TanStack Query、テーマ、i18n プロバイダ
│   └── ...
├── components/         # 再利用可能な UI (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # 純粋な TS ヘルパー + API バレル
│   ├── api/            # REST + GraphQL + TCG クライアント
│   ├── i18n/           # 言語バンドル (クライアントでは遅延読み込み)
│   ├── server-i18n.ts  # サーバーサイド翻訳
│   └── ...
├── store/primedex.ts   # Zustand ストア (ID とプリミティブ値のみ)
├── types/pokemon.ts    # ドメインタイプの単一の真実
├── hooks/              # カスタム React フック
└── middleware.ts       # ロケール 308 リダイレクトとリライト

public/                 # 静的アセット (アイコン、スクリーンショット、スプライトのフォールバック)
```

## デプロイ

PrimeDex は標準的な Next.js 16 アプリであり、Next.js の standalone 出力に対応する任意のプラットフォームにデプロイできます。

### Vercel (推奨)

リポジトリには最小構成の `vercel.json` (`{"name": "poke-app"}`) が含まれています。Vercel でプロジェクトをインポートし、フレームワークのデフォルトを受け入れれば、本番ビルドがそのまま動作します。`/pokemon/[name]` の `revalidate = 3600` 設定は自動的に尊重されます。

### その他のプラットフォーム

```bash
npm run build
npm run start  # 本番サーバーを :3000 で起動
```

ホストが Next.js の Image Optimization API をサポートしていることを確認してください (または事前に画像を CDN にレンダリングしておきます)。

## コントリビュート

Issue、機能リクエスト、Pull Request を歓迎します。些細ではない変更の場合は、まず Issue を開いて方針を議論させてください。

Pull Request を提出する際は:

- ローカルで `npm run lint` と `npm run typecheck` を実行してください。
- 動作変更時はテストを追加または更新してください。
- [`AGENTS.md`](./AGENTS.md) および各サブツリーの `AGENT.md` の規約に従ってください。

## 謝辞

- [PokéAPI](https://pokeapi.co) — ポケモンフランチャイズの正規のオープンデータソース。
- [TCGdex](https://www.tcgdex.net) — カードブラウザで使われているオープンな TCG カタログ。
- [Vercel](https://vercel.com) — ホスティングとエッジネットワーク。
- [shadcn/ui](https://ui.shadcn.com) — デザインシステムを固定する `base-nova` プリセット。

## お問い合わせ

- Issue: <https://github.com/teefloo/Poke/issues>
- セキュリティ報告: [`.well-known/security.txt`](./public/.well-known/security.txt) を参照
- 作者: Esteban Deloge (<contact@primedex.app>)

## 商標

ポケモン、ポケモンのキャラクター名および関連する権利物は Nintendo、Game Freak、The Pokémon Company の商標です。PrimeDex は教育および娯楽のみを目的とする非公認のファンプロジェクトであり、これらのいずれの組織とも提携、推奨、後援の関係にはありません。
