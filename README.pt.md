<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logótipo do Lunidex" width="80" />

# Lunidex

**Uma Pokédex rápida e local-first, e um espaço Pokémon TCG para treinadores, colecionadores e fãs curiosos.**

[![Live](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Visão geral](#visão-geral) · [Começar](#começar) · [Funcionalidades](#funcionalidades) · [Arquitetura](#arquitetura) · [Configuração](#configuração) · [Implantação](#implantação)

</div>

<!-- README-I18N:START -->

[English](./README.md) · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · **Português**

<!-- README-I18N:END -->

## Visão geral

O Lunidex é um monorepo open source composto por uma aplicação web Next.js, pelo pacote TypeScript partilhado `@primedex/core` e por um companheiro móvel Expo. Reúne a Pokédex Nacional, ferramentas de preparação competitiva, ferramentas de coleção Pokémon TCG e acompanhamento de progresso pessoal sem exigir uma conta.

A aplicação web cobre os **1.025 Pokémon de nove gerações**. A sua interface está disponível em inglês, francês, espanhol, alemão, italiano, japonês, coreano e chinês simplificado; este repositório também disponibiliza esta tradução portuguesa do README.

> [!NOTE]
> O Lunidex é um projeto de fãs não comercial. Os dados, nomes e imagens Pokémon pertencem à Nintendo, Game Freak, Creatures e The Pokémon Company. O Lunidex não é afiliado nem aprovado por estas empresas.

## Funcionalidades

| Área | O que pode fazer |
| --- | --- |
| **Pokédex** | Explorar e filtrar os 1.025 Pokémon; consultar estatísticas, habilidades, movimentos, evoluções, formas, encontros, sprites e informação competitiva. |
| **Ferramentas de treino** | Criar equipas de seis, analisar cobertura, comparar Pokémon, explorar a tabela de tipos, planear EV e IV, calcular criação e simular batalhas da nona geração. |
| **Referência** | Pesquisar movimentos, habilidades e itens, e usar verificações de cobertura e sugestões de counters. |
| **Progresso pessoal** | Guardar favoritos, Living Dex, equipas, páginas recentes, estatísticas do quiz e definições em armazenamento local persistente; exportar ou importar o estado em JSON. |
| **Modos de jogo** | Jogar o quiz de seis modos, acompanhar uma corrida Nuzlocke e partilhar equipas em modo só de leitura. |
| **Espaço TCG** | Descobrir cartas e conjuntos, gerir coleção e lista de desejos, comparar cartas, acompanhar preços e alertas, e construir baralhos de 60 cartas. |
| **Offline e móvel** | Instalar a PWA e reutilizar recursos já guardados em cache. A aplicação Expo inclui atualmente Pokédex, detalhe, favoritos, equipas, conta, tema e idiomas. |

## Começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou posterior
- npm 10 ou posterior

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O Lunidex redireciona URLs sem prefixo para uma rota de idioma como `/en`, com base no cookie `primedex-lang` ou no cabeçalho `Accept-Language` do navegador. A interface web não disponibiliza atualmente uma rota em português.

> [!IMPORTANT]
> O desenvolvimento usa webpack intencionalmente: `npm run dev` executa `next dev --webpack`. Mantenha este comando mesmo que a configuração Next também declare uma raiz Turbopack.

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js na porta 3000. |
| `npm run build` | Cria a build de produção. |
| `npm run start` | Serve a build de produção. |
| `npm run lint` | Executa ESLint 9. |
| `npm run typecheck` | Verifica TypeScript sem produzir ficheiros. |
| `npm run test` | Executa Vitest em jsdom. |

### Aplicação móvel

O companheiro Expo encontra-se em [`apps/mobile`](./apps/mobile) e consome o pacote partilhado [`@primedex/core`](./packages/core).

```bash
cd apps/mobile
npx expo start
```

O menu Expo permite abrir iOS, Android, web ou Expo Go. Consulte o [README móvel](./apps/mobile/README.md) para os ecrãs suportados.

## Configuração

Não é necessária nenhuma variável de ambiente para navegar pela Pokédex localmente. Crie um `.env.local` não versionado apenas para ativar uma integração opcional.

| Variável | Finalidade |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Substitui o URL público canónico; o padrão é `https://lunidex.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Ativa autenticação Supabase e sincronização cloud opcionais. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública associada ao URL Supabase. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Ativa subscrições push para alertas de preço TCG. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Adiciona metadados de verificação do Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Ativa a barra de revisão de UI Agentation durante o desenvolvimento. |

> [!TIP]
> Sem Supabase, o Lunidex continua plenamente utilizável em modo local-first: favoritos, equipas, capturas, filtros e progresso TCG ficam no armazenamento do navegador. No móvel, use `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` em `apps/mobile/.env`.

<details>
<summary><strong>Ativar Agentation em desenvolvimento</strong></summary>

Adicione este valor a `.env.local` e reinicie o servidor:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

A ferramenta funciona em `http://localhost:4747`; a origem de desenvolvimento e a CSP já estão configuradas.

</details>

## Arquitetura

```text
Poke/
├── src/                 Aplicação web Next.js 16 (App Router)
├── packages/core/       @primedex/core: API, estado, tipos, i18n, helpers, Supabase
├── apps/mobile/         Companheiro Expo / React Native
├── supabase/migrations/ Migrações opcionais do esquema Supabase
└── public/              Ícones PWA, capturas e recursos estáticos
```

```text
Componentes React de servidor e cliente
  ├── Hooks TanStack Query (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Seletores Zustand (@/store/primedex) ──▶ IndexedDB web / AsyncStorage móvel
```

- **Interface:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Base UI e Framer Motion. Server Components são o padrão.
- **Dados:** clientes API centralizados usam Axios com tentativas; TanStack Query gere a cache e as chaves de query são centralizadas.
- **Estado:** Zustand persiste dados pessoais como IDs e primitivas em IndexedDB na web e AsyncStorage no móvel.
- **Idiomas e resiliência:** i18next carrega os bundles cliente sob demanda e as traduções do servidor alimentam a renderização estática. A PWA guarda em cache o shell e recursos selecionados de PokéAPI, TCGdex, imagens e Next.

## Fontes de dados

| Fonte | Utilização |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST e GraphQL | Pokémon, textos de espécies, movimentos, habilidades, tipos, evoluções e encontros. |
| [TCGdex](https://www.tcgdex.net/) | Cartas Pokémon TCG, conjuntos, imagens, raridades e informações do catálogo. |
| [Supabase](https://supabase.com/) | Autenticação opcional, sincronização cloud, perfis públicos, dados de jogo e alertas de preço TCG. |

Os componentes não consultam estes serviços diretamente: os pedidos passam pela camada API do projeto.

## Implantação

O Lunidex está configurado para Vercel e pode correr em qualquer plataforma que suporte um runtime Next.js e otimização de imagens.

```bash
npm run build
npm run start
```

No Vercel, importe o repositório, mantenha as definições padrão do Next.js e adicione variáveis públicas opcionais no painel. [`vercel.json`](./vercel.json) é intencionalmente mínimo.

## Agradecimentos

O Lunidex apoia-se em [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/) e nos projetos open source usados na aplicação.

Pokémon e todas as propriedades relacionadas são marcas dos respetivos titulares. Este projeto de fãs é não oficial e não comercial.
