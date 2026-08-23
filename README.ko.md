<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Lunidex 로고" width="80" />

# Lunidex

**플레이어, 트레이너, TCG 컬렉터를 위한 집중형 포켓몬 워크스페이스.**

[![온라인 앱](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[온라인 앱](https://lunidex.app) · [저장소](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[개요](#개요) · [기능](#기능) · [빠른 시작](#빠른-시작) · [구성](#구성) · [아키텍처](#아키텍처) · [배포](#배포)

<img src="./public/screenshot-desktop.png" alt="Lunidex 데스크톱 포켓몬 도감 및 컬렉션 대시보드" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · **한국어** · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 개요

Lunidex는 npm workspaces를 사용하는 독립적인 오픈 소스 모노레포입니다. 포켓몬 도감, 포켓몬 참고 도구, 팀 구성 도구, Pokémon TCG 카탈로그, 계정 기반 개인 워크스페이스를 하나로 제공합니다.

웹 앱은 **9개 세대의 포켓몬 1,025종**을 다루며 영어, 프랑스어, 스페인어, 독일어, 이탈리아어, 일본어, 한국어, 중국어 간체 등 8개 인터페이스 언어를 지원합니다. 포르투갈어는 번역된 README로 제공되지만 웹 UI 언어에는 포함되지 않습니다.

공개 참고 페이지는 계정 없이 사용할 수 있습니다. 개인 워크스페이스(즐겨찾기, 포획한 포켓몬, 팀, 퀴즈 진행도, TCG 컬렉션, 위시리스트, 저장된 검색, 메모, 덱 등)는 Neon Auth와 Neon PostgreSQL을 설정하고 동기화할 때 사용할 수 있습니다. 웹 표시 설정은 IndexedDB에 저장하고 Expo 앱은 AsyncStorage를 사용합니다.

> [!NOTE]
> Lunidex는 독립적인 비공식 비상업 팬 프로젝트입니다. 포켓몬 데이터, 이름, 캐릭터, 이미지는 Nintendo, Game Freak, Creatures 및 The Pokémon Company에 귀속됩니다. Lunidex는 이 회사들과 제휴하거나 승인을 받은 프로젝트가 아닙니다.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Lunidex 모바일 포켓몬 도감 화면" width="280" />
</div>

## 기능

| 영역 | 할 수 있는 일 |
| --- | --- |
| **포켓몬 도감 및 참고 자료** | 1,025종의 포켓몬을 탐색하고 필터링하며 능력치, 타입, 특성, 기술, 진화, 폼, 출현 장소, 스프라이트, 현지화된 종족 데이터를 확인합니다. 기술, 특성, 도구도 검색할 수 있습니다. |
| **팀 및 배틀 랩** | 최대 6마리로 팀을 만들고 타입·기술 커버리지, 시너지, 역할을 분석합니다. 최대 3마리 비교, 18타입 상성표, EV/IV 계획, 교배 계산, 9세대 배틀 시뮬레이터를 제공합니다. |
| **진행도와 게임** | 즐겨찾기, 포획한 포켓몬, Living Dex, 활동, 배지, 퀴즈 통계를 관리합니다. 3가지 챌린지와 3가지 게임 모드(일일 플레이 포함)로 퀴즈를 즐기고 Nuzlocke 진행도 기록할 수 있습니다. |
| **공유 및 소셜 기능** | Showdown 팀을 가져오고 내보내며, 읽기 전용 팀 링크를 공유하고, 공개 프로필을 만들고, 친구를 관리하고, 퀴즈 순위표와 계정 기반 배틀룸을 이용합니다. |
| **Pokémon TCG 워크스페이스** | 카드와 세트를 탐색하고 카탈로그를 필터링하며 카드를 비교합니다. 보유 카드와 원하는 카드, 세트 진행도, 저장된 검색과 메모, 덱을 관리하고 TCGdex가 제공하는 경우 가격 필드도 표시합니다. |
| **PWA 및 저장** | 웹 앱을 PWA로 설치할 수 있습니다. Service Worker가 앱 셸과 일부 외부 리소스를 캐시해 재방문 안정성을 높이며, 계정 데이터는 서버 API 뒤에서 관리됩니다. |
| **모바일 컴패니언** | `@primedex/core`의 공통 API 클라이언트, 타입, Zustand 상태, 저장 계약, 번역, Neon 헬퍼를 사용해 iOS, Android, 웹에서 Expo 앱을 실행합니다. |

## 앱 둘러보기

`en`을 지원 언어로 바꿔 사용하세요: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`.

| 화면 | 경로 |
| --- | --- |
| 홈 | [`/en`](https://lunidex.app/en) |
| 포켓몬 도감 | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| 포켓몬 상세 | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| 팀 빌더 | [`/en/team`](https://lunidex.app/en/team) |
| 타입 상성표 | [`/en/types`](https://lunidex.app/en/types) |
| 퀴즈 | [`/en/quiz`](https://lunidex.app/en/quiz) |
| 배틀 시뮬레이터 | [`/en/battle`](https://lunidex.app/en/battle) |
| TCG 카탈로그 | [`/en/tcg`](https://lunidex.app/en/tcg) |
| TCG 컬렉션 | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| 대시보드 | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

컬렉션, 대시보드, 소셜 기능 및 기타 개인 화면에는 인증된 동기화 세션이 필요할 수 있습니다.

## 빠른 시작

### 사전 요구 사항

- [Node.js](https://nodejs.org/) 22
- npm 및 커밋된 `package-lock.json`
- [Git](https://git-scm.com/)

저장소를 클론하고 workspace를 설치한 뒤 웹 앱을 실행합니다.

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000)을 엽니다. 로케일 프록시는 `primedex-lang` 쿠키 또는 브라우저 언어를 사용해 접두사가 없는 URL을 `/ko`와 같은 지원 언어 경로로 리디렉션합니다.

> [!IMPORTANT]
> 개발 및 프로덕션 빌드는 의도적으로 webpack을 사용합니다. `npm run dev`는 `next dev --webpack`, `npm run build`는 `next build --webpack`을 실행합니다. Next.js 설정에 Turbopack root도 선언되어 있지만 이 옵션을 유지하세요.

## 모바일 앱

Expo 컴패니언은 [`apps/mobile`](./apps/mobile)에 있습니다. 현재 도감 목록과 검색, 상세 화면, 즐겨찾기, 팀, 계정, 테마, 언어 설정을 포함합니다. 아직 웹의 전체 기능과 동일하지 않으며 나머지 도구는 Next.js 앱에서 이용할 수 있습니다.

저장소 루트에서 실행합니다.

```bash
npm run start --workspace=@primedex/mobile
```

Expo 메뉴에서 iOS, Android 또는 웹 미리보기를 열 수 있습니다. 패키지는 `android`, `ios`, `web` 스크립트도 제공합니다.

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

Expo 전용 환경 변수와 아키텍처 설명은 [모바일 README](./apps/mobile/README.md)를 참고하세요.

## 구성

공개 참고 페이지를 보는 데 환경 변수는 필요하지 않습니다. 계정, 서버, 문의, 알림 또는 개발용 선택적 통합을 활성화할 때 템플릿을 복사하세요.

```bash
cp .env.example .env.local
```

Expo 앱에서는 `apps/mobile/.env.example`을 템플릿으로 사용합니다.

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| 변수 | 범위 | 용도 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / 공개 | 정식 사이트 및 API 기본 URL. 기본값은 `https://lunidex.app`입니다. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / 공개 | 브라우저 클라이언트가 사용하는 Neon Auth 엔드포인트. |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | 서버 전용 | Neon Auth 프록시 및 JWT 검증 엔드포인트. |
| `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWT_ISSUER`, `NEON_AUTH_JWT_AUDIENCE` | 서버 전용 | 인증 쿠키 보호 및 JWT 검증 조건. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | 서버 전용 | Neon PostgreSQL 연결. Vercel의 Neon 통합은 `DATABASE_URL`을 제공하며 로컬에서는 `NEON_DATABASE_URL`을 사용할 수 있습니다. |
| `EXPO_PUBLIC_NEON_AUTH_URL`, `EXPO_PUBLIC_APP_URL` | 모바일 / 공개 | Expo가 사용하는 Neon Auth 및 배포된 앱 엔드포인트. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / 공개 | 선택적인 Google Search Console 인증 값. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | 개발 | `true`일 때 Agentation UI 리뷰 오버레이 활성화. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / 공개 | 선택적인 브라우저 Push 구독 키. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | 서버 전용 | 선택적인 서버 측 Push 전송 설정. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | 서버 전용 | Resend를 통한 선택적인 문의 폼 이메일 전송. |
| `SUPABASE_DB_URL` | 마이그레이션 전용 | 보존된 Supabase-to-Neon export 스크립트가 사용하는 원본 연결. Web 또는 모바일 runtime 변수로 사용하지 마세요. |

> [!WARNING]
> 연결 문자열, JWKS 설정, 쿠키 시크릿, VAPID 개인 키, Resend 키, 마이그레이션 URL을 `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, 소스 파일, 로그 또는 커밋에 노출하지 마세요.

<details>
<summary><strong>개발에서 Agentation 활성화</strong></summary>

`.env.local`에 다음 값을 추가하고 개발 서버를 다시 시작합니다.

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

도구는 `http://localhost:4747`을 사용하며 개발 Origin과 CSP 지원은 이미 구성되어 있습니다.

</details>

## 스크립트

저장소 루트에서 root 명령을 실행하세요.

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Next.js 개발 서버를 시작합니다. |
| `npm run build` | 프로덕션 빌드를 생성합니다. |
| `npm run start` | 프로덕션 빌드를 제공합니다. |
| `npm run lint` | Web, core, mobile 소스를 lint합니다. |
| `npm run typecheck` | Web workspace의 타입을 확인합니다. |
| `npm run test -- --run` | Vitest 전체 테스트를 한 번 실행합니다. |
| `npx vitest run path/to/file.test.ts` | 특정 테스트 파일을 실행합니다. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | `@primedex/core`의 타입을 확인합니다. |
| `npm run typecheck --workspace=@primedex/mobile` | Expo 앱의 타입을 확인합니다. |
| `npm run lint --workspace=@primedex/mobile` | Expo 앱을 lint합니다. |
| `npm run db:neon:export` | 보존된 원본 데이터를 마이그레이션용으로 export합니다. |
| `npm run db:neon:import` | Neon 스키마를 적용하고 준비된 export를 import합니다. |
| `npm run db:neon:verify` | 원본과 Neon 마이그레이션 결과를 비교합니다. |

> [!WARNING]
> Neon import 및 verify 명령은 외부 데이터베이스에 접근합니다. 먼저 [`neon/AGENTS.md`](./neon/AGENTS.md)와 [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md)를 읽고 승인된 테스트 또는 staging 대상을 사용하세요.

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml)의 CI workflow는 의존성 설치, lint, Web/core 타입 검사, 테스트, 프로덕션 빌드, 모바일 타입 검사를 실행합니다.

## 아키텍처

```text
.
├── src/                 Next.js 16 / React 19 Web 애플리케이션
├── packages/core/       @primedex/core: 공통 API 클라이언트, 타입, store, i18n, helper
├── apps/mobile/         @primedex/mobile Expo Router 컴패니언
├── neon/migrations/     활성 Neon PostgreSQL 애플리케이션 스키마
├── supabase/            보존된 원본 마이그레이션 및 호환성 자료
├── scripts/neon/        관리되는 export, import, verify 스크립트
├── public/              PWA 아이콘, 스크린샷, 카드 리소스, 정적 파일
└── docs/                제품, 디자인, 마이그레이션, 감사, 구현 문서
```

```text
Web (Next.js App Router)
  ├── 서버 및 클라이언트 라우트 컴포넌트
  ├── TanStack Query ──▶ 공통 API 클라이언트 ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ IndexedDB 표시 설정
  └── Route Handlers ──▶ Neon Auth + Neon PostgreSQL 사용자 워크스페이스

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + 설정된 경우 Neon Auth/API
```

주요 경계:

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI, Framer Motion, TanStack Query, PWA 계층.
- **공유 core:** UI와 분리된 도메인 타입, API 클라이언트, Zustand store, i18n 번들, Neon helper, 순수 유틸리티를 Web과 모바일이 공유합니다.
- **데이터 접근:** 외부 요청은 `src/lib/api`와 `packages/core/src/api`의 중앙 API façade를 통하며 프레젠테이션 컴포넌트는 별도의 API 클라이언트를 만들지 않습니다.
- **저장:** Web 표시 설정은 IndexedDB와 브라우저 fallback을 사용하고 네이티브 저장은 AsyncStorage를 사용합니다. 인증된 워크스페이스 데이터는 Neon API로 동기화되어 `user_state`에 저장됩니다.
- **플랫폼 경계:** 대응하는 `*.ts` 및 `*.native.ts` adapter가 도메인 로직을 복제하지 않고 브라우저와 React Native의 저장소/설정을 분리합니다.
- **현지화:** 로케일 접두사 라우트와 번역 번들은 `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`를 지원합니다.

> [!IMPORTANT]
> 표시 제품명은 Lunidex이지만 `primedex`, `@primedex/core`, `@primedex/mobile`, `usePrimeDexStore`, 저장소 키, 라우트 slug, Expo scheme, bundle identifier는 호환성이 중요한 역사적 식별자입니다. 의도적인 마이그레이션 없이 변경하지 마세요.

## 데이터 소스 및 출처

| 소스 | 용도 |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST 및 GraphQL | 포켓몬, 종 텍스트, 능력치, 타입, 기술, 특성, 진화, 출현 정보, 현지화된 이름. |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | 포켓몬과 도구 스프라이트 및 관련 이미지 리소스. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG 카드, 세트, 레어도, 이미지, 카탈로그 필드, 제공되는 경우 가격 필드. |
| [Neon](https://neon.com/) | 선택적 인증, PostgreSQL 사용자 상태, 프로필, 친구, 순위표, 배틀룸, 서버 기반 워크스페이스 기능. |

외부 소스의 제공 여부, 현지화 범위, 이미지 및 가격 필드는 변경될 수 있습니다. Lunidex는 카드 마켓플레이스가 아니며 시장 가치나 가격 이력의 완전한 제공을 보장하지 않습니다.

소스 코드는 [`LICENSE`](./LICENSE)의 MIT 라이선스로 배포됩니다. 포켓몬 지식재산권과 제3자 데이터는 각 권리자와 조건의 적용을 받습니다.

## 배포

Lunidex는 [Vercel](https://vercel.com/)에 맞게 구성되어 있으며 Next.js 서버 runtime과 이미지 최적화를 지원하는 호스트에서도 실행할 수 있습니다.

```bash
npm run build
npm run start
```

Vercel에서는:

1. `teefloo/Lunidex`를 Vercel 프로젝트로 가져옵니다.
2. Preview 및 Production에 Neon Auth 값과 서버 전용 데이터베이스 연결을 설정합니다.
3. 표준 Next.js build 설정을 사용합니다. 커밋된 [`vercel.json`](./vercel.json)은 의도적으로 최소 구성입니다.

현재 Web runtime은 Neon을 사용합니다. 보존된 Supabase 마이그레이션과 관리형 마이그레이션 스크립트는 비교, 백업, 마이그레이션 작업을 위한 것이며 Web 앱의 인증 또는 데이터베이스 runtime이 아닙니다.

스키마, 환경 경계, 검증 절차는 [Neon 마이그레이션 runbook](./docs/neon-migration.md)을 참고하세요.

## 관련 문서

- [모바일 설정 및 기능 범위](./apps/mobile/README.md)
- [제품 컨텍스트](./PRODUCT.md)
- [디자인 시스템](./DESIGN.md)
- [Neon 마이그레이션 runbook](./docs/neon-migration.md)
- [GitHub Issues](https://github.com/teefloo/Lunidex/issues)
