# Graph Report - Lunidex  (2026-09-26)

## Corpus Check
- Large corpus: 636 files · ~379,314 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4710 nodes · 14635 edges · 154 communities (143 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Class Utilities
- Localization and App State
- Move Data and Query Cache
- Server Side Localization
- TCG Research Interface
- Neon Security and Mutations
- TCG Collection Views
- SEO Metadata
- Legacy Sync Compatibility
- Shared UI Utilities
- API Rate Limiting
- Sealed TCG Server
- Not Found Mini Game
- Supported Application Languages
- TCG Card Detail Interface
- Shared TCG API
- Sealed Portfolio Interface
- Shared Neon Authentication
- Web TCG Collection
- TCG API Client
- Dashboard Data
- GraphQL Server Cache
- Localized TCG Search
- Pokemon Domain API
- Structured SEO Metadata
- Core Sync Compatibility
- Authentication API Routes
- Sitemap Generation
- Team and Compare Pages
- Sealed Collection Ledger
- Shared Collection State
- Quiz API Routes
- Error Observability
- Localized Header
- Stat Planning Tools
- Localized Home Experience
- TCG Research API
- Web Authentication Provider
- Friends Features
- Locale Routing
- Shared Persistent Store
- Web Application Providers
- Shared TCG Types
- Analytics Privacy Controls
- Items and User Profiles
- Anniversary Collection
- SEO Build Configuration
- Workspace Package Overrides
- Pokemon Detail Pages
- Pokemon Breeding Tools
- Web Package Dependencies
- Open Graph API Routes
- Battle Simulator Logic
- Collection Variant Controls
- Product Analytics Consent
- Anniversary Card Data
- TCG User State
- Mobile Package Dependencies
- Neon Account Schema
- Shared Team Analysis
- Quiz Experience
- Profile Progress Store
- Sealed Product API
- Shared Pokemon Types
- Pokemon Form Names
- TCG Card and Set Pages
- Mobile Pokemon Pages
- Analytics Dependencies
- Anniversary User Interface
- Mobile Providers and Localization
- Mobile Theme System
- Neon Authentication Services
- Error Reporting Client
- Friends API Routes
- Team Generation Filters
- Application Notifications
- Mobile REST Data Hooks
- Pokemon Filter State
- Social Image Helpers
- Move Detail Page
- Shared GraphQL Cache
- Quiz Share Image API
- Expo Runtime Configuration
- UI Component Configuration
- TCG Price History API
- Analytics Identity Consent
- Privacy and Cookie Pages
- Pokemon List Interface
- TCG Price Charts
- Mobile Account Localization
- Home Collection Previews
- Mobile Package Manifest
- Sealed Collection History
- Sealed Portfolio Analytics
- Web Root Layout
- Holographic Card Effects
- Web TypeScript Configuration
- Core Package Configuration
- Shared API Cache Storage
- TCG Ownership and Languages
- Cardmarket Sealed Imports
- Server Analytics
- Localized Legal Content
- Battle Room Services
- Web API Cache
- Route Error Interface
- Anniversary Page Data
- Anniversary Data Migration
- Core TypeScript Configuration
- Lint Tooling
- Competitive Pokemon Data
- Sealed Product Types
- Contact API
- Analytics Product API
- Pokemon Card API
- Continuous Integration Workflow
- Install Prompt Interface
- Cookie Consent Interface
- Legacy Quiz Sync
- Mobile Core Exports
- Workspace Build Scripts
- Test Configuration
- Social Image Rendering
- Team Comparison Suggestions
- Move Coverage Analysis
- Mobile TypeScript Configuration
- Core UI Utilities
- In Memory API Cache
- Pokemon Encounter Data
- Cardmarket Product Links
- Persistent Storage Layer
- Pokemon Held Items
- Mobile Build Scripts
- Bug Report Interface
- Pokemon Team Paste Parser
- TCG Collection Valuation
- Accessible Color Utilities
- TCG User Cards API
- Sitemap Index Route
- Pokemon Artwork Data
- TCG Rarity Rules
- Saved TCG Searches
- Home Text Animation
- Social Image Optimization
- Neon Import Script
- Neon Migration Verification
- Share Link Builder
- TCG Album Actions
- Native Neon API Settings
- Legacy Data Export Script
- Vercel Cron Configuration
- PostCSS Build Configuration
- Web Push Worker

## God Nodes (most connected - your core abstractions)
1. `useTranslation` - 244 edges
2. `cn()` - 211 edges
3. `next` - 182 edges
4. `getServerLanguage()` - 181 edges
5. `getServerT()` - 173 edges
6. `react` - 160 edges
7. `usePrimeDexStore` - 153 edges
8. `lucide-react` - 135 edges
9. `t()` - 119 edges
10. `buildSubpathLanguages()` - 91 edges

## Surprising Connections (you probably didn't know these)
- `NeonSyncBridge()` --calls--> `useNeonSync()`  [EXTRACTED]
  apps/mobile/src/providers/AppProviders.tsx → packages/core/src/supabase/useSupabaseSync.ts
- `AccountScreen()` --calls--> `useAuth()`  [EXTRACTED]
  apps/mobile/app/(tabs)/account.tsx → packages/core/src/neon/AuthProvider.tsx
- `AccountScreen()` --calls--> `usePrimeDexStore`  [EXTRACTED]
  apps/mobile/app/(tabs)/account.tsx → packages/core/src/store/primedex.ts
- `FavoritesScreen()` --calls--> `usePrimeDexStore`  [EXTRACTED]
  apps/mobile/app/(tabs)/favorites.tsx → packages/core/src/store/primedex.ts
- `TeamScreen()` --calls--> `usePrimeDexStore`  [EXTRACTED]
  apps/mobile/app/(tabs)/team.tsx → packages/core/src/store/primedex.ts

## Import Cycles
- 1-file cycle: `next.config.ts -> next.config.ts`
- 1-file cycle: `src/app/api/analytics/product/route.ts -> src/app/api/analytics/product/route.ts`
- 1-file cycle: `scripts/seo-check.mjs -> scripts/seo-check.mjs`

## Communities (154 total, 10 thin omitted)

### Community 0 - "UI Class Utilities"
Cohesion: 0.04
Nodes (102): react, @base-ui/react, class-variance-authority, cmdk, lucide-react, ResetPasswordPage(), EVIVPageClient(), TABS (+94 more)

### Community 1 - "Localization and App State"
Cohesion: 0.06
Nodes (90): AbilitiesPageClient(), ComparePage(), DashboardPage(), FavoritesPage(), ItemCard(), ItemsPageClient(), itemSpriteUrl(), SortKey (+82 more)

### Community 2 - "Move Data and Query Cache"
Cohesion: 0.03
Nodes (64): @tanstack/react-query, framer-motion, SortKey, buildLearners(), groupLearnersByMethod(), MoveDetailModal(), MoveDetailModalProps, PokemonLearnerCard() (+56 more)

### Community 3 - "Server Side Localization"
Cohesion: 0.07
Nodes (83): generateMetadata(), generateMetadata(), AboutPage(), generateMetadata(), generateMetadata(), BattlePage(), generateMetadata(), generateMetadata() (+75 more)

### Community 4 - "TCG Research Interface"
Cohesion: 0.05
Nodes (66): next, getTCGCardLanguageName(), TCG_CARD_LANGUAGES, TCGCardLanguage, BattleRoomSection(), TCGSetAlbumPageProps, TCGCollectionPage(), formatReleaseDate() (+58 more)

### Community 5 - "Neon Security and Mutations"
Cohesion: 0.06
Nodes (83): getAccountExport(), BattleChatMessage, BattleRoomRow, BattleTeamMember, GET, getBattleRoom(), isPlainObject(), parseTeam() (+75 more)

### Community 6 - "TCG Collection Views"
Cohesion: 0.05
Nodes (71): LocalizedSetAlbumPage(), formatCardValue(), formatCurrency(), TCGActiveSetInsights(), TCGActiveSetInsightsProps, TCGAlbumPage(), TCGAlbumPageProps, EmptyCollectionState() (+63 more)

### Community 7 - "SEO Metadata"
Cohesion: 0.07
Nodes (49): next, dynamicParams, Props, revalidate, revalidate, SwordsIcon, revalidate, BreedingPage() (+41 more)

### Community 8 - "Legacy Sync Compatibility"
Cohesion: 0.05
Nodes (67): DataExportImport(), ExportPayload, getImportPreview(), ImportPreview, validateImportPayload(), NeonSyncBridge(), AuthContext, retryAsync() (+59 more)

### Community 9 - "Shared UI Utilities"
Cohesion: 0.05
Nodes (55): TCGCollectionCardOwnership, BreedingPageClient(), BreedingPageClientProps, isTabId(), TabId, EncounterLocations, DeckCard(), FriendCollection() (+47 more)

### Community 10 - "API Rate Limiting"
Cohesion: 0.09
Nodes (55): DELETE, deleteAlias(), GET, getAlias(), PUT, putAlias(), GET, getCatalogue() (+47 more)

### Community 11 - "Sealed TCG Server"
Cohesion: 0.06
Nodes (62): Sealed Price Snapshot, sealedHistoryDays(), EXPANSION_ALIASES, getSealedCardmarketUrl(), getSealedImageCandidates(), normalizeSearch(), parseSealedCatalogueSearch(), removePhrase() (+54 more)

### Community 12 - "Not Found Mini Game"
Cohesion: 0.06
Nodes (68): advanceMazeGame(), cloneCoord(), coordKey(), countWalkableNeighbors(), createGeneratedRows(), createMazeGame(), createMazeLayout(), createMazeRound() (+60 more)

### Community 13 - "Supported Application Languages"
Cohesion: 0.05
Nodes (56): i18next, runtime, EditorialComparisonPage(), generateMetadata(), getPageContext(), PageProps, revalidate, EditorialFeatureGuidePage() (+48 more)

### Community 14 - "TCG Card Detail Interface"
Cohesion: 0.06
Nodes (46): getTCGDefaultPhysicalVariant(), handleToggle(), handleMigrationAction(), handleReset(), TCGAlbumCard, ActionPill(), formatCardList(), formatRetreatCost() (+38 more)

### Community 15 - "Shared TCG API"
Cohesion: 0.07
Nodes (55): buildCardQueryParams(), cardMatchesLocalFilters(), compareCards(), compareCollectorNumbers(), compareDates(), compareStrings(), DEFAULT_TCG_CARD_FILTERS, fetchAllCardSearchPages() (+47 more)

### Community 16 - "Sealed Portfolio Interface"
Cohesion: 0.06
Nodes (45): Sealed Transaction, Sealed Transaction Draft, AliasEditor(), AnalyticsView(), CashflowView(), CatalogueView(), CollectionView(), DashboardView() (+37 more)

### Community 17 - "Shared Neon Authentication"
Cohesion: 0.07
Nodes (39): AppSession, AppUser, AuthContext, AuthContextValue, AuthProvider(), AuthResult, disabledValue(), mapSession() (+31 more)

### Community 18 - "Web TCG Collection"
Cohesion: 0.08
Nodes (54): TCG_DEFAULT_VARIANT_ORDER, aggregateCollectionValue(), aggregateCollectionValueBySet(), aggregateCollectionValueWithSets(), aggregateCollectionValueWithVariants(), aggregateSetTotalValue(), compareCollectionCardsByImportance(), computeActiveSetInsights() (+46 more)

### Community 19 - "TCG API Client"
Cohesion: 0.05
Nodes (55): cardMatchesLocalFilters(), compareCards(), compareCollectorNumbers(), compareDates(), compareStrings(), fetchAllCardSearchPages(), fetchCollectionSetAlbumForLanguage(), FetchCollectionValueOptions (+47 more)

### Community 20 - "Dashboard Data"
Cohesion: 0.06
Nodes (49): ExtensibleSectionProps, ACTION_ICONS, formatDate(), GeneralActivity(), GeneralActivityProps, PokedexProgressProps, ProfileAndBadgesProps, PublicProfileCardProps (+41 more)

### Community 21 - "GraphQL Server Cache"
Cohesion: 0.08
Nodes (54): setCachedData(), buildPokemonDetailedSelection(), buildPokemonSearchSelection(), buildPokemonSummarySelection(), EXCLUDED_ITEM_CATEGORIES, fetchBatch(), fetchMoveBatches(), fetchPokemonBatches() (+46 more)

### Community 22 - "Localized TCG Search"
Cohesion: 0.07
Nodes (53): GET, getTcgCollectionSetCards(), GET, getTcgSets(), loadCollectionSetCatalog(), getAllSetsPersistent, getCollectionSetAlbumPersistent, getInitialTcgCatalogPersistent (+45 more)

### Community 23 - "Pokemon Domain API"
Cohesion: 0.06
Nodes (48): AdvancedInfo, PokemonDetailClientProps, AdvancedInfo(), AdvancedInfoProps, EncounterLocationsProps, PokemonBuildsProps, GqlPokemonData, PokemonCardProps (+40 more)

### Community 24 - "Structured SEO Metadata"
Cohesion: 0.09
Nodes (46): Anniversary30Page(), FACT_KEYS, FAQ_NUMBERS, generateMetadata(), getAnniversary30CardLink(), getPageContext(), PRODUCT_MONTH_LABEL_KEYS, PRODUCT_MONTHS (+38 more)

### Community 25 - "Core Sync Compatibility"
Cohesion: 0.08
Nodes (49): useAuth(), fetchAppApi(), PersistedState, SYNCED_KEYS, SyncedKey, onSyncAccessRetry(), setSyncAccessStatus(), advanceSyncMetadata() (+41 more)

### Community 26 - "Authentication API Routes"
Cohesion: 0.07
Nodes (43): claimDeletion(), ClaimedDeletionRow, DELETE, deleteAccount(), DeletePayload, DeletionState, DeletionStateRow, getDeletionState() (+35 more)

### Community 27 - "Sitemap Generation"
Cohesion: 0.09
Nodes (49): GET(), isSitemapFamily(), revalidate, ANNIVERSARY_30_INDEXABLE_LANGUAGES, ANNIVERSARY_30_LAST_MODIFIED_DATE, getAllAbilityNamesCached, getAllItemNamesCached, getAllMoveNamesCached (+41 more)

### Community 28 - "Team and Compare Pages"
Cohesion: 0.07
Nodes (39): zustand, recharts, Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer (+31 more)

### Community 29 - "Sealed Collection Ledger"
Cohesion: 0.09
Nodes (44): allocateCost(), allocateOutgoingLots(), assertInteger(), assertProductId(), assertText(), calculateSealedMarketChangePercent(), dateFromDay(), dayDifference() (+36 more)

### Community 30 - "Shared Collection State"
Cohesion: 0.17
Nodes (44): addTCGCollectionCard(), adjustTCGCollectionVariantQuantity(), assignLegacyTCGSetToCollection(), COLLECTION_VARIANTS, copyTCGLegacyOwnedCards(), countPhysicalTCGCards(), createTCGCollection(), decodeTCGCollectionCardKey() (+36 more)

### Community 31 - "Quiz API Routes"
Cohesion: 0.07
Nodes (41): AnswerRow, AttemptPayload, invalidAttempt(), isUniqueViolation(), isUuid(), NewAttemptRow, noStoreHeaders(), POST (+33 more)

### Community 32 - "Error Observability"
Cohesion: 0.08
Nodes (38): dependencies, axios, axios-retry, GET, getPSData(), getSmogonData(), revalidate, runtime (+30 more)

### Community 33 - "Localized Header"
Cohesion: 0.07
Nodes (32): AccountMenu(), AccountMenuProps, AuthModal, AuthModalBoundary, AuthModalBoundaryProps, AuthModalBoundaryState, AuthModalLoadError(), HomeLanguageSelect() (+24 more)

### Community 34 - "Stat Planning Tools"
Cohesion: 0.07
Nodes (39): EVIVCalculator, EVPlanner, BaseStats, calcHP(), calcStat(), DEFAULT_EVS, DEFAULT_STATS, EVIVCalculator() (+31 more)

### Community 35 - "Localized Home Experience"
Cohesion: 0.09
Nodes (28): HomeHeader(), HomeHeaderProps, artworkUrl(), HomeTeamPreview(), TEAM_PREVIEW, FooterLinkData, FooterLinkGroup(), FooterLinkGroupProps (+20 more)

### Community 36 - "TCG Research API"
Cohesion: 0.09
Nodes (38): buildCounts(), buildFacets(), GET, getTcgSearch(), normalizeFilters(), TCGResearchDesk(), getFilterOptions(), buildInsightLines() (+30 more)

### Community 37 - "Web Authentication Provider"
Cohesion: 0.12
Nodes (39): normalizeDisplayName(), AppSession, AppUser, asRuntimeAuthClient(), AuthActionResponse, AuthContextValue, AuthErrorLike, AuthProvider() (+31 more)

### Community 38 - "Friends Features"
Cohesion: 0.09
Nodes (31): FriendPrivacyCard(), EMPTY_RELATIONS, FRIENDS_QUERY_KEY, FriendsClient(), RelationRow(), callApi(), CollectionPageResponse, DecksResponse (+23 more)

### Community 39 - "Locale Routing"
Cohesion: 0.09
Nodes (38): getBrowserLanguage(), getLanguageId(), isSupportedLanguage(), resolveLanguage(), ANNIVERSARY_30_UNSUPPORTED_LOCALES, CachedResourceProbe, config, confirmTcgSetHasCards() (+30 more)

### Community 40 - "Shared Persistent Store"
Cohesion: 0.07
Nodes (27): zustand, BADGE_DEFINITIONS, TCG_COLLECTION_MODEL_VERSION, storage, storage, PrimeDexStore, SYNCED_KEY_SET, Theme (+19 more)

### Community 41 - "Web Application Providers"
Cohesion: 0.09
Nodes (30): CommandPalette, DeferredInitialLanguageBundle(), DeferredOverlays(), MotionConfigBoundary(), MotionConfigProps, Providers(), routeNeedsMotionConfig(), SettingsModal (+22 more)

### Community 42 - "Shared TCG Types"
Cohesion: 0.06
Nodes (35): pokemonKeys, tcgKeys, TCGCollection, TCGCollectionState, TCGCollectionVariant, TCGCard, TCGCardAbility, TCGCardAttack (+27 more)

### Community 43 - "Analytics Privacy Controls"
Cohesion: 0.11
Nodes (32): posthog-js, applyPostHogConsent(), capturePostHogException(), capturePostHogFeatureError(), capturePostHogNavigationStart(), capturePostHogPageview(), contextProperties(), currentLocale() (+24 more)

### Community 44 - "Items and User Profiles"
Cohesion: 0.09
Nodes (30): AbilityDetailPage(), dynamicParams, generateMetadata(), ItemDetailPage(), itemSpriteUrl(), Props, revalidate, Home() (+22 more)

### Community 45 - "Anniversary Collection"
Cohesion: 0.07
Nodes (30): Anniversary30Countdown(), Anniversary30CountdownProps, fillTemplate(), getDuration(), Anniversary30CardDataset, Anniversary30CardImageStatus, Anniversary30CardScope, Anniversary30Language (+22 more)

### Community 46 - "SEO Build Configuration"
Cohesion: 0.06
Nodes (31): config, { getDefaultConfig }, path, workspaceRoot, expo, csp, nextConfig, projectRoot (+23 more)

### Community 47 - "Workspace Package Overrides"
Cohesion: 0.06
Nodes (36): @xmldom/xmldom, @neondatabase/auth-ui, @daveyplate/better-auth-ui, postcss, sharp, overrides, @better-auth/api-key, @better-auth/core (+28 more)

### Community 48 - "Pokemon Detail Pages"
Cohesion: 0.10
Nodes (29): AbilitiesPage(), revalidate, ItemsPage(), revalidate, MovesPage(), revalidate, PokemonLayout(), buildPokemonPath() (+21 more)

### Community 49 - "Pokemon Breeding Tools"
Cohesion: 0.09
Nodes (32): BreedingCalculatorProps, IvEditor(), IvEditorProps, PokemonPickerProps, STAT_COLORS, STAT_LABELS, BreederPokemon, BreedingChainStep (+24 more)

### Community 50 - "Web Package Dependencies"
Cohesion: 0.06
Nodes (33): axios, axios-retry, i18next, idb-keyval, react, react-i18next, @tanstack/react-query, @types/react (+25 more)

### Community 51 - "Open Graph API Routes"
Cohesion: 0.10
Nodes (26): artworkUrl(), formatDexNumber(), GET(), runtime, minimalPokemon, mocks, totalStats(), GET() (+18 more)

### Community 52 - "Battle Simulator Logic"
Cohesion: 0.11
Nodes (30): BattleClient(), BattleSimulator, BattleLog(), BattleSimulator(), DamageBar(), MoveSelector(), PokemonSelector(), PokemonWithMoves (+22 more)

### Community 53 - "Collection Variant Controls"
Cohesion: 0.10
Nodes (25): react-dom, TCG_PHYSICAL_VARIANTS, TCGPhysicalVariant, HomeHeaderMobileMenu(), HomeHeaderMobileMenuProps, COLORS, EGG_GROUPS, GENERATIONS (+17 more)

### Community 54 - "Product Analytics Consent"
Cohesion: 0.11
Nodes (26): CampaignRouteContext, GET(), ConsentPreferencesButton(), MAX_CAMPAIGN_SLUG_LENGTH, normalizeCampaignSlug(), createUnsetProductConsent(), PRODUCT_CONSENT_POLICY_VERSION, PRODUCT_CONSENT_VERSION (+18 more)

### Community 55 - "Anniversary Card Data"
Cohesion: 0.10
Nodes (31): 30 URL, 30 URL, ANNIVERSARY_30_BASIC_ENERGY_CARDS, ANNIVERSARY_30_CARD_SCOPES, ANNIVERSARY_30_CLASSIC_CARDS, ANNIVERSARY_30_FEATURE_CARD_NAMES, ANNIVERSARY_30_NUMBERED_CARDS, ANNIVERSARY_30_PROMO_CARDS (+23 more)

### Community 56 - "TCG User State"
Cohesion: 0.07
Nodes (28): DEFAULT_TCG_USER_STATE, TCG_USER_STATE_COOKIE, TCGUserState, TCGCardAbility, TCGCardAttack, TCGCardBooster, TCGCardCount, TCGCardLegalities (+20 more)

### Community 57 - "Mobile Package Dependencies"
Cohesion: 0.06
Nodes (30): devDependencies, @babel/core, babel-plugin-module-resolver, @types/react, typescript, axios, axios-retry, i18next (+22 more)

### Community 58 - "Neon Account Schema"
Cohesion: 0.16
Nodes (30): public.battle_rooms, analytics.daily_metrics, public.friend_collection_snapshots, public.friend_deck_snapshots, public.friend_directory, public.friendships, Core application schema migration, public.profiles (+22 more)

### Community 59 - "Shared Team Analysis"
Cohesion: 0.12
Nodes (27): Type Relations, TypeRelations, AutoCompleteOptions, AutoCompleteResult, buildPokemonDetailFromBasic(), calculateTeamSynergyScore(), classifyRoleByStats(), DEFAULT_AUTO_COMPLETE_OPTIONS (+19 more)

### Community 60 - "Quiz Experience"
Cohesion: 0.09
Nodes (25): GameMode, GameState, GENERATIONS, QuizChallenge, QuizPageContent(), seededRandom(), shuffled(), TYPES (+17 more)

### Community 61 - "Profile Progress Store"
Cohesion: 0.07
Nodes (24): ICON_MAP, ProfileAndBadges(), TIER_COLORS, TIER_LABELS, REGIONS, adjust TCG Collection Variant Quantity, assign Legacy TCG Set To Collection, count Physical TCG Cards (+16 more)

### Community 62 - "Sealed Product API"
Cohesion: 0.16
Nodes (26): Sealed Cashflow Row, Sealed Ledger Result, Sealed Portfolio Summary, Sealed Source Status, SealedSourceStatus, SealedPortfolioPage(), createSealedTransaction(), downloadSealedExport() (+18 more)

### Community 63 - "Shared Pokemon Types"
Cohesion: 0.08
Nodes (25): getThemeColor(), getTypeGradientStyle(), TYPE_ICONS, AbilityListItem, AbilityPokemonLearner, GraphQLAbilityData, GraphQLAbilityPokemonData, GraphQLMoveData (+17 more)

### Community 64 - "Pokemon Form Names"
Cohesion: 0.13
Nodes (25): alt, contentType, Image(), runtime, size, collectAllSpeciesNames(), getCurrentEvolutionSpeciesName(), findLocalizedFormLabel() (+17 more)

### Community 65 - "TCG Card and Set Pages"
Cohesion: 0.13
Nodes (24): generateMetadata(), getPageCard, PageProps, TCGCardPage(), buildChecklistMarkup(), buildSetLanguages(), escapeHtml(), formatReleaseDate() (+16 more)

### Community 66 - "Mobile Pokemon Pages"
Cohesion: 0.17
Nodes (19): PokemonDetailScreen(), styles, usePokemonDetail(), FavoriteButton(), PokemonCardBase(), styles, StatBar(), styles (+11 more)

### Community 67 - "Analytics Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, axios, axios-retry, class-variance-authority, clsx, cmdk, @ducanh2912/next-pwa, framer-motion (+19 more)

### Community 68 - "Anniversary User Interface"
Cohesion: 0.11
Nodes (24): getTCGCollectionCardIds(), Anniversary30CardGrid(), handleFilterChange(), Anniversary30CardGridLabels, Anniversary30CardGridProps, ANNIVERSARY_30_DEFAULT_FILTERS, FILTER_LABEL_KEYS, getCardUrl() (+16 more)

### Community 69 - "Mobile Providers and Localization"
Cohesion: 0.09
Nodes (14): RootStack(), react-native-url-polyfill, Bundle, loaders, loadLanguage(), AppProviders(), LocaleBridge(), NeonSyncBridge() (+6 more)

### Community 70 - "Mobile Theme System"
Cohesion: 0.14
Nodes (19): FavoritesScreen(), styles, PokedexScreen(), styles, TabsLayout(), styles, TeamScreen(), react-i18next (+11 more)

### Community 71 - "Neon Authentication Services"
Cohesion: 0.10
Nodes (20): jose, GET, ProfileRow, unavailable(), UserStateRow, countFrom(), CountRow, GET (+12 more)

### Community 72 - "Error Reporting Client"
Cohesion: 0.16
Nodes (20): @sentry/nextjs, register(), getEnvironment(), getTraceSampleRate(), hasDsn, initializeSentryClient(), isPerformanceConsentGranted(), ReplayIntegration (+12 more)

### Community 73 - "Friends API Routes"
Cohesion: 0.11
Nodes (25): canViewSnapshot(), CollectionPageRow, DeckSnapshotRow, DELETE, DirectoryRow, FriendshipRow, FriendsPayload, GET (+17 more)

### Community 74 - "Team Generation Filters"
Cohesion: 0.14
Nodes (24): GENERATION_OPTIONS, GenerationPicker(), GenerationPickerProps, parseGenerationValue(), AutoCompleteOptions, AutoCompleteResult, buildPokemonDetailFromBasic(), calculateTeamSynergyScore() (+16 more)

### Community 75 - "Application Notifications"
Cohesion: 0.12
Nodes (18): notify, agentation, sonner, AppContent(), DeferredToaster, getSystemTheme(), subscribeSystemTheme(), Toaster() (+10 more)

### Community 76 - "Mobile REST Data Hooks"
Cohesion: 0.11
Nodes (22): usePokemonList(), usePokemonSearchIndex(), usePokemonSpecies(), apiClient, GRAPHQL_API_BASE, graphqlClient, REST_API_BASE, AbilityDetail (+14 more)

### Community 77 - "Pokemon Filter State"
Cohesion: 0.11
Nodes (22): HeroControls(), usePokemonFilterUrl(), HOME_SORT_VALUES, HomeFilterUrlSerializableState, HomeFilterUrlState, HomeSortValue, HomeViewValue, parseBoundedInteger() (+14 more)

### Community 78 - "Social Image Helpers"
Cohesion: 0.12
Nodes (22): detectOgImageMimeType(), encodeBase64(), fetchOgImageDataUrl(), getTrustedOgImageUrl(), isTrustedHttpsUrl(), isTrustedOgFontUrl(), loadTrustedOgImageDataUrl(), pendingOgImageLoads (+14 more)

### Community 79 - "Move Detail Page"
Cohesion: 0.16
Nodes (17): dynamicParams, fetchMoveDetail(), fetchPokemonStats(), generateMetadata(), GENERATION_LABELS, MoveDetailPage(), PokemonStatResult, Props (+9 more)

### Community 80 - "Shared GraphQL Cache"
Cohesion: 0.21
Nodes (22): setCachedData(), buildPokemonDetailedSelection(), buildPokemonSearchSelection(), buildPokemonSummarySelection(), describeGraphQLResponse(), fetchBatch(), fetchMoveBatches(), fetchPokemonBatches() (+14 more)

### Community 81 - "Quiz Share Image API"
Cohesion: 0.14
Nodes (19): GET(), runtime, CHALLENGE_COLORS, CHALLENGE_LABELS, GET(), MODE_LABELS, runtime, GET() (+11 more)

### Community 82 - "Expo Runtime Configuration"
Cohesion: 0.09
Nodes (21): package, tsconfigPaths, typedRoutes, expo, android, assetBundlePatterns, backgroundColor, experiments (+13 more)

### Community 83 - "UI Component Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 84 - "TCG Price History API"
Cohesion: 0.14
Nodes (19): GET, getTcgCard(), GET, getTcgCompare(), CardPricing, extractPriceSnapshot(), GET, getPriceHistory() (+11 more)

### Community 85 - "Analytics Identity Consent"
Cohesion: 0.22
Nodes (13): workbox-window, PostHogConsentBridge(), PostHogIdentityBridge(), SentryConsentBridge(), AnalyticsEvent, VercelInsights(), DeferredComponents, IdleClientServices() (+5 more)

### Community 86 - "Privacy and Cookie Pages"
Cohesion: 0.22
Nodes (11): CookiePolicyPage(), PrivacyPage(), calloutIcon, calloutStyles, LegalDocumentView(), copy, MeasurementNotice(), getLegalDocuments() (+3 more)

### Community 87 - "Pokemon List Interface"
Cohesion: 0.16
Nodes (19): PokemonCardSkeleton(), _buildInitialDataRaw(), _getCachedInitialData(), _initialDataCache, PokemonList(), PokemonStatMap, PokemonStatName, get All Pokemon Detailed (+11 more)

### Community 88 - "TCG Price Charts"
Cohesion: 0.15
Nodes (17): ChartTooltip(), ChartTooltipProps, Days, formatChartAmount(), formatDate(), formatTimestamp(), PriceChart(), PriceChartProps (+9 more)

### Community 89 - "Mobile Account Localization"
Cohesion: 0.13
Nodes (16): AccountScreen(), cardStyle(), LANGUAGE_LABELS, styles, THEME_OPTIONS, useTheme(), AppLanguage, getBrowserLanguage() (+8 more)

### Community 90 - "Home Collection Previews"
Cohesion: 0.15
Nodes (13): HomeCardPreview(), HomeCardPreviewProps, HomeCardStyle, resetCardStyle(), RESTING_STYLE, HomeCollectionPreview(), HomeCollectionPreviewProps, HOME_FEATURED_CARDS (+5 more)

### Community 91 - "Mobile Package Manifest"
Cohesion: 0.11
Nodes (19): dependencies, axios, axios-retry, expo-constants, expo-image, expo-linking, expo-localization, expo-router (+11 more)

### Community 92 - "Sealed Collection History"
Cohesion: 0.16
Nodes (16): Sealed Portfolio Point, Sealed Portfolio Totals, SealedPortfolioSummary, SealedCashflowRow, SealedPortfolioPoint, SealedPortfolioTotals, SealedPosition, SealedPositionView (+8 more)

### Community 93 - "Sealed Portfolio Analytics"
Cohesion: 0.20
Nodes (17): calculateSealedCashflow(), dayDate(), periodEnd(), ratio(), sealedRecentDays(), shiftDay(), summarizeSealedPortfolio(), calculateSealedCashCents() (+9 more)

### Community 94 - "Web Root Layout"
Cohesion: 0.15
Nodes (16): bodyFont, displayFont, RootLayout(), supportedInLanguage, viewport, SkipLink(), SkipLinkProps, languageToOpenGraphLocale (+8 more)

### Community 95 - "Holographic Card Effects"
Cohesion: 0.22
Nodes (17): BASIC_RARITIES, formatStageSubtype(), getArtWindow(), getCardSearchableText(), getSubtypeAttribute(), getSupertypeAttribute(), getTCGHoloData(), getTCGHoloRarity() (+9 more)

### Community 96 - "Web TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 97 - "Core Package Configuration"
Cohesion: 0.11
Nodes (17): exports, axios, axios-retry, idb-keyval, react, @react-native-async-storage/async-storage, zustand, license (+9 more)

### Community 98 - "Shared API Cache Storage"
Cohesion: 0.14
Nodes (10): peerDependencies, react, @react-native-async-storage/async-storage, CacheItem, evictOldestIfNeeded(), getCachedData(), isCacheItem(), isRecord() (+2 more)

### Community 99 - "TCG Ownership and Languages"
Cohesion: 0.18
Nodes (14): MAX_TCG_COLLECTION_PHYSICAL_CARDS, DEFAULT_TCG_DISPLAY_CURRENCY, isTCGDisplayCurrency(), normalizeTCGDisplayCurrency(), TCG_DISPLAY_CURRENCIES, TCGDisplayCurrency, DEFAULT_TCG_CARD_LANGUAGE, TCG_CARD_LANGUAGE_ENGLISH_NAMES (+6 more)

### Community 100 - "Cardmarket Sealed Imports"
Cohesion: 0.18
Nodes (17): SEALED_PRODUCT_CATEGORY_IDS, SealedPriceMetrics, decodeJson(), downloadAndParseSealedCardmarketData(), downloadBytes(), DownloadedCardmarketData, isRecord(), metricCents() (+9 more)

### Community 101 - "Server Analytics"
Cohesion: 0.18
Nodes (15): posthog-node, onRequestError(), getProductMeasurementConsentFromCookie(), asRequestLike(), capturePostHogServerException(), consentFromRequest(), deduplicationKeys, getCookieHeader() (+7 more)

### Community 102 - "Localized Legal Content"
Cohesion: 0.16
Nodes (10): Localized legal content, get Actual Legal Documents, deLegal, enLegal, esLegal, frLegal, itLegal, jaLegal (+2 more)

### Community 103 - "Battle Room Services"
Cohesion: 0.18
Nodes (13): @neondatabase/auth, BattleRoom(), BattleRoomProps, BattleRoomState, ChatMessage, parseChatMessages(), readError(), getAppAccessToken() (+5 more)

### Community 104 - "Web API Cache"
Cohesion: 0.22
Nodes (12): idb-keyval, CacheItem, evictOldestIfNeeded(), getCachedData(), getCacheKey(), getLocalStorage(), isIndexedDbAvailable(), readCacheItem() (+4 more)

### Community 106 - "Anniversary Page Data"
Cohesion: 0.24
Nodes (16): Anniversary30Card, getAnniversary30Manifest(), getAnniversary30ManifestDataQuality(), Anniversary30PageData, Anniversary30ProviderStatus, buildAnniversary30PageData(), getAnniversary30PageData, getProviderStatus() (+8 more)

### Community 107 - "Anniversary Data Migration"
Cohesion: 0.22
Nodes (15): Anniversary30PikachuSlotId, ANNIVERSARY_30_PIKACHU_SLOTS, Anniversary30MigrationPlan, Anniversary30MigrationState, createAnniversary30MigrationState(), getAnniversary30MigrationPlan(), isValidCardId(), LEGACY_SLOT_IDS (+7 more)

### Community 108 - "Core TypeScript Configuration"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 109 - "Lint Tooling"
Cohesion: 0.14
Nodes (14): eslintConfig, devDependencies, agentation, eslint, eslint-config-next, metro, tailwindcss, @tailwindcss/postcss (+6 more)

### Community 110 - "Competitive Pokemon Data"
Cohesion: 0.24
Nodes (12): CompetitiveMeta, buildShowdownExport(), CompetitiveMeta(), Props, TIER_COLORS, TIER_DESCRIPTION_KEYS, useSmogonData(), fetchSmogonTier() (+4 more)

### Community 111 - "Sealed Product Types"
Cohesion: 0.27
Nodes (11): Sealed Product, Sealed Product Language, SealedProduct, SealedProductLanguage, SealedCatalogueResponse, getSealedExchangeProducts(), getSealedSaleProducts(), SealedExchangePositionWithProduct (+3 more)

### Community 112 - "Contact API"
Cohesion: 0.22
Nodes (12): resend, ContactPayload, headers, invalid(), isText(), LIMITS, POST, postContact() (+4 more)

### Community 113 - "Analytics Product API"
Cohesion: 0.21
Nodes (11): Node.js crypto, allowed, ephemeralClientKey(), EventName, forbidden(), POST, postProductAnalytics(), ProductPayload (+3 more)

### Community 114 - "Pokemon Card API"
Cohesion: 0.23
Nodes (8): getPokemonCards(), mocks, getCachedTcgCardsOrThrow(), containsWholePokemonName(), isNameBoundary(), isPokemonNameInCardTitle(), normalizeCardName(), scriptGroup()

### Community 115 - "Continuous Integration Workflow"
Cohesion: 0.17
Nodes (12): Build web application, Checkout repository, CI job, CI workflow, Type-check shared core, Lint mobile workspace, Type-check mobile workspace, Install dependencies with npm ci (+4 more)

### Community 116 - "Install Prompt Interface"
Cohesion: 0.26
Nodes (10): InstallPrompt, BeforeInstallPromptEvent, detectInstallPromptMode(), InstallPrompt(), InstallPromptMode, isAndroidDevice(), isDismissed(), isStandaloneDisplayMode() (+2 more)

### Community 117 - "Cookie Consent Interface"
Cohesion: 0.27
Nodes (10): ClientCookieBanner(), CookieBanner, CookieBanner(), getCurrentLanguage(), getServerSnapshot(), getSnapshot(), preferenceLabels, readStoredConsent() (+2 more)

### Community 118 - "Legacy Quiz Sync"
Cohesion: 0.24
Nodes (11): LeaderboardPeriod, LeaderboardResponse, answerDailyQuizQuestion(), DailyQuizAnswerResult, DailyQuizAttempt, getAccessToken(), isValidQuestionId(), isValidQuestionIndex() (+3 more)

### Community 119 - "Mobile Core Exports"
Cohesion: 0.27
Nodes (7): styles, darkPalette, lightPalette, ThemePalette, TYPE_COLOR, ThemeContext, ThemeContextValue

### Community 120 - "Workspace Build Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, db:neon:export, db:neon:import, db:neon:verify, dev, lint, seo:check (+3 more)

### Community 121 - "Test Configuration"
Cohesion: 0.18
Nodes (4): vitest, mocks, mockPostHog, now

### Community 122 - "Social Image Rendering"
Cohesion: 0.24
Nodes (8): Node.js fs/promises, alt, contentType, Image(), runtime, size, DEFAULT_OG_IMAGE_PATH, loadDefaultOgImage()

### Community 123 - "Team Comparison Suggestions"
Cohesion: 0.27
Nodes (9): CompareSuggestions, CounterSuggestion, findCounterTypes(), findPartnerTypes(), getCompareSuggestions(), getTypesThatHitSuperEffective(), PartnerSuggestion, TypeRelationsForSuggestion (+1 more)

### Community 124 - "Move Coverage Analysis"
Cohesion: 0.24
Nodes (8): analyzeMoveCoverage(), dedupeSuggestions(), getTypeEffectiveness(), MoveCoverageResult, MoveSuggestion, OFFENSIVE_DAMAGE_TYPES, PokemonMoveCoverage, SUPER_EFFECTIVE_MAP

### Community 125 - "Mobile TypeScript Configuration"
Cohesion: 0.22
Nodes (8): compilerOptions, paths, strict, exclude, extends, include, @primedex/core, expo/tsconfig.base

### Community 127 - "In Memory API Cache"
Cohesion: 0.25
Nodes (4): createMemoryCache(), MemoryCache, MemoryCacheEntry, MemoryCacheOptions

### Community 128 - "Pokemon Encounter Data"
Cohesion: 0.25
Nodes (8): EncounterEntry, EncounterLocationGroup, EncounterVersionGroup, groupEncountersByVersionGroup(), resolveVersionGroup(), VERSION_GROUP_BY_VERSION, VERSION_GROUP_LABELS, VERSION_GROUP_ORDER

### Community 129 - "Cardmarket Product Links"
Cohesion: 0.39
Nodes (7): CARDMARKET_LANGUAGES, CardmarketLanguage, getCardmarketProductId(), getCardmarketProductUrl(), isValidProductId(), normalizeVariantType(), resolveCardmarketLanguage()

### Community 130 - "Persistent Storage Layer"
Cohesion: 0.31
Nodes (6): createResilientStorage(), IndexedDbOperations, isUsablePersistedValue(), ResilientStorageOptions, persistedState, withTimeout()

### Community 131 - "Pokemon Held Items"
Cohesion: 0.25
Nodes (7): getRecommendedItems(), GUTS_POKEMON, HeldItem, HeldItemPokemon, ITEMS, NOTABLE_NFE_POKEMON, POISON_HEAL_POKEMON

### Community 132 - "Mobile Build Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, start, typecheck, web

### Community 133 - "Bug Report Interface"
Cohesion: 0.29
Nodes (4): onRouterTransitionStart(), FeedbackDialog, ReportProblemButton(), ReportProblemButtonProps

### Community 134 - "Pokemon Team Paste Parser"
Cohesion: 0.38
Nodes (6): MatchedSet, ParsedShowdownSet, parseShowdownPaste(), parseStatLine(), slugify(), STAT_ALIASES

### Community 135 - "TCG Collection Valuation"
Cohesion: 0.38
Nodes (5): fetchCollectionValue(), getCollectionValuationTimeoutMs(), mapWithConcurrencyUntilTimeout(), worker(), normalizeOwnedVariantsForValuation()

### Community 136 - "Accessible Color Utilities"
Cohesion: 0.52
Nodes (5): getContrastRatio(), getReadableTextColor(), parseHexColor(), relativeLuminance(), RGB

### Community 137 - "TCG User Cards API"
Cohesion: 0.60
Nodes (5): DELETE(), GET(), legacyEndpointResponse(), PATCH(), POST()

### Community 138 - "Sitemap Index Route"
Cohesion: 0.47
Nodes (5): GET(), revalidate, escapeXml(), renderSitemapIndex(), sitemapIndexUrls()

### Community 139 - "Pokemon Artwork Data"
Cohesion: 0.53
Nodes (4): getNextPokemonArtworkSource(), getOfficialArtworkSpeciesId(), OFFICIAL_ARTWORK_SPECIES_ID_BY_FORM_ID, shouldOptimizePokemonArtwork()

### Community 140 - "TCG Rarity Rules"
Cohesion: 0.60
Nodes (4): CANONICAL_RARITY_KEYS, getCanonicalTcgRarity(), isSameTcgRarity(), normalizeRarityText()

### Community 141 - "Saved TCG Searches"
Cohesion: 0.70
Nodes (4): DELETE(), GET(), legacyEndpointResponse(), POST()

### Community 142 - "Home Text Animation"
Cohesion: 0.50
Nodes (4): HomeWordReveal(), HomeWordRevealProps, SegmenterLike, segmentText()

### Community 145 - "Neon Migration Verification"
Cohesion: 0.83
Nodes (3): count_rows(), fail(), verify-migration.sh script

### Community 146 - "Share Link Builder"
Cohesion: 0.83
Nodes (4): ShareButton(), buildAbsoluteUrl(), handleClick(), handleCopyLink()

## Knowledge Gaps
- **1248 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+1243 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1461 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **How does mobile sync cross from AppProviders into the shared core sync module?**
  _The graph connects NeonSyncBridge() to useNeonSync() across apps/mobile and packages/core; the implementation keeps its historical Supabase path._
- **How do TCG research and collection screens reach the shared TCG API and local collection store?**
  _The graph links the research UI, card search services, shared API modules, and collection state across web and core._
- **How do Neon tables connect sealed products, transactions, allocations, and audit records?**
  _The six migrations expose explicit table references across the sealed portfolio schema._