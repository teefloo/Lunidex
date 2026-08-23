<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logo Lunidex" width="80" />

# Lunidex

**Un Pokédex veloce, local-first e uno spazio Pokémon TCG per allenatori, collezionisti e fan curiosi.**

[![Live](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Panoramica](#panoramica) · [Avvio](#avvio) · [Funzionalità](#funzionalità) · [Architettura](#architettura) · [Configurazione](#configurazione) · [Distribuzione](#distribuzione)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · **Italiano** · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Panoramica

Lunidex è un monorepo open source composto da un'applicazione web Next.js, dal pacchetto TypeScript condiviso `@primedex/core` e da un'app mobile Expo. Riunisce il Pokédex nazionale, gli strumenti per la preparazione competitiva, gli strumenti per le collezioni Pokémon TCG e il monitoraggio dei progressi personali, senza richiedere un account.

L'app web copre **1.025 Pokémon di nove generazioni**. L'interfaccia è disponibile in inglese, francese, spagnolo, tedesco, italiano, giapponese, coreano e cinese semplificato; questo repository offre anche una traduzione portoghese del README.

> [!NOTE]
> Lunidex è un progetto di fan non commerciale. Dati, nomi e immagini Pokémon appartengono a Nintendo, Game Freak, Creatures e The Pokémon Company. Lunidex non è affiliato né approvato da tali società.

## Funzionalità

| Area | Cosa puoi fare |
| --- | --- |
| **Pokédex** | Sfogliare e filtrare tutti i 1.025 Pokémon; consultare statistiche, abilità, mosse, evoluzioni, forme, incontri, sprite e informazioni competitive. |
| **Strumenti di allenamento** | Creare squadre da sei, analizzare la copertura, confrontare Pokémon, esplorare la tabella dei tipi, pianificare EV e IV, calcolare l'allevamento e simulare lotte di nona generazione. |
| **Riferimenti** | Cercare mosse, abilità e strumenti, quindi usare verifiche di copertura e suggerimenti di counter. |
| **Progresso personale** | Conservare preferiti, Living Dex, squadre, pagine recenti, statistiche quiz e impostazioni in archiviazione locale persistente; esportare o importare lo stato in JSON. |
| **Modalità di gioco** | Giocare al quiz con sei modalità, seguire una sfida Nuzlocke e condividere squadre in sola lettura. |
| **Spazio TCG** | Scoprire carte e set, gestire collezione e lista desideri, confrontare carte, seguire prezzi e avvisi, e costruire mazzi da 60 carte. |
| **Offline e mobile** | Installare la PWA e riutilizzare le risorse già memorizzate in cache. L'app Expo comprende attualmente Pokédex, dettaglio, preferiti, squadre, account, tema e lingue. |

## Avvio

### Requisiti

- [Node.js](https://nodejs.org/) 20 o successivo
- npm 10 o successivo

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000). Lunidex reindirizza gli URL senza prefisso a un percorso locale come `/it`, usando il cookie `primedex-lang` o l'header `Accept-Language` del browser.

> [!IMPORTANT]
> Lo sviluppo usa webpack intenzionalmente: `npm run dev` esegue `next dev --webpack`. Mantieni questo comando anche se la configurazione Next dichiara anche una root Turbopack.

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia Next.js in sviluppo sulla porta 3000. |
| `npm run build` | Crea la build di produzione. |
| `npm run start` | Avvia la build di produzione. |
| `npm run lint` | Esegue ESLint 9. |
| `npm run typecheck` | Controlla TypeScript senza produrre file. |
| `npm run test` | Esegue Vitest in jsdom. |

### App mobile

Il compagno Expo si trova in [`apps/mobile`](./apps/mobile) e utilizza il pacchetto condiviso [`@primedex/core`](./packages/core).

```bash
cd apps/mobile
npx expo start
```

Il prompt Expo consente di aprire iOS, Android, web o Expo Go. Consulta il [README mobile](./apps/mobile/README.md) per gli schermi supportati.

## Configurazione

Non è richiesta alcuna variabile d'ambiente per consultare il Pokédex in locale. Crea un file `.env.local` non versionato solo per abilitare un'integrazione facoltativa.

| Variabile | Scopo |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Sostituisce l'URL pubblico canonico; il valore predefinito è `https://lunidex.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Abilita autenticazione Supabase e sincronizzazione cloud facoltative. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave pubblica associata all'URL Supabase. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Abilita abbonamenti push per gli avvisi di prezzo TCG. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Aggiunge i metadati di verifica Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Abilita la barra di revisione UI Agentation durante lo sviluppo. |

> [!TIP]
> Senza Supabase, Lunidex resta pienamente utilizzabile in modalità local-first: preferiti, squadre, catture, filtri e progressi TCG restano nel browser. Per mobile usa `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env`.

<details>
<summary><strong>Abilitare Agentation in sviluppo</strong></summary>

Aggiungi questo valore a `.env.local` e riavvia il server:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

Lo strumento gira su `http://localhost:4747`; origine di sviluppo e CSP sono già configurati.

</details>

## Architettura

```text
Poke/
├── src/                 Applicazione web Next.js 16 (App Router)
├── packages/core/       @primedex/core: API, stato, tipi, i18n, helper, Supabase
├── apps/mobile/         Compagno Expo / React Native
├── supabase/migrations/ Migrazioni facoltative dello schema Supabase
└── public/              Icone PWA, screenshot e risorse statiche
```

```text
Componenti React server e client
  ├── Hook TanStack Query (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Selettori Zustand (@/store/primedex) ──▶ IndexedDB web / AsyncStorage mobile
```

- **Interfaccia:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Base UI e Framer Motion. I Server Components sono la scelta predefinita.
- **Dati:** client API centralizzati con Axios e ritenti; TanStack Query gestisce la cache e le chiavi di query sono centralizzate.
- **Stato:** Zustand persiste i dati personali come ID e primitive in IndexedDB sul web e AsyncStorage su mobile.
- **Lingue e resilienza:** i18next carica i bundle client su richiesta e le traduzioni server alimentano il rendering statico. La PWA mette in cache shell e risorse selezionate di PokéAPI, TCGdex, immagini e Next.

## Fonti dati

| Fonte | Utilizzo |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST e GraphQL | Pokémon, testi delle specie, mosse, abilità, tipi, evoluzioni e incontri. |
| [TCGdex](https://www.tcgdex.net/) | Carte Pokémon TCG, set, immagini, rarità e dati del catalogo. |
| [Supabase](https://supabase.com/) | Autenticazione facoltativa, sincronizzazione cloud, profili pubblici, dati di gioco e avvisi prezzo TCG. |

I componenti non interrogano questi servizi direttamente: le richieste passano attraverso il layer API del progetto.

## Distribuzione

Lunidex è configurato per Vercel e può essere eseguito su qualsiasi piattaforma che supporti un runtime Next.js e l'ottimizzazione delle immagini.

```bash
npm run build
npm run start
```

Su Vercel importa il repository, mantieni le impostazioni standard di Next.js e aggiungi le variabili pubbliche facoltative nel dashboard. [`vercel.json`](./vercel.json) resta intenzionalmente minimale.

## Ringraziamenti

Lunidex si basa su [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/) e sui progetti open source utilizzati nell'applicazione.

Pokémon e tutte le proprietà correlate sono marchi dei rispettivi titolari. Questo progetto di fan è non ufficiale e non commerciale.
