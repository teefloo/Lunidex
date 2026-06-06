<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex-Logo" align="center" width="80" />

# PrimeDex

**Der umfassendste Online-Pokédex, gebaut für Trainer, denen Geschwindigkeit, Daten und Design wichtig sind.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

Ein hochperformantes Next.js 16 + React 19 Dashboard für den kompletten National-Pokédex: Werte, Typen, Entwicklungen, Team-Builder, TCG-Karten und ein Quiz – alles in 9 Sprachen.

[Überblick](#uberblick) · [Funktionen](#funktionen) · [Schnellstart](#schnellstart) · [Routen](#routen) · [Architektur](#architektur) · [Datenquellen](#datenquellen) · [Bereitstellung](#bereitstellung)

![PrimeDex — Desktop-Vorschau](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · **Deutsch** · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Überblick

PrimeDex ist ein Open-Source-Pokédex-Dashboard für kompetitive Spieler, TCG-Sammler und neugierige Fans. Es deckt alle **1.025 Pokémon** über 9 Generationen ab, mit lokalisierten Namen in 9 Sprachen, direkten Wertevergleichen, einem Typ-Deckungs-Team-Builder und einem TCG-Katalog mit über 25.000 Karten.

Die App basiert auf der offiziellen [PokéAPI](https://pokeapi.co) (REST + GraphQL) und [TCGdex](https://www.tcgdex.net), nutzt TanStack Query zum Cachen, Zustand für persistenten UI-Zustand (IndexedDB) und den Next.js App Router für Server-Komponenten sowie statische Generierung pro Route.

> [!NOTE]
> Dies ist ein nicht-kommerzielles Fan-Projekt. Pokémon-Daten, -Namen und -Bilder sind © Nintendo, Game Freak und The Pokémon Company.

## Funktionen

- **Kompletter National-Pokédex** — Alle 1.025 Pokémon, jede Form, jede Generation, mit lokalisierten Namen und Flavor-Text.
- **Team-Builder** — Baue ein Team aus 6, erhalte Live-Typ-Deckungsanalyse, Erkennung gemeinsamer Schwächen und einen Synergie-Score.
- **Vergleichs-Engine** — Parallele Analyse von bis zu 3 Pokémon mit interaktiven Radar-Diagrammen und Basiswert-Aufschlüsselung.
- **Typ-Tabelle** — Interaktive Abdeckung aller 18 Typen mit Stärken, Schwächen, Resistenzen und Immunitäten.
- **Attacken-Datenbank** — Filterbare Liste mit Stärke, Genauigkeit, AP, Typ, Schadensklasse und detaillierten Effektbeschreibungen.
- **TCG-Katalog** — Über 25.000 Karten, durchsuchbar nach Set, Seltenheit, Typ, Phase und KP, mit Sammlungs- und Wunschzettel-Verfolgung.
- **Quiz** — 6 Spielmodi: Klassisch, Silhouette, Werte, Zeitangriff, Survival und Marathon.
- **Living-Dex-Tracker** — Persistentes Fang-Management, vollständig offline, lokal im Browser gespeichert.
- **9 Sprachen** — Englisch, Französisch, Deutsch, Spanisch, Italienisch, Japanisch, Koreanisch, vereinfachtes Chinesisch, brasilianisches Portugiesisch.
- **Erweiterte Suche** — Mehrdimensionale Filter nach Generation, Typ, BST, Ei-Gruppen und Spezialstatus.
- **SEO- & AEO-bereit** — JSON-LD (`WebApplication`, `ItemList`, `FAQPage`, `HowTo`), `hreflang`-Alternativen, `llms.txt` / `ai.txt`-Discovery und generierte Sitemap.

## Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org) 20+
- npm 10+ (mit Node.js mitgeliefert)
- Eine POSIX-kompatible Shell (die mitgelieferten Skripte verwenden `bash`-artige Aufrufe)

### Lokal ausführen

```bash
# 1. Repository klonen
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. Abhängigkeiten installieren
npm install

# 3. Dev-Server starten (webpack, nicht Turbopack)
npm run dev
```

Die App läuft jetzt auf <http://localhost:3000>. Die Middleware leitet `/` an deine bevorzugte Locale weiter, basierend auf dem `primedex-lang`-Cookie oder dem `Accept-Language`-Header deines Browsers.

> [!IMPORTANT]
> `npm run dev` ist auf `next dev --webpack` festgelegt, um stabiles HMR mit dem App Router und `next/dynamic`-Grenzen zu gewährleisten. Wechsle lokal nicht zu Turbopack — die Deklaration von `turbopack.root` in `next.config.ts` ist absichtlich und muss bleiben.

### Agentation-Dev-Tool (optional)

PrimeDex liefert [Agentation](https://github.com/tldraw/agentation) für KI-gestützte UI-Reviews mit. Um es zu aktivieren, füge Folgendes zu `.env.local` hinzu:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

Die Toolbar wird unter <http://localhost:4747> bereitgestellt (CSP und `allowedDevOrigins` sind bereits verdrahtet).

## Technischer Stack

| Schicht          | Werkzeuge                                                                          |
| ---------------- | ---------------------------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev)       |
| Sprache          | [TypeScript 5](https://www.typescriptlang.org) (strict, 100 % typsicher)           |
| Styling          | [Tailwind CSS v4](https://tailwindcss.com), [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| UI-Primitives    | [`@base-ui/react`](https://base-ui.com), `shadcn/ui` (Preset `base-nova`)          |
| Animation        | [Framer Motion](https://www.framer.com/motion/)                                    |
| Datenabruf       | [TanStack Query v5](https://tanstack.com/query)                                    |
| Client-State     | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| Diagramme        | [Recharts](https://recharts.org)                                                   |
| i18n             | [i18next](https://www.i18next.com/) + `react-i18next`                              |
| HTTP             | [Axios](https://axios-http.com) + `axios-retry` (exponentielles Backoff)           |
| Tooling          | ESLint v9 (flat config), Vitest + Testing Library, Puppeteer (visuelle QA)         |

## Routen

Alle Routen sind locale-präfixiert (`/en`, `/fr`, `/ja`…). Die Middleware übernimmt 308-Redirects und Rewrites transparent.

| Pfad                        | Beschreibung                                                                    |
| --------------------------- | ------------------------------------------------------------------------------- |
| `/`                         | Startseite mit Hero, vorgestellten Pokémon und dem vollständigen Pokédex-Raster. |
| `/pokemon/[name]`           | Detailseite mit Werten, Typen, Entwicklungen, Fähigkeiten, Attacken und Builds. |
| `/team`                     | 6-Slot-Team-Builder mit Live-Typ-Deckung und Synergie-Score.                    |
| `/compare`                  | Paralleler Vergleich von bis zu 3 Pokémon.                                      |
| `/favorites`                | Persönliche Liste der favorisierten Pokémon.                                    |
| `/quiz`                     | „Welches Pokémon bin ich?" mit 6 Spielmodi.                                     |
| `/types`                    | Interaktive Typ-Tabelle für alle 18 Typen.                                      |
| `/moves`                    | Durchsuchbare Attacken-Datenbank.                                               |
| `/tcg`                      | Pokémon-TCG-Katalog mit Filtern nach Set, Seltenheit, Typ und KP.               |
| `/tcg/cards/[id]`           | Detail einer einzelnen TCG-Karte.                                               |
| `/tcg/collection`           | Persönlicher Kartensammlungs-Tracker.                                           |
| `/tcg/wishlist`             | TCG-Wunschzettel.                                                               |
| `/about`                    | Mission, Datenquellen und Kontaktinformationen.                                |
| `/faq`                      | Häufig gestellte Fragen.                                                        |
| `/cookies` `/legal` `/privacy` `/terms` | Rechtliche Seiten.                                                  |

Die dynamische Seite `/pokemon/[name]` verwendet `generateStaticParams` für die ersten 151 Pokémon und `revalidate = 3600` für inkrementelle statische Regenerierung.

## Architektur

### Datenfluss

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Zustand-Selektoren (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- Alle HTTP-Aufrufe laufen über das `@/lib/api`-Barrel; Komponenten verwenden niemals direkt `fetch` oder `axios`.
- Query-Keys sind in `@/lib/api/keys` zentralisiert für eine stabile Invalidierung.
- Der Zustand-Store hält nur IDs und Primitive (Favoriten, Team, Gefangen, Filter, Verlauf, Einstellungen) und wird in IndexedDB persistiert. Lokaler State wird **nicht** in `localStorage` gehalten.
- Schwere Komponenten (`EvolutionChain`, `AdvancedInfo`, `PokemonCards`) werden über `next/dynamic` geladen, um den First-Paint klein zu halten.

### Internationalisierung

- Unterstützte Locales: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`.
- Client-Code verwendet `@/lib/i18n` mit lazy geladenen Sprach-Bundles; Englisch ist das initiale Bundle.
- Server-Code verwendet `@/lib/server-i18n` mit allen eingebackenen Bundles für SSG/SSR.
- Jede Seite deklariert `hreflang`-Alternativen und ein `x-default`, das auf `/en` zeigt.
- Das `primedex-lang`-Cookie speichert die Benutzerpräferenz für 1 Jahr.

### Performance

- Server Components standardmäßig; `"use client"` ist Blättern vorbehalten, die Interaktivität benötigen.
- `next/image` für alle Bilder (AVIF + WebP), mit strenger `remotePatterns`-Allowlist.
- Statische Generierung für `/pokemon/[name]` (erste 151) + ISR jede Stunde.
- Immutable Caches für `/_next/static`, 1-Tages-Cache für Bilder, 1-Stunden-Cache für `sitemap.xml` und `llms.txt`.
- TanStack-Query-Standards: `staleTime` 10 min, `gcTime` 60 min, `retry` 1, kein `refetchOnWindowFocus`.

### Sicherheit

- Gehärtete Header auf jeder Route: `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS mit `preload`, strenge `Referrer-Policy`, gesperrte `Permissions-Policy`.
- Eine strikte Content-Security-Policy wird durchgesetzt. Quelle: siehe `next.config.ts`.
- Axios-Retries behandeln transiente Netzwerkfehler und HTTP 429 mit exponentiellem Backoff.

## Datenquellen

| Quelle                                                                | Verwendung                                         |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| [PokéAPI](https://pokeapi.co) (REST)                                  | Pokémon, Attacken, Fähigkeiten, Typen, Begegnungen  |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                    | Lokalisierte Speziesnamen und Flavor-Texte          |
| [TCGdex](https://www.tcgdex.net)                                      | Pokémon-TCG-Karten, Sets und Seltenheiten           |
| [PokeAPI-Sprites](https://github.com/PokeAPI/sprites)                 | Offizielle Artworks und animierte Sprites           |

Alle Daten werden serverseitig abgerufen und alle 3.600 Sekunden revalidiert. Die Quellenangabe wird auf jeder Pokémon-Seite angezeigt.

## Konfiguration

Die App liest eine kleine Anzahl von Umgebungsvariablen. Keine davon ist für die lokale Entwicklung erforderlich.

| Variable                          | Standard                    | Zweck                                          |
| --------------------------------- | --------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | `https://primedex.vercel.app` | Kanonische Site-URL                          |
| `NEXT_PUBLIC_ENABLE_AGENTATION`  | _(nicht gesetzt)_           | Schaltet die Agentation-Dev-Toolbar um         |

## Skripte

| Befehl                              | Beschreibung                                              |
| ----------------------------------- | --------------------------------------------------------- |
| `npm run dev`                       | Startet den Dev-Server mit webpack auf `:3000`.           |
| `npm run build`                     | Produktions-Build.                                        |
| `npm run start`                     | Führt den Produktions-Build aus.                          |
| `npm run lint`                      | ESLint v9 mit der Flat-Config des Projekts.               |
| `npm run typecheck`                 | `tsc --noEmit` über das gesamte Projekt.                  |
| `npm run test`                      | Vitest (jsdom) — siehe `vitest.config.ts`.                |
| `npx vitest path/to/file.test.ts`   | Führt eine einzelne Testdatei aus.                        |
| `npx vitest --ui`                   | Startet die Vitest-UI.                                    |

> [!NOTE]
> Bevor du Tests hinzufügst, stelle sicher, dass `src/test/setup.ts` existiert. Die Vitest-Config zeigt bereits darauf; die Datei ist aktuell ein Stub. Ohne sie lässt sich `npm run test` nicht starten.

## Projektstruktur

```
src/
├── app/                # Next.js App Router — Routen leben hier
│   ├── api/            # Route-Handler (TCG)
│   ├── [locale]        # Locale-präfixierte Routen
│   ├── layout.tsx      # Root-Layout (RSC)
│   ├── providers.tsx   # TanStack Query, Theme, i18n-Provider
│   └── ...
├── components/         # Wiederverwendbare UI (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # Reine TS-Helfer + API-Barrel
│   ├── api/            # REST- + GraphQL- + TCG-Clients
│   ├── i18n/           # Sprach-Bundles (lazy im Client)
│   ├── server-i18n.ts  # Serverseitige Übersetzungen
│   └── ...
├── store/primedex.ts   # Zustand-Store (nur IDs und Primitive)
├── types/pokemon.ts    # Single Source of Truth für Domänentypen
├── hooks/              # Eigene React-Hooks
└── middleware.ts       # Locale-308-Redirects und Rewrites

public/                 # Statische Assets (Icons, Screenshots, Sprite-Fallbacks)
```

## Bereitstellung

PrimeDex ist eine Standard-Next.js-16-App und lässt sich auf jeder Plattform bereitstellen, die den Next.js-Standalone-Output unterstützt.

### Vercel (empfohlen)

Das Repo enthält ein minimales `vercel.json` (`{"name": "poke-app"}`). Importiere das Projekt auf Vercel, akzeptiere die Framework-Defaults, und der Produktions-Build läuft out of the box. Die Einstellung `revalidate = 3600` auf `/pokemon/[name]` wird automatisch berücksichtigt.

### Andere Plattformen

```bash
npm run build
npm run start  # Produktionsserver auf :3000
```

Stelle sicher, dass der Host die Next.js Image Optimization API unterstützt (oder rendere Bilder vorab in ein CDN).

## Mitwirken

Issues, Feature-Wünsche und Pull Requests sind willkommen. Bitte öffne zuerst ein Issue für jede nicht-triviale Änderung, damit wir den Ansatz besprechen können.

Beim Einreichen eines Pull Requests:

- Führe `npm run lint` und `npm run typecheck` lokal aus.
- Füge Tests hinzu oder aktualisiere sie, wenn sich das Verhalten ändert.
- Befolge die Konventionen in [`AGENTS.md`](./AGENTS.md) und den `AGENT.md`-Dateien der Unterordner.

## Danksagungen

- [PokéAPI](https://pokeapi.co) — die kanonische Open-Data-Quelle für das Franchise.
- [TCGdex](https://www.tcgdex.net) — der offene TCG-Katalog, der im Karten-Browser verwendet wird.
- [Vercel](https://vercel.com) — Hosting und Edge-Netzwerk.
- [shadcn/ui](https://ui.shadcn.com) — das `base-nova`-Preset, das das Design-System verankert.

## Kontakt

- Issues: <https://github.com/teefloo/Poke/issues>
- Sicherheits-Hinweise: siehe [`.well-known/security.txt`](./public/.well-known/security.txt)
- Autor: Esteban Deloge (<contact@primedex.app>)

## Marken

Pokémon, Pokémon-Charakternamen und zugehörige Eigenschaften sind Marken von Nintendo, Game Freak und The Pokémon Company. PrimeDex ist ein inoffizielles Fan-Projekt nur zu Bildungs- und Unterhaltungszwecken und ist weder mit diesen Entitäten verbunden, noch von ihnen unterstützt oder gesponsert.
