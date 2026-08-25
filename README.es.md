<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Logotipo de Lunidex" width="80" />

# Lunidex

**Un espacio Pokémon enfocado para jugadores, entrenadores y coleccionistas de TCG.**

[![En línea](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Aplicación](https://lunidex.app) · [Repositorio](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[Resumen](#resumen) · [Funciones](#funciones) · [Inicio rápido](#inicio-rápido) · [Configuración](#configuración) · [Arquitectura](#arquitectura) · [Despliegue](#despliegue)

<img src="./public/screenshot-desktop.png" alt="Panel de Pokédex y colección de Lunidex en escritorio" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · **Español** · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Resumen

Lunidex es un monorepo independiente y de código abierto basado en npm workspaces que combina una Pokédex, herramientas de referencia Pokémon, utilidades para crear equipos, un catálogo Pokémon TCG y un espacio personal vinculado a una cuenta.

La aplicación web cubre **1.025 Pokémon de nueve generaciones** y admite ocho idiomas de interfaz: inglés, francés, español, alemán, italiano, japonés, coreano y chino simplificado. El portugués está disponible como traducción del README, pero no es un idioma de la interfaz web.

Las páginas públicas de referencia funcionan sin cuenta. El espacio personal —favoritos, Pokémon capturados, equipos, progreso del quiz, colecciones TCG, listas de deseos, búsquedas guardadas, notas, mazos y funciones relacionadas— usa Neon Auth y Neon PostgreSQL cuando están configurados y sincronizados. Las preferencias visuales web usan IndexedDB; la aplicación Expo usa AsyncStorage.

> [!NOTE]
> Lunidex es un proyecto de fans independiente y no oficial. Los nombres de personajes Pokémon, marcas, ilustraciones, imágenes y la propiedad intelectual relacionada pertenecen a sus respectivos titulares. Lunidex no está afiliado, respaldado, patrocinado ni oficialmente vinculado a Nintendo, Creatures Inc., GAME FREAK inc. o The Pokémon Company.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Vista móvil de la Pokédex de Lunidex" width="280" />
</div>

## Funciones

| Área | Qué puedes hacer |
| --- | --- |
| **Pokédex y referencia** | Explorar y filtrar los 1.025 Pokémon; consultar estadísticas, tipos, habilidades, movimientos, evoluciones, formas, encuentros, sprites y datos de especie localizados. Buscar movimientos, habilidades y objetos. |
| **Laboratorio de equipos y combates** | Crear equipos de hasta seis Pokémon, analizar la cobertura de tipos y movimientos, revisar sinergia y roles, comparar hasta tres Pokémon, usar la tabla de los 18 tipos, planificar EV/IV, calcular la crianza y ejecutar un simulador de combates de la generación 9. |
| **Progreso y juego** | Seguir favoritos, Pokémon capturados, Living Dex, actividad, medallas y estadísticas del quiz. Jugar con tres desafíos y tres modos de juego, incluidas partidas diarias, y seguir una partida Nuzlocke. |
| **Compartir y funciones sociales** | Importar y exportar equipos de Showdown, compartir enlaces de equipos de solo lectura, crear perfiles públicos, gestionar amistades, consultar clasificaciones del quiz y usar salas de combate vinculadas a la cuenta. |
| **Espacio Pokémon TCG** | Explorar cartas y sets, filtrar el catálogo, comparar cartas, seguir cartas propias y deseadas, consultar el progreso por set, guardar búsquedas y notas, crear mazos y mostrar campos de precio cuando TCGdex los proporciona. |
| **PWA y persistencia** | Instalar la aplicación web como PWA. El service worker almacena en caché la shell de la aplicación y recursos externos seleccionados para facilitar visitas posteriores, mientras que los datos de la cuenta permanecen detrás de la API del servidor. |
| **Compañero móvil** | Usar la aplicación Expo en iOS, Android o la web con clientes API, tipos, estado Zustand, contratos de persistencia, traducciones y helpers Neon compartidos desde `@primedex/core`. |

## Explora la aplicación

Sustituye `en` por un idioma compatible: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` o `zh`.

| Superficie | Ruta |
| --- | --- |
| Inicio | [`/en`](https://lunidex.app/en) |
| Pokédex | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| Ficha Pokémon | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| Creador de equipos | [`/en/team`](https://lunidex.app/en/team) |
| Tabla de tipos | [`/en/types`](https://lunidex.app/en/types) |
| Quiz | [`/en/quiz`](https://lunidex.app/en/quiz) |
| Simulador de combates | [`/en/battle`](https://lunidex.app/en/battle) |
| Catálogo TCG | [`/en/tcg`](https://lunidex.app/en/tcg) |
| Colección TCG | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| Panel personal | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

Las superficies de colección, panel, funciones sociales y otros espacios personales pueden requerir una sesión de sincronización autenticada.

## Inicio rápido

### Requisitos previos

- [Node.js](https://nodejs.org/) 22
- npm y el `package-lock.json` versionado
- [Git](https://git-scm.com/)

Clona el repositorio, instala los workspaces y arranca la aplicación web:

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El proxy de idiomas redirige una URL sin prefijo a un idioma compatible como `/es`, usando la cookie `primedex-lang` o el idioma del navegador cuando está disponible.

> [!IMPORTANT]
> Los builds de desarrollo y producción usan webpack intencionadamente: `npm run dev` ejecuta `next dev --webpack` y `npm run build` ejecuta `next build --webpack`. Conserva la opción aunque la configuración de Next.js también declare una raíz Turbopack.

## Aplicación móvil

El compañero Expo vive en [`apps/mobile`](./apps/mobile). Actualmente incluye la lista y búsqueda de la Pokédex, fichas detalladas, favoritos, equipos, cuenta, tema y ajustes de idioma. Todavía no tiene paridad completa con la web; el resto de herramientas siguen disponibles en la aplicación Next.js.

Inícialo desde la raíz del repositorio:

```bash
npm run start --workspace=@primedex/mobile
```

El menú de Expo permite abrir iOS, Android o una vista previa web. El paquete también expone los scripts `android`, `ios` y `web`:

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

Consulta el [README móvil](./apps/mobile/README.md) para las variables de entorno y los detalles de arquitectura específicos de Expo.

## Configuración

No se necesitan variables de entorno para consultar las páginas públicas de referencia. Copia la plantilla para activar integraciones opcionales de cuenta, servidor, contacto, notificaciones o desarrollo:

```bash
cp .env.example .env.local
```

Para la aplicación Expo, usa `apps/mobile/.env.example` como plantilla:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable(s) | Alcance | Finalidad |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / pública | URL canónica del sitio y base de la API. Por defecto: `https://lunidex.app`. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / pública | Endpoint de Neon Auth utilizado por el cliente del navegador. |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Solo servidor | Endpoints del proxy Neon Auth y de verificación JWT. |
| `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWT_ISSUER`, `NEON_AUTH_JWT_AUDIENCE` | Solo servidor | Protección de la cookie de autenticación y restricciones de validación JWT. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | Solo servidor | Conexión PostgreSQL de Neon. La integración Neon de Vercel proporciona `DATABASE_URL`; en local puede usarse `NEON_DATABASE_URL`. |
| `EXPO_PUBLIC_NEON_AUTH_URL`, `EXPO_PUBLIC_APP_URL` | Móvil / pública | Endpoints de Neon Auth y de la aplicación desplegada usados por Expo. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / pública | Valor opcional de verificación de Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Desarrollo | Activa el overlay de revisión UI Agentation cuando vale `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / pública | Clave opcional para suscribirse a notificaciones push del navegador. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Solo servidor | Configuración opcional de entrega de notificaciones push en el servidor. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Solo servidor | Envío opcional del formulario de contacto mediante Resend. |
| `SUPABASE_DB_URL` | Solo migración | Conexión de la fuente antigua usada por los scripts de exportación Supabase-Neon; nunca es una variable de ejecución web o móvil. |

> [!WARNING]
> Nunca expongas cadenas de conexión, configuración JWKS, secretos de cookies, material privado VAPID, claves Resend ni URLs de migración mediante `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, archivos fuente, logs o commits.

<details>
<summary><strong>Activar Agentation durante el desarrollo</strong></summary>

Añade este valor a `.env.local` y reinicia el servidor de desarrollo:

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

La herramienta usa `http://localhost:4747`; su origen de desarrollo y el soporte CSP ya están configurados.

</details>

## Scripts

Ejecuta los comandos raíz desde la raíz del repositorio:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo de Next.js. |
| `npm run build` | Crea un build de producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | Analiza las fuentes web, core y móvil. |
| `npm run typecheck` | Comprueba el workspace web. |
| `npm run test -- --run` | Ejecuta la suite Vitest una vez. |
| `npx vitest run path/to/file.test.ts` | Ejecuta un archivo de pruebas concreto. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Comprueba `@primedex/core`. |
| `npm run typecheck --workspace=@primedex/mobile` | Comprueba la aplicación Expo. |
| `npm run lint --workspace=@primedex/mobile` | Analiza la aplicación Expo. |
| `npm run db:neon:export` | Exporta los datos de la fuente conservada para la migración. |
| `npm run db:neon:import` | Aplica el esquema Neon e importa un export preparado. |
| `npm run db:neon:verify` | Compara la fuente y el resultado de la migración Neon. |

> [!WARNING]
> Los comandos de importación y verificación de Neon acceden a bases de datos externas. Lee [`neon/AGENTS.md`](./neon/AGENTS.md) y [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md), y utiliza un destino de pruebas o staging aprobado.

El workflow de CI en [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) instala dependencias, ejecuta lint, comprobaciones de tipos web/core, pruebas, el build de producción y la comprobación de tipos móvil.

## Arquitectura

```text
.
├── src/                 Aplicación web Next.js 16 / React 19
├── packages/core/       @primedex/core: API, tipos, store, i18n y helpers compartidos
├── apps/mobile/         Compañero Expo Router @primedex/mobile
├── neon/migrations/     Esquema activo de aplicación PostgreSQL Neon
├── supabase/            Migraciones fuente conservadas y material de compatibilidad
├── scripts/neon/        Scripts controlados de exportación, importación y verificación
├── public/              Iconos PWA, capturas, recursos de cartas y archivos estáticos
└── docs/                Notas de producto, diseño, migración, auditoría e implementación
```

```text
Web (Next.js App Router)
  ├── Componentes de rutas de servidor y cliente
  ├── TanStack Query ──▶ clientes API compartidos ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ preferencias visuales en IndexedDB
  └── Route Handlers ──▶ Neon Auth + espacio de usuario PostgreSQL Neon

Móvil (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + Neon Auth/API cuando están configurados
```

Límites principales:

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI, Framer Motion, TanStack Query y la capa PWA.
- **Core compartido:** tipos de dominio independientes de la interfaz, clientes API, store Zustand, bundles i18n, helpers Neon y utilidades puras compartidas por web y móvil.
- **Acceso a datos:** las peticiones remotas pasan por la fachada API centralizada de `src/lib/api` y `packages/core/src/api`; los componentes de presentación no crean clientes API ad hoc.
- **Persistencia:** las preferencias visuales web usan IndexedDB con un fallback del navegador; la persistencia nativa usa AsyncStorage. El espacio autenticado se sincroniza mediante la API Neon y se almacena en `user_state`.
- **Capa de plataforma:** los adaptadores `*.ts` y `*.native.ts` separan almacenamiento y configuración de navegador/React Native sin duplicar la lógica de dominio.
- **Localización:** las rutas con prefijo y los bundles de traducción admiten `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` y `zh`.

> [!IMPORTANT]
> Lunidex es el nombre visible del producto, pero `primedex`, `@primedex/core`, `@primedex/mobile`, `usePrimeDexStore`, las claves de almacenamiento, los slugs de rutas, los esquemas Expo y los identificadores de bundle son identificadores históricos sensibles a la compatibilidad. No los cambies salvo que la tarea incluya una migración deliberada.

## Fuentes de datos y atribución

| Fuente | Uso |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST y GraphQL | Pokémon, textos de especies, estadísticas, tipos, movimientos, habilidades, evoluciones, encuentros y nombres localizados. |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Sprites de Pokémon y objetos y recursos de ilustración relacionados. |
| [TCGdex](https://www.tcgdex.net/) | Cartas Pokémon TCG, sets, rarezas, imágenes, campos de catálogo y campos de precio cuando los proporciona la fuente. |
| [Neon](https://neon.com/) | Autenticación opcional, estado de usuario PostgreSQL, perfiles, amistades, clasificaciones, salas de combate y funciones del espacio personal en el servidor. |

La disponibilidad de datos externos, cobertura localizada, imágenes y campos de precio puede cambiar. Lunidex no es un marketplace de cartas y no garantiza valoraciones de mercado ni cobertura de historial de precios.

El código fuente se distribuye bajo la licencia MIT en [`LICENSE`](./LICENSE). La propiedad intelectual de Pokémon y los datos de terceros siguen sujetos a sus respectivos titulares y condiciones.

## Despliegue

Lunidex está configurado para [Vercel](https://vercel.com/) y también puede ejecutarse en un host compatible con el runtime de servidor de Next.js y la optimización de imágenes.

```bash
npm run build
npm run start
```

En Vercel:

1. Importa `teefloo/Lunidex` en un proyecto de Vercel.
2. Configura los valores de Neon Auth y la conexión de base de datos solo del servidor en Preview y Production.
3. Usa los ajustes de build estándar de Next.js. El [`vercel.json`](./vercel.json) versionado se mantiene deliberadamente mínimo.

El runtime web activo usa Neon. Las migraciones Supabase conservadas y los scripts de migración controlados existen para comparación, copias de seguridad y trabajo de migración; no son el runtime de autenticación o base de datos de la aplicación web.

Consulta el [runbook de migración Neon](./docs/neon-migration.md) para conocer el esquema, los límites de entorno y el procedimiento de validación.

## Documentación relacionada

- [Configuración y paridad móvil](./apps/mobile/README.md)
- [Contexto del producto](./PRODUCT.md)
- [Sistema de diseño](./DESIGN.md)
- [Runbook de migración Neon](./docs/neon-migration.md)
- [Issues de GitHub](https://github.com/teefloo/Lunidex/issues)
