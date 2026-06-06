<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex 로고" align="center" width="80" />

# PrimeDex

**속도, 데이터, 디자인에 진심인 트레이너를 위한 가장 완전한 온라인 포켓몬 도감.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

Next.js 16 + React 19 기반의 고성능 대시보드로, 전국 포켓몬 도감 전체를 다룹니다. 스탯, 타입, 진화, 팀 빌더, TCG 카드, 퀴즈까지 9개 언어로 제공됩니다.

[개요](#개요) · [기능](#기능) · [빠른 시작](#빠른-시작) · [경로](#경로) · [아키텍처](#아키텍처) · [데이터 소스](#데이터-소스) · [배포](#배포)

![PrimeDex — 데스크톱 미리보기](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · **한국어** · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 개요

PrimeDex는 경쟁 플레이어, TCG 수집가, 호기심 많은 팬을 위한 오픈소스 포켓몬 도감 대시보드입니다. 9개 세대에 걸친 **1,025마리**의 포켓몬을 모두 다루며, 9개 언어로 로컬라이즈된 이름, 스탯 나란히 비교, 타입 커버리지 기반 팀 빌더, 25,000장 이상의 TCG 카탈로그를 제공합니다.

앱은 공식 [PokéAPI](https://pokeapi.co) (REST + GraphQL) 및 [TCGdex](https://www.tcgdex.net)를 기반으로 하며, 캐싱은 TanStack Query, 영구 UI 상태는 Zustand (IndexedDB), 서버 컴포넌트와 경로별 정적 생성은 Next.js App Router를 사용합니다.

> [!NOTE]
> 비상업적 팬 프로젝트입니다. 포켓몬 데이터, 이름, 이미지는 © Nintendo, Game Freak, The Pokémon Company에 귀속됩니다.

## 기능

- **전국 포켓몬 도감 완전판** — 1,025마리 모두, 모든 폼, 모든 세대를 로컬라이즈된 이름과 설명 텍스트와 함께 제공.
- **팀 빌더** — 6마리 파티를 구성하고 실시간 타입 커버리지 분석, 공통 약점 감지, 시너지 점수를 확인.
- **비교 엔진** — 최대 3마리 포켓몬을 나란히 분석하는 인터랙티브 레이더 차트와 종족값 분해.
- **타입표** — 18개 타입의 상성을 인터랙티브하게 제공. 강점, 약점, 저항, 면역을 포함.
- **기술 데이터베이스** — 위력, 명중률, PP, 타입, 분류, 효과 설명으로 필터링 가능.
- **TCG 카탈로그** — 25,000장 이상의 카드를 세트, 레어도, 타입, 단계, HP로 검색 가능. 컬렉션과 위시리스트 추적 지원.
- **퀴즈** — 클래식, 실루엣, 스탯, 타임 어택, 서바이벌, 마라톤의 6가지 모드.
- **리빙덱 트래커** — 포획 현황을 영구적으로 관리. 완전 오프라인, 브라우저에 로컬 저장.
- **9개 언어** — 영어, 프랑스어, 독일어, 스페인어, 이탈리아어, 일본어, 한국어, 간체 중국어, 브라질 포르투갈어.
- **고급 검색** — 세대, 타입, 종족값 합계, 알 그룹, 특수 상태에 대한 다차원 필터링.
- **SEO & AEO 지원** — JSON-LD (`WebApplication`, `ItemList`, `FAQPage`, `HowTo`), `hreflang` 대체, `llms.txt` / `ai.txt` 디스커버리, 생성된 사이트맵.

## 빠른 시작

### 사전 요구 사항

- [Node.js](https://nodejs.org) 20 이상
- npm 10 이상 (Node.js에 동봉)
- POSIX 호환 셸 (스크립트는 `bash` 스타일 호출을 사용)

### 로컬에서 실행

```bash
# 1. 저장소 클론
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. 의존성 설치
npm install

# 3. 개발 서버 시작 (Turbopack이 아닌 webpack 사용)
npm run dev
```

앱이 <http://localhost:3000>에서 실행됩니다. 미들웨어가 `primedex-lang` 쿠키 또는 브라우저의 `Accept-Language` 헤더를 기반으로 `/`을 선호 로케일로 리다이렉트합니다.

> [!IMPORTANT]
> `npm run dev`는 App Router와 `next/dynamic` 경계에서 안정적인 HMR을 위해 `next dev --webpack`으로 고정되어 있습니다. 로컬에서 Turbopack으로 전환하지 마세요. `next.config.ts`의 `turbopack.root` 선언은 의도적인 것이며 유지되어야 합니다.

### Agentation 개발 도구 (선택 사항)

PrimeDex는 AI 기반 UI 리뷰를 위한 [Agentation](https://github.com/tldraw/agentation)을 함께 제공합니다. 활성화하려면 `.env.local`에 다음을 추가하세요:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

툴바는 <http://localhost:4747>에서 제공됩니다 (CSP와 `allowedDevOrigins`는 사전에 연결되어 있음).

## 기술 스택

| 계층            | 도구                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| 프레임워크      | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev)          |
| 언어            | [TypeScript 5](https://www.typescriptlang.org) (strict, 100% 타입 안전)                |
| 스타일링        | [Tailwind CSS v4](https://tailwindcss.com), [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| UI 프리미티브   | [`@base-ui/react`](https://base-ui.com), `shadcn/ui` (`base-nova` 프리셋)              |
| 애니메이션      | [Framer Motion](https://www.framer.com/motion/)                                       |
| 데이터 페칭     | [TanStack Query v5](https://tanstack.com/query)                                       |
| 클라이언트 상태 | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| 차트            | [Recharts](https://recharts.org)                                                      |
| i18n            | [i18next](https://www.i18next.com/) + `react-i18next`                                  |
| HTTP            | [Axios](https://axios-http.com) + `axios-retry` (지수 백오프)                          |
| 툴링            | ESLint v9 (flat config), Vitest + Testing Library, Puppeteer (비주얼 QA)               |

## 경로

모든 경로는 로케일 접두사를 가집니다 (`/en`, `/fr`, `/ja`…). 미들웨어가 308 리다이렉트와 리라이트를 투명하게 처리합니다.

| 경로                          | 설명                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `/`                           | 히어로, 추천 포켓몬, 전체 도감 그리드가 있는 홈.                                      |
| `/pokemon/[name]`             | 스탯, 타입, 진화, 특성, 기술, 빌드를 보여주는 상세 페이지.                            |
| `/team`                       | 실시간 타입 커버리지와 시너지 점수를 제공하는 6슬롯 팀 빌더.                          |
| `/compare`                    | 최대 3마리 포켓몬을 나란히 비교.                                                      |
| `/favorites`                  | 즐겨찾기한 포켓몬의 개인 목록.                                                        |
| `/quiz`                       | 6가지 게임 모드를 지원하는 "이 포켓몬은 누구?" 퀴즈.                                  |
| `/types`                      | 18개 타입의 인터랙티브 타입표.                                                        |
| `/moves`                      | 검색 가능한 기술 데이터베이스.                                                        |
| `/tcg`                        | 세트, 레어도, 타입, HP로 필터링 가능한 포켓몬 TCG 카탈로그.                          |
| `/tcg/cards/[id]`             | 개별 TCG 카드 상세.                                                                   |
| `/tcg/collection`             | 개인 카드 컬렉션 트래커.                                                              |
| `/tcg/wishlist`               | TCG 위시리스트.                                                                       |
| `/about`                      | 프로젝트 소개, 데이터 소스, 연락처.                                                   |
| `/faq`                        | 자주 묻는 질문.                                                                       |
| `/cookies` `/legal` `/privacy` `/terms` | 법적 페이지.                                                                  |

동적 페이지 `/pokemon/[name]`은 처음 151마리 포켓몬에 대해 `generateStaticParams`를 사용하고 `revalidate = 3600`으로 점진적 정적 재생성을 수행합니다.

## 아키텍처

### 데이터 흐름

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Zustand 셀렉터 (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- 모든 HTTP 호출은 `@/lib/api` 배럴을 거치며, 컴포넌트는 `fetch`나 `axios`를 직접 사용하지 않습니다.
- 쿼리 키는 `@/lib/api/keys`에 중앙 집중화되어 안정적인 무효화를 보장합니다.
- Zustand 스토어는 ID와 원시 값(즐겨찾기, 팀, 포켓몬, 필터, 기록, 설정)만 보관하며 IndexedDB에 영구 저장됩니다. 로컬 상태는 `localStorage`에 **저장되지 않습니다**.
- 무거운 컴포넌트(`EvolutionChain`, `AdvancedInfo`, `PokemonCards`)는 `next/dynamic`으로 로드되어 첫 페인트를 가볍게 유지합니다.

### 국제화

- 지원 로케일: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`.
- 클라이언트 코드는 `@/lib/i18n`을 사용하며 언어 번들은 지연 로드됩니다. 영어가 초기 번들입니다.
- 서버 코드는 `@/lib/server-i18n`을 사용하며 SSG/SSR을 위해 모든 번들이 포함되어 있습니다.
- 각 페이지는 `hreflang` 대체와 `/en`을 가리키는 `x-default`를 선언합니다.
- `primedex-lang` 쿠키는 1년간 사용자 환경설정을 유지합니다.

### 성능

- 기본적으로 Server Components. `"use client"`는 인터랙티비가 필요한 말단에만 부여.
- 모든 이미지는 `next/image` (AVIF + WebP)로 제공되며 엄격한 `remotePatterns` 허용 목록 사용.
- `/pokemon/[name]` (처음 151마리) 정적 생성 + 1시간마다 ISR.
- `/_next/static`은 불변 캐시, 이미지는 1일 캐시, `sitemap.xml`과 `llms.txt`는 1시간 캐시.
- TanStack Query 기본값: `staleTime` 10분, `gcTime` 60분, `retry` 1, `refetchOnWindowFocus` 비활성.

### 보안

- 모든 경로에 강화된 헤더: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `preload` 포함 HSTS, 엄격한 `Referrer-Policy`, 잠긴 `Permissions-Policy`.
- 엄격한 Content-Security-Policy가 적용됩니다. 출처: `next.config.ts` 참조.
- Axios 재시도로 일시적인 네트워크 오류와 HTTP 429를 지수 백오프로 처리합니다.

## 데이터 소스

| 출처                                                                       | 용도                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| [PokéAPI](https://pokeapi.co) (REST)                                       | 포켓몬, 기술, 특성, 타입, 조우                       |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                         | 종 이름의 로컬라이즈와 설명 텍스트                   |
| [TCGdex](https://www.tcgdex.net)                                            | 포켓몬 TCG 카드, 세트, 레어도                        |
| [PokeAPI 스프라이트](https://github.com/PokeAPI/sprites)                   | 공식 아트워크와 애니메이션 스프라이트                 |

모든 데이터는 서버 사이드에서 가져오며 3,600초마다 재검증됩니다. 각 포켓몬 페이지에는 출처 표기가 표시됩니다.

## 설정

앱은 소수의 환경 변수를 읽습니다. 로컬 개발에 필요한 변수는 없습니다.

| 변수                                | 기본값                          | 목적                                          |
| ----------------------------------- | ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`               | `https://primedex.vercel.app`   | 사이트 정식 URL                               |
| `NEXT_PUBLIC_ENABLE_AGENTATION`     | _(설정 안 됨)_                  | Agentation 개발 툴바 토글                     |

## 스크립트

| 명령어                                 | 설명                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                          | webpack으로 `:3000`에서 개발 서버 시작.                    |
| `npm run build`                        | 프로덕션 빌드.                                             |
| `npm run start`                        | 프로덕션 빌드 실행.                                        |
| `npm run lint`                         | 프로젝트의 flat config로 ESLint v9 실행.                   |
| `npm run typecheck`                    | 프로젝트 전체에 대해 `tsc --noEmit` 실행.                 |
| `npm run test`                         | Vitest (jsdom) — `vitest.config.ts` 참조.                  |
| `npx vitest path/to/file.test.ts`      | 단일 테스트 파일 실행.                                     |
| `npx vitest --ui`                      | Vitest UI 실행.                                            |

> [!NOTE]
> 테스트를 추가하기 전에 `src/test/setup.ts`가 존재하는지 확인하세요. Vitest 설정은 이미 해당 파일을 가리키고 있지만 현재는 스텁입니다. 이 파일이 없으면 `npm run test`는 시작되지 않습니다.

## 프로젝트 구조

```
src/
├── app/                # Next.js App Router — 경로는 여기에 위치
│   ├── api/            # 라우트 핸들러 (TCG)
│   ├── [locale]        # 로케일 접두사 경로
│   ├── layout.tsx      # 루트 레이아웃 (RSC)
│   ├── providers.tsx   # TanStack Query, 테마, i18n 프로바이더
│   └── ...
├── components/         # 재사용 가능한 UI (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # 순수 TS 헬퍼 + API 배럴
│   ├── api/            # REST + GraphQL + TCG 클라이언트
│   ├── i18n/           # 언어 번들 (클라이언트에서 지연 로드)
│   ├── server-i18n.ts  # 서버 측 번역
│   └── ...
├── store/primedex.ts   # Zustand 스토어 (ID와 원시 값만)
├── types/pokemon.ts    # 도메인 타입의 단일 진실 공급원
├── hooks/              # 커스텀 React 훅
└── middleware.ts       # 로케일 308 리다이렉트와 리라이트

public/                 # 정적 자산 (아이콘, 스크린샷, 스프라이트 폴백)
```

## 배포

PrimeDex는 표준 Next.js 16 앱이며 Next.js의 standalone 출력을 지원하는 모든 플랫폼에 배포할 수 있습니다.

### Vercel (권장)

저장소에는 최소한의 `vercel.json`(`{"name": "poke-app"}`)이 포함되어 있습니다. Vercel에서 프로젝트를 가져오고 프레임워크 기본값을 수락하면 프로덕션 빌드가 바로 동작합니다. `/pokemon/[name]`의 `revalidate = 3600` 설정은 자동으로 적용됩니다.

### 다른 플랫폼

```bash
npm run build
npm run start  # :3000에서 프로덕션 서버
```

호스트가 Next.js Image Optimization API를 지원하는지 확인하세요 (또는 이미지를 CDN에 미리 렌더링).

## 기여하기

이슈, 기능 요청, 풀 리퀘스트를 환영합니다. 사소하지 않은 변경 사항은 먼저 이슈를 열어 접근 방식을 논의해 주세요.

풀 리퀘스트를 제출할 때:

- 로컬에서 `npm run lint`와 `npm run typecheck`을 실행하세요.
- 동작이 바뀌면 테스트를 추가하거나 업데이트하세요.
- [`AGENTS.md`](./AGENTS.md)와 하위 디렉터리의 `AGENT.md` 파일의 규칙을 따르세요.

## 감사의 말

- [PokéAPI](https://pokeapi.co) — 프랜차이즈의 공식 오픈 데이터 소스.
- [TCGdex](https://www.tcgdex.net) — 카드 브라우저에서 사용되는 오픈 TCG 카탈로그.
- [Vercel](https://vercel.com) — 호스팅과 엣지 네트워크.
- [shadcn/ui](https://ui.shadcn.com) — 디자인 시스템의 토대가 되는 `base-nova` 프리셋.

## 연락처

- 이슈: <https://github.com/teefloo/Poke/issues>
- 보안 공개: [`.well-known/security.txt`](./public/.well-known/security.txt) 참조
- 작성자: Esteban Deloge (<contact@primedex.app>)

## 상표

포켓몬, 포켓몬 캐릭터 이름 및 관련 자산은 Nintendo, Game Freak, The Pokémon Company의 상표입니다. PrimeDex는 교육 및 오락 목적의 비공식 팬 프로젝트이며, 이들과 어떤 제휴, 보증, 후원 관계도 없습니다.
