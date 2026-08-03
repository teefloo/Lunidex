<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logotipo de Lunidex" width="80" />

# Lunidex

**Una Pokédex rápida y local-first, y un espacio Pokémon TCG para entrenadores, coleccionistas y fans curiosos.**

[![En línea](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Resumen](#resumen) · [Inicio](#inicio) · [Funciones](#funciones) · [Arquitectura](#arquitectura) · [Configuración](#configuración) · [Despliegue](#despliegue)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · **Español** · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Resumen

Lunidex es un monorepo de código abierto formado por una aplicación web Next.js, el paquete TypeScript compartido `@primedex/core` y un compañero móvil Expo. Reúne la Pokédex nacional, herramientas de preparación competitiva, herramientas de colección Pokémon TCG y el seguimiento de progreso personal sin exigir una cuenta.

La web cubre los **1.025 Pokémon de nueve generaciones**. Su interfaz está disponible en inglés, francés, español, alemán, italiano, japonés, coreano y chino simplificado; este repositorio también incluye una traducción portuguesa del README.

> [!NOTE]
> Lunidex es un proyecto de fans no comercial. Los datos, nombres e imágenes de Pokémon pertenecen a Nintendo, Game Freak, Creatures y The Pokémon Company. Lunidex no está afiliado ni respaldado por ellas.

## Funciones

| Área | Qué puedes hacer |
| --- | --- |
| **Pokédex** | Explorar y filtrar los 1.025 Pokémon; consultar estadísticas, habilidades, movimientos, evoluciones, formas, encuentros, sprites e información competitiva. |
| **Herramientas de entrenamiento** | Formar equipos de seis, analizar cobertura, comparar Pokémon, explorar la tabla de tipos, planear EV e IV, calcular crianza y simular combates de novena generación. |
| **Biblioteca** | Buscar movimientos, habilidades y objetos, y usar comprobaciones de cobertura y sugerencias de counters. |
| **Progreso personal** | Guardar favoritos, Living Dex, equipos, vistas recientes, estadísticas del quiz y ajustes en almacenamiento local persistente; exportar o importar el estado como JSON. |
| **Modos de juego** | Jugar al quiz de seis modos, seguir una partida Nuzlocke y compartir equipos de solo lectura. |
| **Espacio TCG** | Descubrir cartas y sets, administrar colección y lista de deseos, comparar cartas, seguir precios y alertas, y crear mazos de 60 cartas. |
| **Sin conexión y móvil** | Instalar la PWA y recuperar en caché los recursos ya utilizados. La aplicación Expo incluye actualmente Pokédex, detalle, favoritos, equipos, cuenta, tema e idiomas. |

## Inicio

### Requisitos

- [Node.js](https://nodejs.org/) 20 o posterior
- npm 10 o posterior

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Lunidex redirige una URL sin prefijo a una ruta con idioma, como `/es`, mediante la cookie `primedex-lang` o la cabecera `Accept-Language` del navegador.

> [!IMPORTANT]
> El desarrollo usa webpack deliberadamente: `npm run dev` ejecuta `next dev --webpack`. Conserva ese comando aunque la configuración de Next también declare una raíz Turbopack.

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Next.js en desarrollo en el puerto 3000. |
| `npm run build` | Crea la compilación de producción. |
| `npm run start` | Sirve la compilación de producción. |
| `npm run lint` | Ejecuta ESLint 9. |
| `npm run typecheck` | Comprueba TypeScript sin emitir archivos. |
| `npm run test` | Ejecuta Vitest en jsdom. |

### Aplicación móvil

El compañero Expo está en [`apps/mobile`](./apps/mobile) y consume el paquete compartido [`@primedex/core`](./packages/core).

```bash
cd apps/mobile
npx expo start
```

El menú de Expo permite abrir iOS, Android, web o Expo Go. Consulta el [README móvil](./apps/mobile/README.md) para ver las pantallas compatibles.

## Configuración

No se necesita ninguna variable de entorno para navegar por la Pokédex localmente. Crea un `.env.local` sin versionar solo para activar una integración opcional.

| Variable | Finalidad |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Sustituye la URL pública canónica; el valor predeterminado es `https://primedex.vercel.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Habilita la autenticación y sincronización en la nube opcionales de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública asociada a la URL de Supabase. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Habilita suscripciones push para alertas de precios TCG. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Añade la metainformación de verificación de Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Habilita la barra de revisión UI de Agentation durante el desarrollo. |

> [!TIP]
> Sin Supabase, Lunidex sigue siendo plenamente utilizable en modo local-first: favoritos, equipos, capturas, filtros y progreso TCG permanecen en el almacenamiento del navegador. En móvil usa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `apps/mobile/.env`.

<details>
<summary><strong>Activar Agentation en desarrollo</strong></summary>

Añade este valor a `.env.local` y reinicia el servidor:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

La herramienta se ejecuta en `http://localhost:4747`; su origen de desarrollo y CSP ya están configurados.

</details>

## Arquitectura

```text
Poke/
├── src/                 Aplicación web Next.js 16 (App Router)
├── packages/core/       @primedex/core: API, estado, tipos, i18n, helpers, Supabase
├── apps/mobile/         Compañero Expo / React Native
├── supabase/migrations/ Migraciones opcionales del esquema Supabase
└── public/              Iconos PWA, capturas y recursos estáticos
```

```text
Componentes React de servidor y cliente
  ├── Hooks de TanStack Query (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Selectores de Zustand (@/store/primedex) ──▶ IndexedDB web / AsyncStorage móvil
```

- **Interfaz:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Base UI y Framer Motion. Los Server Components son la opción predeterminada.
- **Datos:** clientes API centralizados con Axios y reintentos; TanStack Query gestiona la caché y las claves de consulta están centralizadas.
- **Estado:** Zustand persiste datos personales como IDs y primitivas mediante IndexedDB en web y AsyncStorage en móvil.
- **Idiomas y resistencia:** i18next carga los paquetes cliente bajo demanda y las traducciones de servidor sirven el renderizado estático. La PWA guarda en caché su shell y recursos seleccionados de PokéAPI, TCGdex, imágenes y Next.

## Fuentes de datos

| Fuente | Uso |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST y GraphQL | Pokémon, textos de especie, movimientos, habilidades, tipos, evoluciones y encuentros. |
| [TCGdex](https://www.tcgdex.net/) | Cartas Pokémon TCG, sets, imágenes, rarezas e información del catálogo. |
| [Supabase](https://supabase.com/) | Autenticación opcional, sincronización cloud, perfiles públicos, datos de juego y alertas de precio TCG. |

Los componentes no consultan estos servicios directamente: las peticiones pasan por la capa API del proyecto.

## Despliegue

Lunidex está configurado para Vercel y puede ejecutarse en cualquier plataforma compatible con un runtime Next.js y la optimización de imágenes.

```bash
npm run build
npm run start
```

En Vercel, importa el repositorio, conserva los ajustes estándar de Next.js y añade las variables públicas opcionales en el panel. [`vercel.json`](./vercel.json) es intencionadamente mínimo.

## Agradecimientos

Lunidex se apoya en [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/) y los proyectos de código abierto utilizados en la aplicación.

Pokémon y todas sus propiedades relacionadas son marcas de sus respectivos titulares. Este proyecto de fans es no oficial y no comercial.
