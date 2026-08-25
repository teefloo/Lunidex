<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Logo Lunidex" width="80" />

# Lunidex

**Uno spazio Pokémon dedicato a giocatori, allenatori e collezionisti TCG.**

[![Online](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[App online](https://lunidex.app) · [Repository](https://github.com/teefloo/Lunidex) · [Issue](https://github.com/teefloo/Lunidex/issues)

[Panoramica](#panoramica) · [Funzionalità](#funzionalità) · [Avvio rapido](#avvio-rapido) · [Configurazione](#configurazione) · [Architettura](#architettura) · [Distribuzione](#distribuzione)

<img src="./public/screenshot-desktop.png" alt="Dashboard desktop di Pokédex e collezione Lunidex" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · **Italiano** · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Panoramica

Lunidex è un monorepo npm-workspaces indipendente e open source che riunisce un Pokédex, strumenti di riferimento Pokémon, strumenti per creare squadre, un catalogo Pokémon TCG e uno spazio personale associato a un account.

L’app web include **1.025 Pokémon di nove generazioni** e supporta otto lingue dell’interfaccia: inglese, francese, spagnolo, tedesco, italiano, giapponese, coreano e cinese semplificato. Il portoghese è disponibile come README tradotto, ma non è una lingua dell’interfaccia web.

Le pagine di riferimento pubbliche funzionano senza account. Lo spazio personale — preferiti, Pokémon catturati, squadre, progressi del quiz, collezioni TCG, wishlist, ricerche salvate, note, mazzi e funzioni correlate — usa Neon Auth e Neon PostgreSQL quando sono configurati e sincronizzati. Le preferenze di visualizzazione web usano IndexedDB; l’app Expo usa AsyncStorage.

> [!NOTE]
> Lunidex è un progetto indipendente e non ufficiale realizzato dai fan. I nomi dei personaggi Pokémon, i marchi, le illustrazioni, le immagini e la relativa proprietà intellettuale appartengono ai rispettivi titolari. Lunidex non è affiliato, approvato, sponsorizzato né ufficialmente collegato a Nintendo, Creatures Inc., GAME FREAK inc. o The Pokémon Company.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Vista mobile del Pokédex Lunidex" width="280" />
</div>

## Funzionalità

| Area | Cosa puoi fare |
| --- | --- |
| **Pokédex e riferimento** | Consultare e filtrare tutti i 1.025 Pokémon; vedere statistiche, tipi, abilità, mosse, evoluzioni, forme, incontri, sprite e dati localizzati sulle specie. Cercare mosse, abilità e strumenti. |
| **Laboratorio squadre e lotte** | Creare squadre fino a sei Pokémon, analizzare la copertura di tipi e mosse, controllare sinergie e ruoli, confrontare fino a tre Pokémon, usare la tabella dei 18 tipi, pianificare EV/IV, calcolare l’allevamento ed eseguire un simulatore di lotte di generazione 9. |
| **Progressi e gioco** | Tenere traccia di preferiti, Pokémon catturati, Living Dex, attività, medaglie e statistiche del quiz. Giocare con tre sfide e tre modalità, incluse le sessioni giornaliere, e seguire una partita Nuzlocke. |
| **Condivisione e funzioni social** | Importare ed esportare squadre Showdown, condividere link di squadre in sola lettura, creare profili pubblici, gestire amici, consultare le classifiche del quiz e usare stanze di lotta associate all’account. |
| **Spazio Pokémon TCG** | Sfogliare carte e set, filtrare il catalogo, confrontare carte, seguire carte possedute e desiderate, controllare i progressi dei set, salvare ricerche e note, creare mazzi e mostrare i campi prezzo quando TCGdex li fornisce. |
| **PWA e persistenza** | Installare l’app web come PWA. Il service worker memorizza nella cache il guscio dell’app e alcune risorse upstream per rendere più affidabili le visite successive, mentre i dati dell’account restano dietro l’API server. |
| **Companion mobile** | Usare l’app Expo su iOS, Android o web con client API, tipi, stato Zustand, contratti di persistenza, traduzioni e helper Neon condivisi da `@primedex/core`. |

## Esplora l’app

Sostituisci `en` con una lingua supportata: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` o `zh`.

| Superficie | Route |
| --- | --- |
| Home | [`/en`](https://lunidex.app/en) |
| Pokédex | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| Dettaglio Pokémon | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| Team builder | [`/en/team`](https://lunidex.app/en/team) |
| Tabella dei tipi | [`/en/types`](https://lunidex.app/en/types) |
| Quiz | [`/en/quiz`](https://lunidex.app/en/quiz) |
| Simulatore di lotte | [`/en/battle`](https://lunidex.app/en/battle) |
| Catalogo TCG | [`/en/tcg`](https://lunidex.app/en/tcg) |
| Collezione TCG | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| Dashboard | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

Collezione, dashboard, funzioni social e altri spazi personali possono richiedere una sessione di sincronizzazione autenticata.

## Avvio rapido

### Prerequisiti

- [Node.js](https://nodejs.org/) 22
- npm e il `package-lock.json` versionato
- [Git](https://git-scm.com/)

Clona il repository, installa i workspace e avvia l’app web:

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000). Il proxy delle lingue reindirizza un URL senza prefisso verso una lingua supportata come `/it`, usando il cookie `primedex-lang` o la lingua del browser quando disponibile.

> [!IMPORTANT]
> Le build di sviluppo e produzione usano intenzionalmente webpack: `npm run dev` esegue `next dev --webpack` e `npm run build` esegue `next build --webpack`. Mantieni l’opzione anche se la configurazione Next.js dichiara anche una root Turbopack.

## App mobile

Il companion Expo si trova in [`apps/mobile`](./apps/mobile). Al momento include elenco e ricerca del Pokédex, pagine di dettaglio, preferiti, squadre, account, tema e impostazioni della lingua. La parità completa con il web non è ancora disponibile; gli altri strumenti restano nell’app Next.js.

Avvialo dalla radice del repository:

```bash
npm run start --workspace=@primedex/mobile
```

Il menu Expo permette di aprire iOS, Android o un’anteprima web. Il package espone anche gli script `android`, `ios` e `web`:

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

Consulta il [README mobile](./apps/mobile/README.md) per le variabili d’ambiente e le note architetturali specifiche di Expo.

## Configurazione

Non sono necessarie variabili d’ambiente per consultare le pagine pubbliche di riferimento. Copia il modello per attivare integrazioni opzionali per account, server, contatti, notifiche o sviluppo:

```bash
cp .env.example .env.local
```

Per l’app Expo usa `apps/mobile/.env.example` come modello:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variabile | Ambito | Scopo |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / pubblico | URL canonico del sito e base API. Predefinito: `https://lunidex.app`. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / pubblico | Endpoint Neon Auth usato dal client browser. |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Solo server | Endpoint del proxy Neon Auth e della verifica JWT. |
| `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWT_ISSUER`, `NEON_AUTH_JWT_AUDIENCE` | Solo server | Protezione del cookie di autenticazione e vincoli di validazione JWT. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | Solo server | Connessione PostgreSQL Neon. L’integrazione Neon di Vercel fornisce `DATABASE_URL`; in locale puoi usare `NEON_DATABASE_URL`. |
| `EXPO_PUBLIC_NEON_AUTH_URL`, `EXPO_PUBLIC_APP_URL` | Mobile / pubblico | Endpoint Neon Auth e dell’applicazione distribuita usati da Expo. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / pubblico | Valore opzionale per la verifica Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Sviluppo | Attiva l’overlay di revisione UI Agentation quando vale `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / pubblico | Chiave opzionale per gli abbonamenti alle notifiche push del browser. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Solo server | Configurazione opzionale per l’invio delle notifiche push lato server. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Solo server | Invio opzionale del modulo di contatto tramite Resend. |
| `SUPABASE_DB_URL` | Solo migrazione | Connessione alla sorgente conservata usata dagli script di esportazione Supabase-Neon; mai una variabile runtime web o mobile. |

> [!WARNING]
> Non esporre mai stringhe di connessione, impostazioni JWKS, segreti dei cookie, materiale privato VAPID, chiavi Resend o URL di migrazione tramite `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, file sorgente, log o commit.

<details>
<summary><strong>Attivare Agentation durante lo sviluppo</strong></summary>

Aggiungi questo valore a `.env.local` e riavvia il server di sviluppo:

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

Lo strumento usa `http://localhost:4747`; l’origine di sviluppo e il supporto CSP sono già configurati.

</details>

## Script

Esegui i comandi root dalla radice del repository:

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia il server di sviluppo Next.js. |
| `npm run build` | Crea una build di produzione. |
| `npm run start` | Serve la build di produzione. |
| `npm run lint` | Controlla le sorgenti web, core e mobile. |
| `npm run typecheck` | Controlla il workspace web. |
| `npm run test -- --run` | Esegue la suite Vitest una volta. |
| `npx vitest run path/to/file.test.ts` | Esegue un file di test mirato. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Controlla `@primedex/core`. |
| `npm run typecheck --workspace=@primedex/mobile` | Controlla l’app Expo. |
| `npm run lint --workspace=@primedex/mobile` | Esegue il lint dell’app Expo. |
| `npm run db:neon:export` | Esporta i dati della sorgente conservata per la migrazione. |
| `npm run db:neon:import` | Applica lo schema Neon e importa un export preparato. |
| `npm run db:neon:verify` | Confronta sorgente e risultato della migrazione Neon. |

> [!WARNING]
> I comandi di import e verifica Neon accedono a database esterni. Leggi [`neon/AGENTS.md`](./neon/AGENTS.md) e [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md) e usa una destinazione di test o staging approvata.

Il workflow CI in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) installa le dipendenze ed esegue lint, controlli dei tipi web/core, test, build di produzione e controllo dei tipi mobile.

## Architettura

```text
.
├── src/                 Applicazione web Next.js 16 / React 19
├── packages/core/       @primedex/core: client API, tipi, store, i18n e helper condivisi
├── apps/mobile/         Companion Expo Router @primedex/mobile
├── neon/migrations/     Schema applicativo PostgreSQL Neon attivo
├── supabase/            Migrazioni sorgente conservate e materiale di compatibilità
├── scripts/neon/        Script controllati di export, import e verifica
├── public/              Icone PWA, screenshot, risorse per le carte e file statici
└── docs/                Note di prodotto, design, migrazione, audit e implementazione
```

```text
Web (Next.js App Router)
  ├── Componenti di route server e client
  ├── TanStack Query ──▶ client API condivisi ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ preferenze di visualizzazione IndexedDB
  └── Route Handlers ──▶ Neon Auth + spazio utente PostgreSQL Neon

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + Neon Auth/API quando configurati
```

Confini principali:

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI, Framer Motion, TanStack Query e livello PWA.
- **Core condiviso:** tipi di dominio indipendenti dall’interfaccia, client API, store Zustand, bundle i18n, helper Neon e utilità pure condivisi tra web e mobile.
- **Accesso ai dati:** le richieste remote passano dalla facciata API centralizzata in `src/lib/api` e `packages/core/src/api`; i componenti presentazionali non creano client API ad hoc.
- **Persistenza:** le preferenze di visualizzazione web usano IndexedDB con fallback del browser; la persistenza nativa usa AsyncStorage. Lo spazio autenticato viene sincronizzato tramite l’API Neon e salvato in `user_state`.
- **Livello piattaforma:** gli adapter `*.ts` e `*.native.ts` separano storage e configurazione browser/React Native senza duplicare la logica di dominio.
- **Localizzazione:** route con prefisso locale e bundle di traduzione supportano `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` e `zh`.

> [!IMPORTANT]
> Lunidex è il nome visibile del prodotto, ma `primedex`, `@primedex/core`, `@primedex/mobile`, `usePrimeDexStore`, le chiavi di storage, gli slug delle route, gli scheme Expo e gli identificativi bundle sono nomi storici sensibili alla compatibilità. Modificali solo nell’ambito di una migrazione deliberata.

## Fonti dati e attribuzione

| Fonte | Utilizzo |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST e GraphQL | Pokémon, testi delle specie, statistiche, tipi, mosse, abilità, evoluzioni, incontri e nomi localizzati. |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Sprite di Pokémon e strumenti e risorse grafiche correlate. |
| [TCGdex](https://www.tcgdex.net/) | Carte Pokémon TCG, set, rarità, immagini, campi del catalogo e campi prezzo quando forniti dalla sorgente. |
| [Neon](https://neon.com/) | Autenticazione opzionale, stato utente PostgreSQL, profili, amici, classifiche, stanze di lotta e funzioni server dello spazio personale. |

La disponibilità delle fonti upstream, la copertura delle lingue, le immagini e i campi prezzo possono cambiare. Lunidex non è un marketplace di carte e non garantisce valutazioni di mercato né una copertura completa dello storico prezzi.

Il codice sorgente è distribuito con licenza MIT in [`LICENSE`](./LICENSE). La proprietà intellettuale Pokémon e i dati di terze parti restano soggetti ai rispettivi proprietari e termini.

## Distribuzione

Lunidex è configurato per [Vercel](https://vercel.com/) e può essere eseguito anche su un host che supporti il runtime server Next.js e l’ottimizzazione delle immagini.

```bash
npm run build
npm run start
```

Per Vercel:

1. Importa `teefloo/Lunidex` in un progetto Vercel.
2. Configura i valori Neon Auth e la connessione al database solo server in Preview e Production.
3. Usa le impostazioni di build standard di Next.js. Il [`vercel.json`](./vercel.json) versionato resta intenzionalmente minimale.

Il runtime web attivo usa Neon. Le migrazioni Supabase conservate e gli script di migrazione controllati servono per confronto, backup e attività di migrazione; non sono il runtime di autenticazione o database dell’applicazione web.

Consulta il [runbook della migrazione Neon](./docs/neon-migration.md) per schema, confini degli ambienti e procedura di validazione.

## Documentazione correlata

- [Setup e note di parità mobile](./apps/mobile/README.md)
- [Contesto del prodotto](./PRODUCT.md)
- [Sistema di design](./DESIGN.md)
- [Runbook della migrazione Neon](./docs/neon-migration.md)
- [Issue GitHub](https://github.com/teefloo/Lunidex/issues)
