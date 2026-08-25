<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Lunidex ロゴ" width="80" />

# Lunidex

**プレイヤー、トレーナー、TCGコレクターのためのポケモンワークスペース。**

[![公開サイト](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[公開サイト](https://lunidex.app) · [リポジトリ](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[概要](#概要) · [機能](#機能) · [クイックスタート](#クイックスタート) · [設定](#設定) · [アーキテクチャ](#アーキテクチャ) · [デプロイ](#デプロイ)

<img src="./public/screenshot-desktop.png" alt="Lunidex のデスクトップ版ポケモン図鑑とコレクションダッシュボード" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · **日本語** · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 概要

Lunidex は、npm workspaces を使った独立したオープンソースのモノレポです。ポケモン図鑑、ポケモンのリファレンスツール、チーム作成ツール、ポケモン TCG カタログ、アカウントに紐づく個人ワークスペースを一つにまとめています。

Web アプリには **9 世代・1,025 種のポケモン**が収録され、英語、フランス語、スペイン語、ドイツ語、イタリア語、日本語、韓国語、簡体字中国語の 8 言語に対応しています。ポルトガル語は翻訳版 README として提供されていますが、Web UI の対応言語ではありません。

公開リファレンスページはアカウントなしで利用できます。個人ワークスペース（お気に入り、捕獲したポケモン、チーム、クイズの進捗、TCG コレクション、ほしいカード、保存した検索、メモ、デッキなど）は、Neon Auth と Neon PostgreSQL を設定して同期すると利用できます。Web の表示設定には IndexedDB、Expo アプリには AsyncStorage を使用します。

> [!NOTE]
> Lunidex は独立した非公式のファンプロジェクトです。ポケモンのキャラクター名、商標、イラスト、画像および関連する知的財産は、それぞれの権利者に帰属します。Lunidex は Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokémon Company と提携・承認・スポンサー関係になく、公式に関連するものでもありません。

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Lunidex モバイル版ポケモン図鑑" width="280" />
</div>

## 機能

| 分野 | できること |
| --- | --- |
| **ポケモン図鑑とリファレンス** | 1,025 種すべてを閲覧・絞り込み。種族値、タイプ、特性、技、進化、フォルム、出現場所、スプライト、各言語の種族データを確認できます。技、特性、道具も検索できます。 |
| **チーム・バトルラボ** | 最大 6 匹のチームを作成し、タイプと技のカバー範囲、シナジー、役割を分析できます。最大 3 匹の比較、18 タイプの相性表、EV/IV 計画、育成計算、第 9 世代バトルシミュレーターに対応しています。 |
| **進捗とゲーム** | お気に入り、捕獲済みポケモン、Living Dex、アクティビティ、バッジ、クイズ統計を管理できます。3 種類のチャレンジと 3 種類のゲームモード（デイリーを含む）で遊び、Nuzlocke の進行も記録できます。 |
| **共有とソーシャル機能** | Showdown チームのインポート/エクスポート、読み取り専用のチームリンク共有、公開プロフィール、フレンド管理、クイズランキング、アカウントに紐づくバトルルームを利用できます。 |
| **ポケモン TCG ワークスペース** | カードとセットの閲覧、カタログの絞り込み、カード比較、所持カードとほしいカードの管理、セット進捗の確認、検索とメモの保存、デッキ作成ができます。TCGdex が提供する場合は価格項目も表示します。 |
| **PWA と永続化** | Web アプリを PWA としてインストールできます。Service Worker はアプリシェルと一部の外部リソースをキャッシュし、再訪時の安定性を高めます。アカウントデータはサーバー API の背後で管理されます。 |
| **モバイルコンパニオン** | `@primedex/core` の共通 API クライアント、型、Zustand 状態、永続化契約、翻訳、Neon ヘルパーを使い、iOS、Android、Web で Expo アプリを利用できます。 |

## アプリを探索

`en` を対応言語に置き換えてください: `en`、`fr`、`es`、`de`、`it`、`ja`、`ko`、`zh`。

| 画面 | ルート |
| --- | --- |
| ホーム | [`/en`](https://lunidex.app/en) |
| ポケモン図鑑 | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| ポケモン詳細 | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| チームビルダー | [`/en/team`](https://lunidex.app/en/team) |
| タイプ相性表 | [`/en/types`](https://lunidex.app/en/types) |
| クイズ | [`/en/quiz`](https://lunidex.app/en/quiz) |
| バトルシミュレーター | [`/en/battle`](https://lunidex.app/en/battle) |
| TCG カタログ | [`/en/tcg`](https://lunidex.app/en/tcg) |
| TCG コレクション | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| ダッシュボード | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

コレクション、ダッシュボード、ソーシャル機能などの個人向け画面では、認証済みの同期セッションが必要になる場合があります。

## クイックスタート

### 前提条件

- [Node.js](https://nodejs.org/) 22
- npm とコミット済みの `package-lock.json`
- [Git](https://git-scm.com/)

リポジトリをクローンし、workspace をインストールして Web アプリを起動します。

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いてください。ロケールプロキシは、`primedex-lang` Cookie またはブラウザーの言語を使い、プレフィックスのない URL を `/ja` などの対応言語へリダイレクトします。

> [!IMPORTANT]
> 開発・本番ビルドでは意図的に webpack を使用します。`npm run dev` は `next dev --webpack`、`npm run build` は `next build --webpack` を実行します。Next.js 設定に Turbopack の root も記載されていますが、このオプションを保持してください。

## モバイルアプリ

Expo コンパニオンは [`apps/mobile`](./apps/mobile) にあります。現在は図鑑の一覧・検索、詳細ページ、お気に入り、チーム、アカウント、テーマ、言語設定を搭載しています。Web の全機能にはまだ対応していないため、その他のツールは Next.js アプリで利用してください。

リポジトリのルートから起動します。

```bash
npm run start --workspace=@primedex/mobile
```

Expo のメニューから iOS、Android、Web プレビューを開けます。パッケージには `android`、`ios`、`web` スクリプトもあります。

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

Expo 固有の環境変数とアーキテクチャについては、[モバイル README](./apps/mobile/README.md) を参照してください。

## 設定

公開リファレンスページの閲覧に環境変数は必要ありません。アカウント、サーバー、問い合わせ、通知、開発用のオプション機能を有効にする場合は、テンプレートをコピーしてください。

```bash
cp .env.example .env.local
```

Expo アプリでは `apps/mobile/.env.example` をテンプレートにします。

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| 変数 | 範囲 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / 公開 | 正規サイト URL と API のベース URL。既定値は `https://lunidex.app`。 |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / 公開 | ブラウザクライアントが使用する Neon Auth エンドポイント。 |
| `NEON_AUTH_BASE_URL`、`NEON_AUTH_JWKS_URL` | サーバー専用 | Neon Auth プロキシと JWT 検証のエンドポイント。 |
| `NEON_AUTH_COOKIE_SECRET`、`NEON_AUTH_JWT_ISSUER`、`NEON_AUTH_JWT_AUDIENCE` | サーバー専用 | Auth Cookie の保護と JWT 検証条件。 |
| `NEON_DATABASE_URL` / `DATABASE_URL` | サーバー専用 | Neon PostgreSQL 接続。Vercel の Neon 連携は `DATABASE_URL` を提供し、ローカルでは `NEON_DATABASE_URL` を使用できます。 |
| `EXPO_PUBLIC_NEON_AUTH_URL`、`EXPO_PUBLIC_APP_URL` | モバイル / 公開 | Expo が使用する Neon Auth とデプロイ済みアプリのエンドポイント。 |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / 公開 | Google Search Console の任意の検証値。 |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | 開発 | `true` のとき Agentation UI レビューオーバーレイを有効化。 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / 公開 | ブラウザーの Push 購読用の任意の公開キー。 |
| `VAPID_PRIVATE_KEY`、`VAPID_SUBJECT` | サーバー専用 | サーバー側の Push 配信設定（任意）。 |
| `RESEND_API_KEY`、`CONTACT_TO_EMAIL`、`CONTACT_FROM_EMAIL` | サーバー専用 | Resend を使う問い合わせフォーム送信（任意）。 |
| `SUPABASE_DB_URL` | マイグレーション専用 | 保持された Supabase から Neon への export スクリプトが使う接続。Web やモバイルの runtime 変数にはしないでください。 |

> [!WARNING]
> 接続文字列、JWKS 設定、Cookie Secret、VAPID の秘密情報、Resend キー、マイグレーション URL を `NEXT_PUBLIC_*`、`EXPO_PUBLIC_*`、ソースファイル、ログ、コミットから公開しないでください。

<details>
<summary><strong>開発中に Agentation を有効にする</strong></summary>

`.env.local` に次の値を追加して、開発サーバーを再起動します。

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

ツールは `http://localhost:4747` を使用します。開発用 Origin と CSP の設定はすでに用意されています。

</details>

## スクリプト

リポジトリのルートから root コマンドを実行します。

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | Next.js 開発サーバーを起動。 |
| `npm run build` | 本番ビルドを作成。 |
| `npm run start` | 本番ビルドを配信。 |
| `npm run lint` | Web、core、mobile のソースを lint。 |
| `npm run typecheck` | Web workspace の型を確認。 |
| `npm run test -- --run` | Vitest スイートを一度実行。 |
| `npx vitest run path/to/file.test.ts` | 指定したテストファイルを実行。 |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | `@primedex/core` の型を確認。 |
| `npm run typecheck --workspace=@primedex/mobile` | Expo アプリの型を確認。 |
| `npm run lint --workspace=@primedex/mobile` | Expo アプリを lint。 |
| `npm run db:neon:export` | 保持されたソースデータをマイグレーション用に export。 |
| `npm run db:neon:import` | Neon スキーマを適用し、準備済みの export を import。 |
| `npm run db:neon:verify` | ソースと Neon マイグレーション結果を比較。 |

> [!WARNING]
> Neon の import と verify コマンドは外部データベースにアクセスします。事前に [`neon/AGENTS.md`](./neon/AGENTS.md) と [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md) を読み、承認済みのテストまたは staging 用ターゲットを使用してください。

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) の CI workflow は、依存関係のインストール、lint、Web/core の型チェック、テスト、本番ビルド、モバイルの型チェックを実行します。

## アーキテクチャ

```text
.
├── src/                 Next.js 16 / React 19 Web アプリケーション
├── packages/core/       @primedex/core: 共通 API、型、store、i18n、helper
├── apps/mobile/         @primedex/mobile Expo Router コンパニオン
├── neon/migrations/     稼働中の Neon PostgreSQL アプリケーションスキーマ
├── supabase/            保持されたソースマイグレーションと互換性用資料
├── scripts/neon/        管理された export、import、verify スクリプト
├── public/              PWA アイコン、スクリーンショット、カード素材、静的ファイル
└── docs/                プロダクト、デザイン、移行、監査、実装ノート
```

```text
Web (Next.js App Router)
  ├── サーバーおよびクライアントのルートコンポーネント
  ├── TanStack Query ──▶ 共通 API クライアント ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ IndexedDB の表示設定
  └── Route Handlers ──▶ Neon Auth + Neon PostgreSQL のユーザーワークスペース

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + 設定時の Neon Auth/API
```

主な境界:

- **Web:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Base UI、Framer Motion、TanStack Query、PWA レイヤー。
- **共通 core:** UI に依存しないドメイン型、API クライアント、Zustand store、i18n bundle、Neon helper、純粋なユーティリティを Web と mobile で共有します。
- **データアクセス:** 外部リクエストは `src/lib/api` と `packages/core/src/api` の中央 API façade を通り、表示コンポーネントが個別の API クライアントを追加することはありません。
- **永続化:** Web の表示設定は IndexedDB とブラウザーの fallback、ネイティブは AsyncStorage を使用します。認証済みワークスペースは Neon API 経由で同期され、`user_state` に保存されます。
- **プラットフォーム境界:** 対応する `*.ts` と `*.native.ts` の adapter によって、ドメインロジックを複製せずにブラウザーと React Native の storage/configuration を分離します。
- **ローカライズ:** ロケール付きルートと翻訳 bundle は `en`、`fr`、`es`、`de`、`it`、`ja`、`ko`、`zh` に対応します。

> [!IMPORTANT]
> 表示上の製品名は Lunidex ですが、`primedex`、`@primedex/core`、`@primedex/mobile`、`usePrimeDexStore`、storage key、route slug、Expo scheme、bundle identifier は互換性に関わる歴史的な識別子です。意図的な移行なしに変更しないでください。

## データソースと帰属

| ソース | 用途 |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST / GraphQL | ポケモン、種族テキスト、種族値、タイプ、技、特性、進化、出現場所、各言語の名前。 |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | ポケモンと道具のスプライトおよび関連する画像素材。 |
| [TCGdex](https://www.tcgdex.net/) | ポケモン TCG のカード、セット、レアリティ、画像、カタログ項目、提供される場合の価格項目。 |
| [Neon](https://neon.com/) | 任意の認証、PostgreSQL のユーザーデータ、プロフィール、フレンド、ランキング、バトルルーム、サーバー側ワークスペース機能。 |

外部ソースの提供状況、翻訳範囲、画像、価格項目は変わる可能性があります。Lunidex はカードマーケットプレイスではなく、市場価値や価格履歴の完全な提供を保証しません。

ソースコードは [`LICENSE`](./LICENSE) の MIT ライセンスで配布されています。ポケモンの知的財産と第三者データは、それぞれの権利者と利用条件に従います。

## デプロイ

Lunidex は [Vercel](https://vercel.com/) 向けに設定されており、Next.js のサーバーランタイムと画像最適化に対応するホストでも実行できます。

```bash
npm run build
npm run start
```

Vercel では:

1. `teefloo/Lunidex` を Vercel プロジェクトに import します。
2. Preview と Production に Neon Auth の値とサーバー専用データベース接続を設定します。
3. 標準の Next.js build 設定を使用します。コミット済みの [`vercel.json`](./vercel.json) は意図的に最小構成です。

現在の Web runtime は Neon を使用します。保持された Supabase の migration と管理用 migration script は比較、バックアップ、移行作業のために存在し、Web アプリの認証・データベース runtime ではありません。

スキーマ、環境変数の境界、検証手順については [Neon 移行 runbook](./docs/neon-migration.md) を参照してください。

## 関連ドキュメント

- [モバイルのセットアップと対応状況](./apps/mobile/README.md)
- [プロダクトコンテキスト](./PRODUCT.md)
- [デザインシステム](./DESIGN.md)
- [Neon 移行 runbook](./docs/neon-migration.md)
- [GitHub Issues](https://github.com/teefloo/Lunidex/issues)
