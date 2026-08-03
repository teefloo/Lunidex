<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Lunidex 로고" width="80" />

# Lunidex

**트레이너, 컬렉터, 호기심 많은 팬을 위한 빠른 로컬 우선 포켓몬 도감 및 Pokémon TCG 작업 공간입니다.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[개요](#개요) · [시작하기](#시작하기) · [기능](#기능) · [아키텍처](#아키텍처) · [구성](#구성) · [배포](#배포)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · **한국어** · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## 개요

Lunidex는 Next.js 웹 앱, 공유 TypeScript 패키지 `@primedex/core`, Expo 모바일 컴패니언으로 구성된 오픈 소스 모노레포입니다. 계정 생성 없이 전국도감, 경쟁전 준비 도구, Pokémon TCG 컬렉션 도구, 개인 진행 상황 추적 기능을 한곳에 제공합니다.

웹 앱은 **9세대 1,025마리 포켓몬**을 다룹니다. 인터페이스는 영어, 프랑스어, 스페인어, 독일어, 이탈리아어, 일본어, 한국어, 중국어 간체를 지원하며, 이 저장소에는 포르투갈어 README 번역도 포함되어 있습니다.

> [!NOTE]
> Lunidex는 비상업적 팬 프로젝트입니다. 포켓몬의 데이터, 이름, 이미지는 Nintendo, Game Freak, Creatures 및 The Pokémon Company에 귀속됩니다. Lunidex는 이들 회사와 제휴하거나 보증을 받지 않았습니다.

## 기능

| 영역 | 할 수 있는 일 |
| --- | --- |
| **포켓몬 도감** | 1,025마리를 탐색하고 필터링하며, 능력치, 특성, 기술, 진화, 폼, 출현 장소, 스프라이트, 경쟁전 정보를 확인합니다. |
| **육성 도구** | 6마리 팀을 구성하고 상성을 분석하며, 포켓몬 비교, 타입표 탐색, 노력치·개체값 계획, 교배 확률 계산, 9세대 배틀 시뮬레이션을 할 수 있습니다. |
| **참고 자료** | 기술, 특성, 도구를 검색하고 기술 범위 검사와 카운터 제안을 활용합니다. |
| **개인 진행 상황** | 즐겨찾기, Living Dex, 팀, 최근 본 항목, 퀴즈 통계, 설정을 영구 로컬 저장소에 보관하고 JSON으로 내보내거나 가져옵니다. |
| **게임 모드** | 6가지 모드의 퀴즈를 즐기고, Nuzlocke 런을 기록하며, 읽기 전용 링크로 팀을 공유합니다. |
| **TCG 작업 공간** | 카드와 세트를 찾고, 컬렉션과 위시리스트를 관리하며, 카드를 비교하고, 가격 이력과 알림을 확인하고, 60장 덱을 구성합니다. |
| **오프라인 및 모바일** | PWA를 설치하고 이미 사용한 리소스를 캐시에서 다시 사용할 수 있습니다. Expo 앱은 현재 도감, 상세, 즐겨찾기, 팀, 계정, 테마, 언어를 지원합니다. |

## 시작하기

### 사전 요구 사항

- [Node.js](https://nodejs.org/) 20 이상
- npm 10 이상

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)을 엽니다. Lunidex는 `primedex-lang` 쿠키 또는 브라우저의 `Accept-Language` 헤더를 기준으로 접두사가 없는 URL을 `/ko` 같은 로케일 경로로 리디렉션합니다.

> [!IMPORTANT]
> 개발에서는 의도적으로 webpack을 사용합니다. `npm run dev`는 `next dev --webpack`을 실행합니다. Next 구성에 Turbopack root가 선언되어 있어도 이 명령을 유지하세요.

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 포트 3000에서 Next.js 개발 서버를 시작합니다. |
| `npm run build` | 프로덕션 빌드를 생성합니다. |
| `npm run start` | 프로덕션 빌드를 실행합니다. |
| `npm run lint` | ESLint 9를 실행합니다. |
| `npm run typecheck` | 파일을 만들지 않고 TypeScript를 검사합니다. |
| `npm run test` | jsdom에서 Vitest를 실행합니다. |

### 모바일 앱

Expo 컴패니언은 [`apps/mobile`](./apps/mobile)에 있으며 공유 패키지 [`@primedex/core`](./packages/core)를 사용합니다.

```bash
cd apps/mobile
npx expo start
```

Expo 안내에서 iOS, Android, 웹 또는 Expo Go를 열 수 있습니다. 지원 화면은 [모바일 README](./apps/mobile/README.md)를 참조하세요.

## 구성

로컬에서 도감을 둘러보는 데 환경 변수는 필요하지 않습니다. 선택 기능을 켤 때만 커밋하지 않는 `.env.local`을 만드세요.

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | 표준 공개 URL을 바꿉니다. 기본값은 `https://primedex.vercel.app`입니다. |
| `NEXT_PUBLIC_SUPABASE_URL` | 선택적인 Supabase 인증 및 클라우드 동기화를 켭니다. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase URL과 함께 쓰는 공개 익명 키입니다. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | TCG 가격 알림용 브라우저 Push 구독을 켭니다. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console 확인 메타데이터를 추가합니다. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | 개발 중 Agentation UI 검토 도구 모음을 켭니다. |

> [!TIP]
> Supabase 없이도 Lunidex는 로컬 우선 방식으로 완전히 사용할 수 있습니다. 즐겨찾기, 팀, 포획, 필터, TCG 진행도는 브라우저 저장소에 남습니다. 모바일에서는 `apps/mobile/.env`에 `EXPO_PUBLIC_SUPABASE_URL`과 `EXPO_PUBLIC_SUPABASE_ANON_KEY`를 사용하세요.

<details>
<summary><strong>개발에서 Agentation 켜기</strong></summary>

`.env.local`에 다음 값을 추가하고 개발 서버를 다시 시작합니다.

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

도구는 `http://localhost:4747`에서 실행되며 개발 Origin과 CSP는 이미 구성되어 있습니다.

</details>

## 아키텍처

```text
Poke/
├── src/                 Next.js 16 App Router 웹 애플리케이션
├── packages/core/       @primedex/core: API, 상태, 타입, i18n, 헬퍼, Supabase
├── apps/mobile/         Expo / React Native 컴패니언
├── supabase/migrations/ 선택적인 Supabase 스키마 마이그레이션
└── public/              PWA 아이콘, 스크린샷, 정적 자산
```

```text
React 서버 및 클라이언트 컴포넌트
  ├── TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Zustand selectors (@/store/primedex) ──▶ 웹 IndexedDB / 모바일 AsyncStorage
```

- **UI:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Base UI, Framer Motion을 사용합니다. Server Components가 기본입니다.
- **데이터:** 중앙 API 클라이언트는 재시도 기능을 가진 Axios를 사용합니다. TanStack Query가 캐시를 관리하며 쿼리 키는 한 곳에 모여 있습니다.
- **상태:** Zustand는 개인 데이터를 ID와 기본값으로 웹의 IndexedDB와 모바일의 AsyncStorage에 저장합니다.
- **언어 및 복원력:** i18next는 클라이언트 번들을 지연 로드하고 서버 번역은 정적 렌더링에 사용됩니다. PWA는 앱 셸과 일부 PokéAPI, TCGdex, 이미지, Next 리소스를 캐시합니다.

## 데이터 소스

| 소스 | 용도 |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST 및 GraphQL | 포켓몬, 도감 텍스트, 기술, 특성, 타입, 진화, 출현 정보. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG 카드, 세트, 이미지, 레어도, 카탈로그 정보. |
| [Supabase](https://supabase.com/) | 선택적 인증, 클라우드 동기화, 공개 프로필, 게임 데이터, TCG 가격 알림. |

컴포넌트는 이 서비스를 직접 호출하지 않습니다. 요청은 프로젝트 API 계층을 거칩니다.

## 배포

Lunidex는 Vercel에 맞게 구성되어 있으며 Next.js 서버 런타임과 이미지 최적화를 지원하는 모든 호스트에서 실행할 수 있습니다.

```bash
npm run build
npm run start
```

Vercel에서 저장소를 가져오고 기본 Next.js 설정을 유지한 뒤, 선택적인 공개 환경 변수를 대시보드에 추가하세요. [`vercel.json`](./vercel.json)은 의도적으로 최소화되어 있습니다.

## 감사의 말

Lunidex는 [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/) 및 애플리케이션에서 사용하는 오픈 소스 프로젝트의 도움으로 만들어졌습니다.

Pokémon 및 관련 자산은 각 소유자의 상표입니다. 이 팬 프로젝트는 비공식적이고 비상업적입니다.
