<!-- prettier-ignore -->
<div align="center">

# PrimeDex

### Um dashboard moderno de Pokédex construído com Next.js 16, React 19 e PokeAPI.

[PokeAPI](https://pokeapi.co/) · [TCGdex](https://www.tcgdex.net/) · [Vercel](https://vercel.com/) · [Licença](./LICENSE)

</div>

<!-- README-I18N:START -->
**English** · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [汉语](./README.zh.md) · **Português**
<!-- README-I18N:END -->

[Visão geral](#visao-geral) · [Funcionalidades](#funcionalidades) · [Início rápido](#inicio-rapido) · [Rotas](#rotas) · [Arquitetura](#arquitetura) · [Fontes de dados](#fontes-de-dados) · [Implantação](#implantacao)

## <a id="visao-geral"></a>Visão geral

PrimeDex é um dashboard de Pokédex multilíngue (9 idiomas) construído com Next.js 16 (App Router) e React 19. Ele consome a PokeAPI para dados de Pokémon, a TCGdex para o conjunto de cartas, e oferece comparações lado a lado, montagem de times, gerenciamento de favoritos, um quiz de tipos e um modo escuro completo. Todo o estado persistente (idioma, tema, favoritos, time, capturados, filtros) é salvo no IndexedDB via Zustand, então o app permanece rápido e funcional offline.

## <a id="funcionalidades"></a>Funcionalidades

- **Navegação multilíngue** entre 9 idiomas com roteamento por prefixo, detecção automática via cookie e cabeçalho `Accept-Language`.
- **Geração 1 estática**: a rota `/pokemon/[name]` pré-renderiza os 151 primeiros Pokémon com `revalidate = 3600`.
- **TanStack Query** com `staleTime` de 10 min e `gcTime` de 60 min para reduzir fetches repetidos.
- **Estado persistente em IndexedDB** (favoritos, time, capturados, histórico, filtros) através de `idb-keyval`.
- **Tema escuro/claro** com `next-themes`, persistido no store e sincronizado sem flash inicial.
- **Componentes pesados sob demanda** (`EvolutionChain`, `AdvancedInfo`, etc.) carregados via `next/dynamic`.
- **Painel TCG** com busca, filtros de conjunto e visualização de cartas em grade.
- **Quiz de tipos**, comparação de dois Pokémon e ferramenta de análise de times com cálculo de fraquezas.

## <a id="inicio-rapido"></a>Início rápido

```bash
npm install
npm run dev   # next dev --webpack (não turbopack) — http://localhost:3000
```

Variáveis de ambiente opcionais (todas têm valores padrão):

```bash
NEXT_PUBLIC_AGENTATION=false   # devtools do Agentation em http://localhost:4747
```

## <a id="rotas"></a>Rotas

| Rota              | Descrição                                              |
| ----------------- | ------------------------------------------------------ |
| `/`               | Listagem de Pokémon com filtros e busca                |
| `/pokemon/[name]` | Página de detalhes (estática para a Geração 1)         |
| `/team`           | Construtor e analisador de times (até 6)               |
| `/compare`        | Comparação lado a lado de dois Pokémon                 |
| `/favorites`      | Lista pessoal de Pokémon favoritos e capturados        |
| `/quiz`           | Quiz de tipos com pontuação                            |
| `/types`          | Matriz de eficácia de tipos                            |
| `/tcg`            | Cartas e conjuntos do TCG Pokémon                      |
| `/about`          | Sobre o projeto, créditos e fontes                     |
| `/cookies`        | Política de cookies                                    |

## <a id="arquitetura"></a>Arquitetura

```
┌──────────────────────────────────────────────┐
│ Next.js 16 (App Router, RSC por padrão)      │
├──────────────────────────────────────────────┤
│ Camada de UI (Tailwind v4 + shadcn/ui)       │
│  └── Componentes cliente: filtros, time, quiz │
├──────────────────────────────────────────────┤
│ TanStack Query (cache, hidratação, retry=1)  │
├──────────────────────────────────────────────┤
│ Camada de API (@/lib/api)                    │
│  ├── REST + GraphQL → pokeapi.co             │
│  └── REST → api.tcgdex.net                   │
├──────────────────────────────────────────────┤
│ Estado: Zustand + idb-keyval (IndexedDB)     │
└──────────────────────────────────────────────┘
```

### Stack técnica

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Estilização**: Tailwind CSS v4, `tailwindcss-animate`, `base-ui` primitives
- **Dados**: TanStack Query v5, Axios, GraphQL via `graphql-request`
- **Estado**: Zustand com persistência em IndexedDB (`idb-keyval`)
- **i18n**: `i18next` no cliente (carregamento preguiçoso), `server-i18n` no servidor
- **Tema**: `next-themes` + tokens CSS
- **Gráficos**: Recharts para radar e barras
- **Qualidade**: ESLint v9 (flat config), Prettier, Vitest + Testing Library

## <a id="fontes-de-dados"></a>Fontes de dados

| Fonte                            | Uso                                                    |
| -------------------------------- | ------------------------------------------------------ |
| [PokeAPI REST](https://pokeapi.co/) | Espécies, movimentos, habilidades, tipos, evoluções  |
| [PokeAPI GraphQL](https://pokeapi.co/api/v2/graphql)   | Consultas agregadas (time de criaturas, habitats) |
| [TCGdex](https://www.tcgdex.net/) | Cartas e conjuntos do TCG                              |

Todo o acesso passa pelo barramento `@/lib/api/`. Nunca faça `fetch` ou `axios` direto em componentes; as chaves de query são construídas a partir de `@/lib/api/keys`.

## <a id="implantacao"></a>Implantação

A aplicação é implantada na Vercel. O `vercel.json` está mínimo (`{"name": "poke-app"}`); toda a configuração (domínios, env, proteções) é gerenciada no painel da Vercel.

```bash
npm run build      # next build
npm run start      # produção local
```

Não há CI por enquanto — o pipeline vive na Vercel. Builds de preview são gerados para cada branch automaticamente.

### Cache e revalidação

- `revalidate = 3600` na rota `/pokemon/[name]` para a Geração 1.
- `generateStaticParams` materializa os 151 primeiros Pokémon no build.
- Demais rotas usam TanStack Query (`staleTime: 10min`, `gcTime: 60min`).

## Estrutura do projeto

```
src/
├── app/                # App Router: rotas, layouts, páginas
│   ├── [lang]/         # Segmento dinâmico de idioma
│   ├── pokemon/[name]/ # Página de detalhes (ISR)
│   └── tcg/            # Painel TCG
├── components/
│   ├── pokemon/        # Cartões, detalhes, cadeia evolutiva
│   ├── layout/         # Header, footer, nav
│   └── ui/             # primitivos shadcn (base-nova)
├── lib/
│   ├── api/            # Clientes REST + GraphQL
│   ├── i18n/           # bundles preguiçosos (cliente)
│   ├── server-i18n.ts  # todos os bundles (servidor)
│   └── utils/          # formatadores, helpers
├── store/              # Zustand: favoritos, time, capturados
├── hooks/              # useLocaleHref, useTheme, usePersistedStore
└── types/              # pokemon.ts (fonte de verdade)
```

## Acessibilidade

- WCAG 2.2 AA como linha de base.
- Todo controle só com ícone recebe `aria-label`.
- Toda imagem traz `alt` (ou `alt=""` quando decorativa).
- Foco visível em todos os elementos interativos.
- Suporte completo a navegação por teclado.

## Contribuindo

1. Faça um fork do repositório.
2. Crie uma branch a partir de `main` (`git checkout -b feat/minha-feature`).
3. Siga as convenções descritas em `AGENTS.md` e nos `AGENT.md` das subárvores.
4. Rode `npm run lint`, `npm run typecheck` e `npm run test` antes de abrir o PR.
5. Abra um Pull Request descrevendo a mudança e o motivo.

## Aviso legal

Pokémon, seus nomes, artes e marcas registradas são propriedade da Nintendo, Game Freak e The Pokémon Company. Este projeto é um derivado não oficial feito por fãs, sem afiliação. Os dados vêm de fontes públicas (PokeAPI, TCGdex); o código está sob a licença indicada em `./LICENSE`.

## Contato

- Repositório: [github.com/estebandeloge/Poke](https://github.com/estebandeloge/Poke)
- Texto de segurança: [`./public/.well-known/security.txt`](./public/.well-known/security.txt)

## Licença

Distribuído sob a licença indicada em [`./LICENSE`](./LICENSE).
