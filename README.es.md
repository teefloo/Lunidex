<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logo de PrimeDex" align="center" width="80" />

# PrimeDex

**La Pokédex online más completa, pensada para entrenadores que valoran la velocidad, los datos y el diseño.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

Un panel de Next.js 16 + React 19 de alto rendimiento para la Pokédex Nacional completa: estadísticas, tipos, evoluciones, creación de equipos, cartas TCG y un quiz, todo en 9 idiomas.

[Descripción](#descripcion) · [Características](#caracteristicas) · [Inicio rápido](#inicio-rapido) · [Rutas](#rutas) · [Arquitectura](#arquitectura) · [Fuentes de datos](#fuentes-de-datos) · [Despliegue](#despliegue)

![PrimeDex — vista de escritorio](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · **Español** · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Descripción

PrimeDex es un panel de Pokédex open source para jugadores competitivos, coleccionistas de TCG y fans curiosos. Cubre los **1.025 Pokémon** de las 9 generaciones, con nombres localizados en 9 idiomas, comparaciones de estadísticas en paralelo, un constructor de equipos basado en la cobertura de tipos y un catálogo TCG de más de 25.000 cartas.

La app se construye sobre la [PokéAPI](https://pokeapi.co) oficial (REST + GraphQL) y [TCGdex](https://www.tcgdex.net), con TanStack Query para la caché, Zustand para el estado persistente de la UI (IndexedDB) y el App Router de Next.js para componentes de servidor y generación estática por ruta.

> [!NOTE]
> Este es un proyecto de fans no comercial. Los datos, nombres e imágenes de Pokémon son © Nintendo, Game Freak y The Pokémon Company.

## Características

- **Pokédex Nacional completa** — Los 1.025 Pokémon, todas las formas, todas las generaciones, con nombres localizados y textos descriptivos.
- **Constructor de equipos** — Crea un equipo de 6, obtén análisis de cobertura de tipos en vivo, detección de debilidades compartidas y una puntuación de sinergia.
- **Motor de comparación** — Análisis lado a lado de hasta 3 Pokémon con gráficos radar interactivos y desglose de estadísticas base.
- **Tabla de tipos** — Cobertura interactiva de los 18 tipos con fortalezas, debilidades, resistencias e inmunidades.
- **Base de datos de movimientos** — Lista filtrable por potencia, precisión, PP, tipo, categoría y descripción detallada de efectos.
- **Catálogo TCG** — Más de 25.000 cartas buscables por set, rareza, tipo, fase y PS, con seguimiento de colección y lista de deseos.
- **Quiz** — 6 modos de juego: Clásico, Silueta, Estadísticas, Contrarreloj, Supervivencia y Maratón.
- **Seguimiento del Living Dex** — Gestión persistente de capturas, totalmente offline, almacenada localmente en tu navegador.
- **9 idiomas** — Inglés, francés, alemán, español, italiano, japonés, coreano, chino simplificado y portugués brasileño.
- **Búsqueda avanzada** — Filtrado multidimensional por generación, tipo, BST, grupos huevo y estado especial.
- **Listo para SEO y AEO** — JSON-LD (`WebApplication`, `ItemList`, `FAQPage`, `HowTo`), alternativas `hreflang`, descubrimiento `llms.txt` / `ai.txt` y sitemap generado.

## Inicio rápido

### Requisitos

- [Node.js](https://nodejs.org) 20+
- npm 10+ (incluido con Node.js)
- Un shell compatible con POSIX (los scripts incluidos usan invocación estilo `bash`)

### Ejecutar en local

```bash
# 1. Clona el repositorio
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. Instala las dependencias
npm install

# 3. Inicia el servidor de desarrollo (webpack, no Turbopack)
npm run dev
```

La app está corriendo en <http://localhost:3000>. El middleware redirigirá `/` a tu idioma preferido según la cookie `primedex-lang` o la cabecera `Accept-Language` de tu navegador.

> [!IMPORTANT]
> `npm run dev` está fijado en `next dev --webpack` para un HMR estable con el App Router y los límites `next/dynamic`. No cambies a Turbopack en local — la declaración de `turbopack.root` en `next.config.ts` es intencionada y debe permanecer.

### Herramienta dev Agentation (opcional)

PrimeDex incluye [Agentation](https://github.com/tldraw/agentation) para revisión de UI asistida por IA. Para activarla, añade lo siguiente a `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

La barra de herramientas se servirá en <http://localhost:4747> (CSP y `allowedDevOrigins` ya están preconfigurados).

## Stack tecnológico

| Capa            | Herramientas                                                                     |
| --------------- | -------------------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev)     |
| Lenguaje        | [TypeScript 5](https://www.typescriptlang.org) (estricto, 100 % tipado)          |
| Estilos         | [Tailwind CSS v4](https://tailwindcss.com), [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| Primitivas UI   | [`@base-ui/react`](https://base-ui.com), `shadcn/ui` (preset `base-nova`)        |
| Animación       | [Framer Motion](https://www.framer.com/motion/)                                 |
| Obtención de datos | [TanStack Query v5](https://tanstack.com/query)                             |
| Estado cliente  | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| Gráficos        | [Recharts](https://recharts.org)                                                 |
| i18n            | [i18next](https://www.i18next.com/) + `react-i18next`                            |
| HTTP            | [Axios](https://axios-http.com) + `axios-retry` (backoff exponencial)            |
| Herramientas    | ESLint v9 (flat config), Vitest + Testing Library, Puppeteer (QA visual)         |

## Rutas

Todas las rutas llevan prefijo de idioma (`/en`, `/fr`, `/ja`…). El middleware gestiona redirecciones 308 y reescrituras de forma transparente.

| Ruta                      | Descripción                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `/`                       | Inicio con hero, Pokémon destacados y la cuadrícula completa de la Pokédex.  |
| `/pokemon/[name]`         | Página de detalle con stats, tipos, evoluciones, habilidades, movimientos y sets. |
| `/team`                   | Constructor de equipo de 6 con cobertura de tipos en vivo y puntuación de sinergia. |
| `/compare`                | Comparación lado a lado de hasta 3 Pokémon.                                  |
| `/favorites`              | Lista personal de Pokémon favoritos.                                         |
| `/quiz`                   | "¿Quién es ese Pokémon?" con 6 modos de juego.                              |
| `/types`                  | Tabla de tipos interactiva para los 18 tipos.                                |
| `/moves`                  | Base de datos de movimientos buscable.                                       |
| `/tcg`                    | Catálogo TCG Pokémon con filtros por set, rareza, tipo y PS.                |
| `/tcg/cards/[id]`         | Detalle de una carta TCG individual.                                         |
| `/tcg/collection`         | Seguimiento de tu colección de cartas.                                       |
| `/tcg/wishlist`           | Lista de deseos TCG.                                                         |
| `/about`                  | Misión, fuentes de datos e información de contacto.                          |
| `/faq`                    | Preguntas frecuentes.                                                        |
| `/cookies` `/legal` `/privacy` `/terms` | Páginas legales.                                              |

La página dinámica `/pokemon/[name]` usa `generateStaticParams` para los 151 primeros Pokémon y `revalidate = 3600` para la regeneración estática incremental.

## Arquitectura

### Flujo de datos

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Selectores Zustand (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- Todas las llamadas HTTP pasan por el barrel `@/lib/api`; los componentes nunca usan `fetch` ni `axios` directamente.
- Las claves de consulta están centralizadas en `@/lib/api/keys` para una invalidación estable.
- El store de Zustand solo guarda IDs y primitivas (favoritos, equipo, capturados, filtros, historial, ajustes) y se persiste en IndexedDB. El estado local **no** se guarda en `localStorage`.
- Los componentes pesados (`EvolutionChain`, `AdvancedInfo`, `PokemonCards`) se cargan con `next/dynamic` para mantener pequeño el primer pintado.

### Internacionalización

- Locales soportadas: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`.
- El código de cliente usa `@/lib/i18n` con bundles de idioma con carga diferida; el inglés es el bundle inicial.
- El código de servidor usa `@/lib/server-i18n` con todos los bundles integrados para SSG/SSR.
- Cada página declara alternativas `hreflang` y un `x-default` apuntando a `/en`.
- La cookie `primedex-lang` persiste la preferencia del usuario durante 1 año.

### Rendimiento

- Server Components por defecto; `"use client"` se reserva para las hojas que necesitan interactividad.
- `next/image` para todas las imágenes (AVIF + WebP), con una `remotePatterns` estricta.
- Generación estática para `/pokemon/[name]` (151 primeros) + ISR cada hora.
- Caché inmutable para `/_next/static`, caché de 1 día para imágenes, caché de 1 hora para `sitemap.xml` y `llms.txt`.
- Valores por defecto de TanStack Query: `staleTime` 10 min, `gcTime` 60 min, `retry` 1, sin `refetchOnWindowFocus`.

### Seguridad

- Cabeceras reforzadas en cada ruta: `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS con `preload`, `Referrer-Policy` estricto, `Permissions-Policy` bloqueado.
- Se aplica una Content-Security-Policy estricta. Fuente: ver `next.config.ts`.
- Los reintentos de Axios gestionan errores de red transitorios y HTTP 429 con backoff exponencial.

## Fuentes de datos

| Fuente                                                                | Usado para                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------- |
| [PokéAPI](https://pokeapi.co) (REST)                                  | Pokémon, movimientos, habilidades, tipos, encuentros |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                    | Nombres localizados de especies y textos descriptivos |
| [TCGdex](https://www.tcgdex.net)                                      | Cartas, sets y rarezas del TCG Pokémon               |
| [Sprites PokeAPI](https://github.com/PokeAPI/sprites)                 | Arte oficial y sprites animados                      |

Todos los datos se obtienen en el servidor y se revalidan cada 3.600 segundos. La atribución de fuentes se muestra en cada página de Pokémon.

## Configuración

La app lee un pequeño número de variables de entorno. Ninguna es obligatoria para el desarrollo local.

| Variable                          | Por defecto                | Propósito                                  |
| --------------------------------- | -------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`             | `https://primedex.vercel.app` | URL canónica del sitio                   |
| `NEXT_PUBLIC_ENABLE_AGENTATION`  | _(no definida)_            | Activa la barra de herramientas dev Agentation |

## Scripts

| Comando                            | Descripción                                              |
| ---------------------------------- | -------------------------------------------------------- |
| `npm run dev`                      | Inicia el servidor de desarrollo con webpack en `:3000`. |
| `npm run build`                    | Build de producción.                                     |
| `npm run start`                    | Ejecuta el build de producción.                          |
| `npm run lint`                     | ESLint v9 con la flat config del proyecto.               |
| `npm run typecheck`                | `tsc --noEmit` sobre todo el proyecto.                   |
| `npm run test`                     | Vitest (jsdom) — ver `vitest.config.ts`.                 |
| `npx vitest path/to/file.test.ts`  | Ejecuta un único archivo de test.                        |
| `npx vitest --ui`                  | Abre la UI de Vitest.                                    |

> [!NOTE]
> Antes de añadir tests, asegúrate de que `src/test/setup.ts` existe. La config de Vitest ya apunta a él; el archivo es actualmente un stub. Sin él, `npm run test` no arrancará.

## Estructura del proyecto

```
src/
├── app/                # Next.js App Router — las rutas viven aquí
│   ├── api/            # Route handlers (TCG)
│   ├── [locale]        # Rutas con prefijo de idioma
│   ├── layout.tsx      # Layout raíz (RSC)
│   ├── providers.tsx   # TanStack Query, tema, providers de i18n
│   └── ...
├── components/         # UI reutilizable (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # Helpers TS puros + barrel de API
│   ├── api/            # Clientes REST + GraphQL + TCG
│   ├── i18n/           # Bundles de idioma (lazy en cliente)
│   ├── server-i18n.ts  # Traducciones del lado del servidor
│   └── ...
├── store/primedex.ts   # Store Zustand (solo IDs y primitivas)
├── types/pokemon.ts    # Fuente única de verdad para los tipos del dominio
├── hooks/              # Hooks React personalizados
└── middleware.ts       # Redirecciones y reescrituras 308 por idioma

public/                 # Assets estáticos (iconos, capturas, sprites de respaldo)
```

## Despliegue

PrimeDex es una app estándar de Next.js 16 y se despliega en cualquier plataforma que soporte la salida standalone de Next.js.

### Vercel (recomendado)

El repo incluye un `vercel.json` mínimo (`{"name": "poke-app"}`). Importa el proyecto en Vercel, acepta los valores por defecto del framework, y el build de producción funcionará out of the box. El ajuste `revalidate = 3600` en `/pokemon/[name]` se respeta automáticamente.

### Otras plataformas

```bash
npm run build
npm run start  # servidor de producción en :3000
```

Asegúrate de que el host soporte la API de optimización de imágenes de Next.js (o pre-renderiza las imágenes a un CDN).

## Contribuir

Issues, solicitudes de funcionalidades y pull requests son bienvenidos. Abre primero un issue para cualquier cambio no trivial para que podamos discutir el enfoque.

Cuando envíes un pull request:

- Ejecuta `npm run lint` y `npm run typecheck` en local.
- Añade o actualiza tests cuando cambie el comportamiento.
- Sigue las convenciones de [`AGENTS.md`](./AGENTS.md) y los archivos `AGENT.md` por subdirectorio.

## Agradecimientos

- [PokéAPI](https://pokeapi.co) — la fuente de datos abierta de referencia para la franquicia.
- [TCGdex](https://www.tcgdex.net) — el catálogo TCG abierto usado en el navegador de cartas.
- [Vercel](https://vercel.com) — hosting y red edge.
- [shadcn/ui](https://ui.shadcn.com) — el preset `base-nova` que ancla el design system.

## Contacto

- Issues: <https://github.com/teefloo/Poke/issues>
- Divulgación de seguridad: ver [`.well-known/security.txt`](./public/.well-known/security.txt)
- Autor: Esteban Deloge (<contact@primedex.app>)

## Marcas

Pokémon, los nombres de personajes Pokémon y las propiedades relacionadas son marcas registradas de Nintendo, Game Freak y The Pokémon Company. PrimeDex es un proyecto de fans no oficial solo con fines educativos y de entretenimiento, y no está afiliado, respaldado ni patrocinado por ninguna de estas entidades.
