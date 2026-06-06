<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logo PrimeDex" align="center" width="80" />

# PrimeDex

**Il Pokédex online più completo, pensato per allenatori che tengono a velocità, dati e design.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

Una dashboard Next.js 16 + React 19 ad alte prestazioni per l'intero Pokédex Nazionale: statistiche, tipi, evoluzioni, creazione squadre, carte TCG e un quiz, il tutto in 9 lingue.

[Panoramica](#panoramica) · [Funzionalità](#funzionalita) · [Avvio rapido](#avvio-rapido) · [Rotte](#rotte) · [Architettura](#architettura) · [Origini dati](#origini-dati) · [Distribuzione](#distribuzione)

![PrimeDex — anteprima desktop](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · **Italiano** · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Panoramica

PrimeDex è una dashboard Pokédex open source per giocatori competitivi, collezionisti TCG e fan curiosi. Copre tutti i **1.025 Pokémon** su 9 generazioni, con nomi localizzati in 9 lingue, confronti di statistiche affiancati, un builder di squadra basato sulla copertura dei tipi e un catalogo TCG con oltre 25.000 carte.

L'app è costruita sulla [PokéAPI](https://pokeapi.co) ufficiale (REST + GraphQL) e [TCGdex](https://www.tcgdex.net), con TanStack Query per la cache, Zustand per lo stato persistente della UI (IndexedDB) e l'App Router di Next.js per i componenti server e la generazione statica per rotta.

> [!NOTE]
> Questo è un progetto fan non commerciale. I dati, i nomi e le immagini Pokémon sono © Nintendo, Game Freak e The Pokémon Company.

## Funzionalità

- **Pokédex Nazionale completo** — Tutti i 1.025 Pokémon, ogni forma, ogni generazione, con nomi localizzati e testi descrittivi.
- **Builder di squadra** — Crea una squadra di 6, ottieni l'analisi della copertura dei tipi in tempo reale, il rilevamento delle debolezze condivise e un punteggio di sinergia.
- **Motore di confronto** — Analisi affiancata fino a 3 Pokémon con grafici radar interattivi e dettaglio delle statistiche base.
- **Tabella dei tipi** — Copertura interattiva di tutti i 18 tipi con forze, debolezze, resistenze e immunità.
- **Database delle mosse** — Elenco filtrabile per potenza, precisione, PP, tipo, categoria e descrizione dettagliata degli effetti.
- **Catalogo TCG** — Oltre 25.000 carte ricercabili per set, rarità, tipo, stadio e PS, con tracciamento di collezione e wishlist.
- **Quiz** — 6 modalità di gioco: Classica, Sagoma, Statistiche, Contro il tempo, Sopravvivenza e Maratona.
- **Tracker del Living Dex** — Gestione persistente delle catture, completamente offline, salvata localmente nel tuo browser.
- **9 lingue** — Inglese, francese, tedesco, spagnolo, italiano, giapponese, coreano, cinese semplificato, portoghese brasiliano.
- **Ricerca avanzata** — Filtraggio multidimensionale per generazione, tipo, BST, gruppi uova e stato speciale.
- **Pronto per SEO & AEO** — JSON-LD (`WebApplication`, `ItemList`, `FAQPage`, `HowTo`), alternative `hreflang`, scoperta `llms.txt` / `ai.txt` e sitemap generata.

## Avvio rapido

### Prerequisiti

- [Node.js](https://nodejs.org) 20+
- npm 10+ (incluso con Node.js)
- Una shell compatibile POSIX (gli script inclusi usano invocazioni in stile `bash`)

### Esecuzione locale

```bash
# 1. Clona il repository
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. Installa le dipendenze
npm install

# 3. Avvia il dev server (webpack, non Turbopack)
npm run dev
```

L'app è ora in esecuzione su <http://localhost:3000>. Il middleware reindirizzerà `/` alla tua lingua preferita in base al cookie `primedex-lang` o all'header `Accept-Language` del browser.

> [!IMPORTANT]
> `npm run dev` è bloccato su `next dev --webpack` per un HMR stabile con l'App Router e i confini `next/dynamic`. Non passare a Turbopack in locale — la dichiarazione di `turbopack.root` in `next.config.ts` è intenzionale e deve restare.

### Strumento dev Agentation (opzionale)

PrimeDex include [Agentation](https://github.com/tldraw/agentation) per la revisione dell'UI assistita dall'IA. Per abilitarlo, aggiungi quanto segue a `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

La toolbar sarà servita su <http://localhost:4747> (CSP e `allowedDevOrigins` sono già preconfigurati).

## Stack tecnologico

| Livello          | Strumenti                                                                           |
| ---------------- | ----------------------------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev)        |
| Linguaggio       | [TypeScript 5](https://www.typescriptlang.org) (strict, 100 % tipizzato)             |
| Styling          | [Tailwind CSS v4](https://tailwindcss.com), [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| Primitive UI     | [`@base-ui/react`](https://base-ui.com), `shadcn/ui` (preset `base-nova`)            |
| Animazione       | [Framer Motion](https://www.framer.com/motion/)                                     |
| Fetch dei dati   | [TanStack Query v5](https://tanstack.com/query)                                     |
| Stato client     | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| Grafici          | [Recharts](https://recharts.org)                                                    |
| i18n             | [i18next](https://www.i18next.com/) + `react-i18next`                               |
| HTTP             | [Axios](https://axios-http.com) + `axios-retry` (backoff esponenziale)              |
| Tooling          | ESLint v9 (flat config), Vitest + Testing Library, Puppeteer (QA visiva)            |

## Rotte

Tutte le rotte hanno il prefisso della lingua (`/en`, `/fr`, `/ja`…). Il middleware gestisce redirect 308 e rewrite in modo trasparente.

| Percorso                  | Descrizione                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `/`                       | Home con hero, Pokémon in evidenza e la griglia completa del Pokédex.        |
| `/pokemon/[name]`         | Pagina di dettaglio con statistiche, tipi, evoluzioni, abilità, mosse e set. |
| `/team`                   | Builder di squadra da 6 con copertura dei tipi in diretta e punteggio di sinergia. |
| `/compare`                | Confronto affiancato di fino a 3 Pokémon.                                    |
| `/favorites`              | Lista personale dei Pokémon preferiti.                                       |
| `/quiz`                   | "Who's That Pokémon?" con 6 modalità di gioco.                               |
| `/types`                  | Tabella dei tipi interattiva per tutti i 18 tipi.                             |
| `/moves`                  | Database delle mosse ricercabile.                                            |
| `/tcg`                    | Catalogo TCG Pokémon con filtri per set, rarità, tipo e PS.                  |
| `/tcg/cards/[id]`         | Dettaglio di una singola carta TCG.                                          |
| `/tcg/collection`         | Tracker della tua collezione di carte.                                       |
| `/tcg/wishlist`           | Wishlist TCG.                                                                |
| `/about`                  | Missione, fonti dati e contatti.                                             |
| `/faq`                    | Domande frequenti.                                                           |
| `/cookies` `/legal` `/privacy` `/terms` | Pagine legali.                                                  |

La pagina dinamica `/pokemon/[name]` usa `generateStaticParams` per i primi 151 Pokémon e `revalidate = 3600` per la rigenerazione statica incrementale.

## Architettura

### Flusso dei dati

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Selettori Zustand (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- Tutte le chiamate HTTP passano per il barrel `@/lib/api`; i componenti non usano mai `fetch` o `axios` direttamente.
- Le chiavi di query sono centralizzate in `@/lib/api/keys` per un'invalidazione stabile.
- Lo store Zustand contiene solo ID e primitivi (preferiti, squadra, catturati, filtri, cronologia, impostazioni) ed è persistito in IndexedDB. Lo stato locale **non** è tenuto in `localStorage`.
- I componenti pesanti (`EvolutionChain`, `AdvancedInfo`, `PokemonCards`) sono caricati tramite `next/dynamic` per mantenere snello il primo paint.

### Internazionalizzazione

- Lingue supportate: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`.
- Il codice client usa `@/lib/i18n` con bundle di lingua caricati in lazy; l'inglese è il bundle iniziale.
- Il codice server usa `@/lib/server-i18n` con tutti i bundle integrati per SSG/SSR.
- Ogni pagina dichiara alternative `hreflang` e un `x-default` che punta a `/en`.
- Il cookie `primedex-lang` persiste la preferenza dell'utente per 1 anno.

### Prestazioni

- Server Components di default; `"use client"` è riservato alle foglie che hanno bisogno di interattività.
- `next/image` per tutte le immagini (AVIF + WebP), con una `remotePatterns` stretta.
- Generazione statica per `/pokemon/[name]` (primi 151) + ISR ogni ora.
- Cache immutabile per `/_next/static`, cache di 1 giorno per le immagini, cache di 1 ora per `sitemap.xml` e `llms.txt`.
- Default TanStack Query: `staleTime` 10 min, `gcTime` 60 min, `retry` 1, niente `refetchOnWindowFocus`.

### Sicurezza

- Header rinforzati su ogni rotta: `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS con `preload`, `Referrer-Policy` stretta, `Permissions-Policy` bloccata.
- Viene applicata una Content-Security-Policy rigida. Sorgente: vedi `next.config.ts`.
- I retry di Axios gestiscono errori di rete transitori e HTTP 429 con backoff esponenziale.

## Origini dati

| Fonte                                                                 | Usata per                                          |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| [PokéAPI](https://pokeapi.co) (REST)                                  | Pokémon, mosse, abilità, tipi, incontri            |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                    | Nomi localizzati delle specie e testi descrittivi  |
| [TCGdex](https://www.tcgdex.net)                                      | Carte, set e rarità del TCG Pokémon                |
| [Sprite PokeAPI](https://github.com/PokeAPI/sprites)                  | Artwork ufficiali e sprite animate                 |

Tutti i dati sono recuperati lato server e rivalidati ogni 3.600 secondi. L'attribuzione delle fonti è mostrata su ogni pagina Pokémon.

## Configurazione

L'app legge un piccolo numero di variabili d'ambiente. Nessuna è richiesta per lo sviluppo locale.

| Variabile                          | Default                     | Scopo                                          |
| ---------------------------------- | --------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`              | `https://primedex.vercel.app` | URL canonico del sito                        |
| `NEXT_PUBLIC_ENABLE_AGENTATION`   | _(non impostata)_            | Attiva la toolbar dev Agentation               |

## Script

| Comando                             | Descrizione                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `npm run dev`                       | Avvia il dev server con webpack su `:3000`.              |
| `npm run build`                     | Build di produzione.                                     |
| `npm run start`                     | Esegue il build di produzione.                          |
| `npm run lint`                      | ESLint v9 con la flat config del progetto.               |
| `npm run typecheck`                 | `tsc --noEmit` su tutto il progetto.                     |
| `npm run test`                      | Vitest (jsdom) — vedi `vitest.config.ts`.                |
| `npx vitest path/to/file.test.ts`   | Esegue un singolo file di test.                          |
| `npx vitest --ui`                   | Apre la UI di Vitest.                                    |

> [!NOTE]
> Prima di aggiungere test, assicurati che `src/test/setup.ts` esista. La config di Vitest punta già a quel file; attualmente è uno stub. Senza, `npm run test` non si avvierà.

## Layout del progetto

```
src/
├── app/                # Next.js App Router — le rotte vivono qui
│   ├── api/            # Route handlers (TCG)
│   ├── [locale]        # Rotte con prefisso lingua
│   ├── layout.tsx      # Layout radice (RSC)
│   ├── providers.tsx   # TanStack Query, tema, provider i18n
│   └── ...
├── components/         # UI riutilizzabile (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # Helper TS puri + barrel API
│   ├── api/            # Client REST + GraphQL + TCG
│   ├── i18n/           # Bundle di lingua (lazy lato client)
│   ├── server-i18n.ts  # Traduzioni lato server
│   └── ...
├── store/primedex.ts   # Store Zustand (solo ID e primitivi)
├── types/pokemon.ts    # Single source of truth per i tipi di dominio
├── hooks/              # Custom React hook
└── middleware.ts       # Redirect 308 e rewrite per lingua

public/                 # Asset statici (icone, screenshot, sprite di fallback)
```

## Distribuzione

PrimeDex è una normale app Next.js 16 e si distribuisce su qualsiasi piattaforma che supporti l'output standalone di Next.js.

### Vercel (consigliata)

Il repo include un `vercel.json` minimale (`{"name": "poke-app"}`). Importa il progetto su Vercel, accetta i default del framework, e il build di produzione funzionerà out of the box. L'impostazione `revalidate = 3600` su `/pokemon/[name]` viene rispettata automaticamente.

### Altre piattaforme

```bash
npm run build
npm run start  # server di produzione su :3000
```

Assicurati che l'host supporti l'API di ottimizzazione delle immagini di Next.js (oppure pre-renderizza le immagini su una CDN).

## Contribuire

Issue, richieste di funzionalità e pull request sono benvenuti. Apri prima un'issue per qualsiasi modifica non banale, così possiamo discuterne l'approccio.

Quando invii una pull request:

- Esegui `npm run lint` e `npm run typecheck` in locale.
- Aggiungi o aggiorna i test quando il comportamento cambia.
- Segui le convenzioni in [`AGENTS.md`](./AGENTS.md) e nei file `AGENT.md` dei sottoalberi.

## Riconoscimenti

- [PokéAPI](https://pokeapi.co) — la fonte dati aperta canonica per il franchise.
- [TCGdex](https://www.tcgdex.net) — il catalogo TCG aperto usato nel browser delle carte.
- [Vercel](https://vercel.com) — hosting e rete edge.
- [shadcn/ui](https://ui.shadcn.com) — il preset `base-nova` che ancora il design system.

## Contatti

- Issue: <https://github.com/teefloo/Poke/issues>
- Divulgazione di sicurezza: vedi [`.well-known/security.txt`](./public/.well-known/security.txt)
- Autore: Esteban Deloge (<contact@primedex.app>)

## Marchi

Pokémon, i nomi dei personaggi Pokémon e le proprietà correlate sono marchi di Nintendo, Game Freak e The Pokémon Company. PrimeDex è un progetto fan non ufficiale solo a scopo educativo e di intrattenimento, e non è affiliato, approvato o sponsorizzato da nessuna di queste entità.
