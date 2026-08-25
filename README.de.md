<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Lunidex-Logo" width="80" />

# Lunidex

**Ein fokussierter Pokémon-Arbeitsbereich für Spieler, Trainer und TCG-Sammler.**

[![Live](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Live-App](https://lunidex.app) · [Repository](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[Übersicht](#übersicht) · [Funktionen](#funktionen) · [Schnellstart](#schnellstart) · [Konfiguration](#konfiguration) · [Architektur](#architektur) · [Bereitstellung](#bereitstellung)

<img src="./public/screenshot-desktop.png" alt="Lunidex-Pokédex und Sammlungs-Dashboard auf dem Desktop" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · **Deutsch** · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Übersicht

Lunidex ist ein unabhängiges Open-Source-Monorepo mit npm workspaces. Es verbindet einen Pokédex, Pokémon-Referenzwerkzeuge, Team-Building-Tools, einen Pokémon-TCG-Katalog und einen persönlichen, kontogebundenen Arbeitsbereich.

Die Webanwendung umfasst **1.025 Pokémon aus neun Generationen** und unterstützt acht Oberflächensprachen: Englisch, Französisch, Spanisch, Deutsch, Italienisch, Japanisch, Koreanisch und vereinfachtes Chinesisch. Portugiesisch ist als übersetzte README-Datei verfügbar, aber keine Sprache der Weboberfläche.

Öffentliche Referenzseiten funktionieren ohne Konto. Der persönliche Arbeitsbereich — Favoriten, gefangene Pokémon, Teams, Quizfortschritt, TCG-Sammlungen, Wunschlisten, gespeicherte Suchen, Notizen, Decks und verwandte Funktionen — verwendet Neon Auth und Neon PostgreSQL, sobald diese konfiguriert und synchronisiert sind. Anzeigeeinstellungen im Web werden mit IndexedDB gespeichert; die Expo-App verwendet AsyncStorage.

> [!NOTE]
> Lunidex ist ein unabhängiges und inoffizielles Fanprojekt. Pokémon-Figurennamen, Marken, Illustrationen, Bilder und damit verbundene geistige Eigentumsrechte gehören den jeweiligen Rechteinhabern. Lunidex ist nicht mit Nintendo, Creatures Inc., GAME FREAK inc. oder The Pokémon Company verbunden, wird von ihnen nicht unterstützt oder gesponsert und ist nicht offiziell mit ihnen verknüpft.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Mobile Pokédex-Ansicht von Lunidex" width="280" />
</div>

## Funktionen

| Bereich | Was du tun kannst |
| --- | --- |
| **Pokédex und Referenz** | Alle 1.025 Pokémon durchsuchen und filtern; Werte, Typen, Fähigkeiten, Attacken, Entwicklungen, Formen, Fundorte, Sprites und lokalisierte Artdaten ansehen. Nach Attacken, Fähigkeiten und Items suchen. |
| **Team- und Kampflabor** | Teams mit bis zu sechs Pokémon erstellen, Typ- und Attackenabdeckung analysieren, Synergie und Rollen prüfen, bis zu drei Pokémon vergleichen, die 18-Typen-Tabelle verwenden, EV/IV planen, Zucht berechnen und einen Kampf-Simulator für Generation 9 ausführen. |
| **Fortschritt und Spiel** | Favoriten, gefangene Pokémon, Living Dex, Aktivitäten, Abzeichen und Quizstatistiken verfolgen. Mit drei Quiz-Herausforderungen und drei Spielmodi, einschließlich täglicher Läufe, spielen und einen Nuzlocke-Lauf verfolgen. |
| **Teilen und soziale Funktionen** | Showdown-Teams importieren und exportieren, schreibgeschützte Teamlinks teilen, öffentliche Profile erstellen, Freunde verwalten, Quizranglisten ansehen und kontogebundene Kampfräume nutzen. |
| **Pokémon-TCG-Arbeitsbereich** | Karten und Sets durchsuchen, den Katalog filtern, Karten vergleichen, eigene und gewünschte Karten verfolgen, den Setfortschritt prüfen, Suchen und Notizen speichern, Decks erstellen und Preisfelder anzeigen, wenn TCGdex sie bereitstellt. |
| **PWA und Speicherung** | Die Webanwendung als PWA installieren. Der Service Worker cached die App-Shell und ausgewählte externe Ressourcen für zuverlässigere wiederholte Besuche, während Kontodaten hinter der Server-API bleiben. |
| **Mobiler Begleiter** | Die Expo-App auf iOS, Android oder im Web mit gemeinsamen API-Clients, Typen, Zustand-Store, Speicherverträgen, Übersetzungen und Neon-Helfern aus `@primedex/core` nutzen. |

## Die App erkunden

Ersetze `en` durch eine unterstützte Sprache: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` oder `zh`.

| Oberfläche | Route |
| --- | --- |
| Startseite | [`/en`](https://lunidex.app/en) |
| Pokédex | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| Pokémon-Detailseite | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| Team-Builder | [`/en/team`](https://lunidex.app/en/team) |
| Typentabelle | [`/en/types`](https://lunidex.app/en/types) |
| Quiz | [`/en/quiz`](https://lunidex.app/en/quiz) |
| Kampf-Simulator | [`/en/battle`](https://lunidex.app/en/battle) |
| TCG-Katalog | [`/en/tcg`](https://lunidex.app/en/tcg) |
| TCG-Sammlung | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| Dashboard | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

Sammlung, Dashboard, soziale Funktionen und andere persönliche Bereiche können eine authentifizierte Synchronisierungssitzung erfordern.

## Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) 22
- npm und die versionierte `package-lock.json`
- [Git](https://git-scm.com/)

Repository klonen, Workspaces installieren und die Webanwendung starten:

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000). Der Locale-Proxy leitet eine URL ohne Präfix zu einer unterstützten Sprache wie `/de` um. Dabei werden das Cookie `primedex-lang` oder, falls vorhanden, die Browsersprache verwendet.

> [!IMPORTANT]
> Entwicklungs- und Produktionsbuilds verwenden absichtlich webpack: `npm run dev` führt `next dev --webpack` aus und `npm run build` führt `next build --webpack` aus. Behalte diese Option bei, auch wenn die Next.js-Konfiguration zusätzlich eine Turbopack-Root definiert.

## Mobile App

Der Expo-Begleiter befindet sich in [`apps/mobile`](./apps/mobile). Aktuell umfasst er Pokédex-Liste und -Suche, Detailseiten, Favoriten, Teams, Konto, Theme und Spracheinstellungen. Die vollständige Web-Parität ist noch nicht erreicht; die übrigen Werkzeuge bleiben in der Next.js-Anwendung verfügbar.

Aus dem Repository-Stamm starten:

```bash
npm run start --workspace=@primedex/mobile
```

Mit dem Expo-Menü kannst du iOS, Android oder eine Webvorschau öffnen. Das Package stellt außerdem die Skripte `android`, `ios` und `web` bereit:

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

Weitere Expo-spezifische Umgebungsvariablen und Architekturhinweise findest du in der [mobilen README](./apps/mobile/README.md).

## Konfiguration

Für öffentliche Referenzseiten sind keine Umgebungsvariablen erforderlich. Kopiere die Vorlage, wenn optionale Konto-, Server-, Kontakt-, Benachrichtigungs- oder Entwicklungsintegrationen aktiviert werden sollen:

```bash
cp .env.example .env.local
```

Für die Expo-App verwende `apps/mobile/.env.example` als Vorlage:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable(n) | Bereich | Zweck |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / öffentlich | Kanonische Site- und API-Basis-URL. Standard: `https://lunidex.app`. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / öffentlich | Neon-Auth-Endpunkt für den Browser-Client. |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Nur Server | Endpunkte für Neon-Auth-Proxy und JWT-Verifizierung. |
| `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWT_ISSUER`, `NEON_AUTH_JWT_AUDIENCE` | Nur Server | Schutz des Auth-Cookies und Einschränkungen für die JWT-Validierung. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | Nur Server | Neon-PostgreSQL-Verbindung. Die Vercel-Neon-Integration liefert `DATABASE_URL`; lokal kann `NEON_DATABASE_URL` verwendet werden. |
| `EXPO_PUBLIC_NEON_AUTH_URL`, `EXPO_PUBLIC_APP_URL` | Mobil / öffentlich | Von Expo verwendete Neon-Auth- und Deployment-Endpunkte. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / öffentlich | Optionaler Wert für die Google-Search-Console-Verifizierung. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Entwicklung | Aktiviert das Agentation-UI-Review-Overlay bei `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / öffentlich | Optionaler Schlüssel für Browser-Push-Abonnements. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Nur Server | Optionale serverseitige Konfiguration für Push-Zustellung. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Nur Server | Optionaler Versand des Kontaktformulars über Resend. |
| `SUPABASE_DB_URL` | Nur Migration | Quellverbindung für die vorhandenen Supabase-zu-Neon-Exports; niemals eine Web- oder Mobile-Runtime-Variable. |

> [!WARNING]
> Veröffentliche niemals Verbindungszeichenfolgen, JWKS-Einstellungen, Cookie-Secrets, private VAPID-Daten, Resend-Schlüssel oder Migrations-URLs über `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, Quelldateien, Logs oder Commits.

<details>
<summary><strong>Agentation in der Entwicklung aktivieren</strong></summary>

Füge diesen Wert zu `.env.local` hinzu und starte den Entwicklungsserver neu:

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

Das Tool verwendet `http://localhost:4747`; Entwicklungs-Origin und CSP-Unterstützung sind bereits konfiguriert.

</details>

## Skripte

Führe Root-Befehle aus dem Repository-Stamm aus:

| Befehl | Beschreibung |
| --- | --- |
| `npm run dev` | Startet den Next.js-Entwicklungsserver. |
| `npm run build` | Erstellt einen Produktionsbuild. |
| `npm run start` | Startet den Produktionsbuild. |
| `npm run lint` | Prüft Web-, Core- und Mobile-Quellen. |
| `npm run typecheck` | Prüft den Web-Workspace. |
| `npm run test -- --run` | Führt die Vitest-Suite einmal aus. |
| `npx vitest run path/to/file.test.ts` | Führt eine einzelne Testdatei aus. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Prüft `@primedex/core`. |
| `npm run typecheck --workspace=@primedex/mobile` | Prüft die Expo-App. |
| `npm run lint --workspace=@primedex/mobile` | Prüft die Expo-App mit ESLint. |
| `npm run db:neon:export` | Exportiert die erhaltenen Quelldaten für die Migration. |
| `npm run db:neon:import` | Wendet das Neon-Schema an und importiert einen vorbereiteten Export. |
| `npm run db:neon:verify` | Vergleicht Quelle und Ergebnis der Neon-Migration. |

> [!WARNING]
> Die Neon-Import- und Verifizierungsbefehle greifen auf externe Datenbanken zu. Lies vorher [`neon/AGENTS.md`](./neon/AGENTS.md) und [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md) und verwende ein freigegebenes Test- oder Staging-Ziel.

Der CI-Workflow in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) installiert Abhängigkeiten und führt Linting, Web- und Core-Typprüfungen, Tests, den Produktionsbuild sowie die Mobile-Typprüfung aus.

## Architektur

```text
.
├── src/                 Next.js-16-/React-19-Webanwendung
├── packages/core/       @primedex/core: gemeinsame API-Clients, Typen, Store, i18n und Helfer
├── apps/mobile/         @primedex/mobile Expo-Router-Begleiter
├── neon/migrations/     Aktives Neon-PostgreSQL-Anwendungsschema
├── supabase/            Erhaltene Quellmigrationen und Kompatibilitätsmaterial
├── scripts/neon/        Kontrollierte Export-, Import- und Verifizierungsskripte
├── public/              PWA-Icons, Screenshots, Kartenressourcen und statische Dateien
└── docs/                Produkt-, Design-, Migrations-, Audit- und Implementierungsnotizen
```

```text
Web (Next.js App Router)
  ├── Server- und Client-Routenkomponenten
  ├── TanStack Query ──▶ gemeinsame API-Clients ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ IndexedDB-Anzeigeeinstellungen
  └── Route Handlers ──▶ Neon Auth + Neon-PostgreSQL-Benutzerbereich

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + Neon Auth/API bei Konfiguration
```

Wichtige Grenzen:

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI, Framer Motion, TanStack Query und die PWA-Schicht.
- **Gemeinsamer Core:** UI-unabhängige Domänentypen, API-Clients, Zustand-Store, i18n-Bundles, Neon-Helfer und reine Utilities werden von Web und Mobile gemeinsam genutzt.
- **Datenzugriff:** Externe Anfragen laufen über die zentrale API-Fassade in `src/lib/api` und `packages/core/src/api`; Präsentationskomponenten erzeugen keine eigenen API-Clients.
- **Persistenz:** Web-Anzeigeeinstellungen verwenden IndexedDB mit Browser-Fallback; native Persistenz nutzt AsyncStorage. Der authentifizierte Arbeitsbereich wird über die Neon-API synchronisiert und in `user_state` gespeichert.
- **Plattformgrenze:** Passende `*.ts`- und `*.native.ts`-Adapter trennen Browser- und React-Native-Speicher/Konfiguration, ohne Domänenlogik zu duplizieren.
- **Lokalisierung:** Locale-präfixierte Routen und Übersetzungsbundles unterstützen `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` und `zh`.

> [!IMPORTANT]
> Lunidex ist der sichtbare Produktname, aber `primedex`, `@primedex/core`, `@primedex/mobile`, `usePrimeDexStore`, Speicherschlüssel, Route-Slugs, Expo-Schemas und Bundle-Identifier sind historische, kompatibilitätssensible Bezeichnungen. Ändere sie nur im Rahmen einer bewussten Migration.

## Datenquellen und Attribution

| Quelle | Verwendung |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST und GraphQL | Pokémon, Artenbeschreibungen, Werte, Typen, Attacken, Fähigkeiten, Entwicklungen, Fundorte und lokalisierte Namen. |
| [PokéAPI-Sprites](https://github.com/PokeAPI/sprites) | Pokémon- und Item-Sprites sowie zugehörige Illustrationsressourcen. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon-TCG-Karten, Sets, Seltenheiten, Bilder, Katalogfelder und Preisfelder, sofern von der Quelle geliefert. |
| [Neon](https://neon.com/) | Optionale Authentifizierung, PostgreSQL-Benutzerstatus, Profile, Freunde, Ranglisten, Kampfräume und serverseitige Arbeitsbereichsfunktionen. |

Verfügbarkeit, Lokalisierungsabdeckung, Bilder und Preisfelder der externen Quellen können sich ändern. Lunidex ist kein Kartenmarktplatz und garantiert weder Marktwerte noch eine vollständige Preishistorie.

Der Quellcode steht unter der MIT-Lizenz in [`LICENSE`](./LICENSE). Pokémon-Immaterialgüter und Daten von Drittanbietern unterliegen weiterhin den jeweiligen Eigentümern und Bedingungen.

## Bereitstellung

Lunidex ist für [Vercel](https://vercel.com/) konfiguriert und kann auch auf einem Host mit Next.js-Server-Runtime und Bildoptimierung ausgeführt werden.

```bash
npm run build
npm run start
```

Für Vercel:

1. Importiere `teefloo/Lunidex` in ein Vercel-Projekt.
2. Konfiguriere die Neon-Auth-Werte und die serverseitige Datenbankverbindung in Preview und Production.
3. Verwende die standardmäßigen Next.js-Build-Einstellungen. Die versionierte [`vercel.json`](./vercel.json) bleibt absichtlich minimal.

Die aktive Web-Runtime verwendet Neon. Die erhaltenen Supabase-Migrationen und kontrollierten Migrationsskripte dienen dem Vergleich, der Sicherung und der Migration; sie sind nicht die Authentifizierungs- oder Datenbank-Runtime der Webanwendung.

Weitere Informationen stehen im [Neon-Migrations-Runbook](./docs/neon-migration.md), einschließlich Schema, Umgebungsgrenzen und Validierungsverfahren.

## Zugehörige Dokumentation

- [Mobiles Setup und Paritätshinweise](./apps/mobile/README.md)
- [Produktkontext](./PRODUCT.md)
- [Designsystem](./DESIGN.md)
- [Neon-Migrations-Runbook](./docs/neon-migration.md)
- [GitHub-Issues](https://github.com/teefloo/Lunidex/issues)
