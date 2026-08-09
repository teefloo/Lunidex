<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Lunidex-Logo" width="80" />

# Lunidex

**Ein schneller, local-first Pokédex und Pokémon-TCG-Arbeitsbereich für Trainer, Sammler und neugierige Fans.**

[![Live](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Überblick](#überblick) · [Start](#start) · [Funktionen](#funktionen) · [Architektur](#architektur) · [Konfiguration](#konfiguration) · [Bereitstellung](#bereitstellung)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · **Deutsch** · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Überblick

Lunidex ist ein Open-Source-Monorepo mit einer Next.js-Webanwendung, dem gemeinsamen TypeScript-Paket `@primedex/core` und einer Expo-Mobile-Begleitapp. Es vereint den Nationalen Pokédex, Werkzeuge für das kompetitive Training, Pokémon-TCG-Sammlungswerkzeuge und persönliche Fortschrittsverfolgung – ohne dass ein Konto erforderlich ist.

Die Webanwendung deckt **1.025 Pokémon aus neun Generationen** ab. Ihre Oberfläche ist auf Englisch, Französisch, Spanisch, Deutsch, Italienisch, Japanisch, Koreanisch und vereinfachtem Chinesisch verfügbar; dieses Repository enthält außerdem eine portugiesische README-Übersetzung.

> [!NOTE]
> Lunidex ist ein nicht kommerzielles Fanprojekt. Pokémon-Daten, -Namen und -Bilder gehören Nintendo, Game Freak, Creatures und The Pokémon Company. Lunidex ist mit ihnen weder verbunden noch von ihnen unterstützt.

## Funktionen

| Bereich | Möglichkeiten |
| --- | --- |
| **Pokédex** | Alle 1.025 Pokémon durchsuchen und filtern; Werte, Fähigkeiten, Attacken, Entwicklungen, Formen, Fundorte, Sprites und kompetitive Informationen ansehen. |
| **Training** | Sechserteams erstellen, Typabdeckung analysieren, Pokémon vergleichen, die Typentabelle erkunden, EVs und IVs planen, Zuchtwahrscheinlichkeiten berechnen und Kämpfe der neunten Generation simulieren. |
| **Nachschlagewerk** | Attacken, Fähigkeiten und Items suchen sowie Coverage-Prüfungen und Kontervorschläge nutzen. |
| **Persönlicher Fortschritt** | Favoriten, Living Dex, Teams, zuletzt besuchte Seiten, Quiz-Statistiken und Einstellungen persistent lokal speichern und als JSON exportieren oder importieren. |
| **Spielmodi** | Das Quiz mit sechs Modi spielen, einen Nuzlocke-Lauf verfolgen und Teams schreibgeschützt teilen. |
| **TCG-Bereich** | Karten und Sets entdecken, Sammlung und Wunschliste verwalten, Karten vergleichen, Preisverlauf und Alarme verfolgen sowie 60-Karten-Decks bauen. |
| **Offline und mobil** | Die PWA installieren und zuvor verwendete Ressourcen zwischengespeichert wiederverwenden. Die Expo-App umfasst derzeit Pokédex, Detailseite, Favoriten, Teams, Konto, Theme und Sprachen. |

## Start

### Voraussetzungen

- [Node.js](https://nodejs.org/) 20 oder neuer
- npm 10 oder neuer

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000). Lunidex leitet URLs ohne Präfix anhand des Cookies `primedex-lang` oder des Browser-Headers `Accept-Language` zu einer Sprachroute wie `/de` weiter.

> [!IMPORTANT]
> Die Entwicklung verwendet absichtlich webpack: `npm run dev` führt `next dev --webpack` aus. Behalten Sie diesen Befehl bei, auch wenn die Next-Konfiguration zusätzlich ein Turbopack-Root festlegt.

| Befehl | Beschreibung |
| --- | --- |
| `npm run dev` | Startet Next.js im Entwicklungsmodus auf Port 3000. |
| `npm run build` | Erstellt den Produktions-Build. |
| `npm run start` | Startet den Produktions-Build. |
| `npm run lint` | Führt ESLint 9 aus. |
| `npm run typecheck` | Prüft TypeScript ohne Dateien zu erzeugen. |
| `npm run test` | Führt Vitest in jsdom aus. |

### Mobile App

Die Expo-Begleitapp befindet sich in [`apps/mobile`](./apps/mobile) und verwendet das gemeinsame Paket [`@primedex/core`](./packages/core).

```bash
cd apps/mobile
npx expo start
```

Über die Expo-Eingabe können Sie iOS, Android, Web oder Expo Go öffnen. Welche Screens unterstützt werden, steht im [mobilen README](./apps/mobile/README.md).

## Konfiguration

Zum lokalen Durchsuchen des Pokédex sind keine Umgebungsvariablen erforderlich. Legen Sie eine nicht versionierte `.env.local` nur für optionale Integrationen an.

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Überschreibt die kanonische öffentliche URL; Standard ist `https://lunidex.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Aktiviert optionale Supabase-Authentifizierung und Cloud-Synchronisierung. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Schlüssel zur Supabase-URL. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Aktiviert Push-Abonnements für TCG-Preisalarme. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Fügt Google-Search-Console-Verifizierungsmetadaten hinzu. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Aktiviert die Agentation-UI-Review-Leiste in der Entwicklung. |

> [!TIP]
> Ohne Supabase bleibt Lunidex im local-first-Modus voll nutzbar: Favoriten, Teams, Fänge, Filter und TCG-Fortschritt liegen im Browser-Speicher. Für Mobile setzen Sie `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env`.

<details>
<summary><strong>Agentation in der Entwicklung aktivieren</strong></summary>

Fügen Sie diesen Wert zu `.env.local` hinzu und starten Sie den Server neu:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

Das Hilfsprogramm läuft auf `http://localhost:4747`; Entwicklungs-Origin und CSP sind bereits eingerichtet.

</details>

## Architektur

```text
Poke/
├── src/                 Next.js-16-Webanwendung (App Router)
├── packages/core/       @primedex/core: API, State, Typen, i18n, Helfer, Supabase
├── apps/mobile/         Expo-/React-Native-Begleitapp
├── supabase/migrations/ Optionale Supabase-Schema-Migrationen
└── public/              PWA-Icons, Screenshots und statische Dateien
```

```text
React-Server- und Client-Komponenten
  ├── TanStack-Query-Hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Zustand-Selektoren (@/store/primedex) ──▶ IndexedDB im Web / AsyncStorage mobil
```

- **Oberfläche:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Base UI und Framer Motion. Server Components sind der Standard.
- **Daten:** Zentrale API-Clients verwenden Axios mit Wiederholungen; TanStack Query verwaltet den Cache und die Query Keys sind zentral definiert.
- **State:** Zustand persistiert persönliche Daten als IDs und Primitive in IndexedDB im Web bzw. AsyncStorage auf Mobilgeräten.
- **Sprachen und Resilienz:** i18next lädt Client-Bundles bei Bedarf, Serverübersetzungen versorgen statisches Rendering. Die PWA cached ihr Shell sowie ausgewählte PokéAPI-, TCGdex-, Bild- und Next-Ressourcen.

## Datenquellen

| Quelle | Verwendung |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST und GraphQL | Pokémon, Spezies-Texte, Attacken, Fähigkeiten, Typen, Entwicklungen und Fundorte. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon-TCG-Karten, Sets, Bilder, Seltenheiten und Katalogdaten. |
| [Supabase](https://supabase.com/) | Optionale Authentifizierung, Cloud-Synchronisierung, öffentliche Profile, Spieldaten und TCG-Preisalarme. |

Komponenten rufen diese Dienste nicht direkt auf: Anfragen laufen durch die API-Schicht des Projekts.

## Bereitstellung

Lunidex ist für Vercel konfiguriert und läuft auf jeder Plattform mit Next.js-Server-Runtime und Bildoptimierung.

```bash
npm run build
npm run start
```

Importieren Sie das Repository in Vercel, behalten Sie die Standard-Next.js-Einstellungen bei und hinterlegen Sie optionale öffentliche Variablen im Dashboard. [`vercel.json`](./vercel.json) ist absichtlich minimal.

## Danksagung

Lunidex baut auf [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/) und den in der Anwendung genutzten Open-Source-Projekten auf.

Pokémon und alle zugehörigen Eigenschaften sind Marken ihrer jeweiligen Inhaber. Dieses Fanprojekt ist inoffiziell und nicht kommerziell.
