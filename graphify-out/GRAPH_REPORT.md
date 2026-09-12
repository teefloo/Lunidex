# Graph Report - src  (2026-09-12)

## Corpus Check
- 499 files · ~392,764 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3255 nodes · 10329 edges · 120 communities (112 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Editorial Pages
- Route Metadata and Auth
- Account and Battle API
- TCG Collection API
- Sealed Portfolio UI
- Pokémon Reference UI
- Dashboard Shell
- 404 Maze Game
- Cloud Sync and Import
- Compare and Favorites
- TCG Collection Screens
- Collection Data Routes
- Sealed Pricing Sync
- Auth and Contact UI
- Pokémon Detail View
- Navigation and Filters
- Profile and Sharing
- App Route Layouts
- Reference Page Routes
- Friend Profiles
- Team Builder UI
- EV/IV Calculator
- Pokémon List Data
- Collection Analytics
- Auth Proxy Routes
- Auth Context
- Pokémon and TCG Fetchers
- TCG Search API
- Public API Telemetry
- Breeding Calculator
- Anniversary Tracker
- Error Observability
- TCG State Types
- Reference Detail Pages
- Friends API
- Quiz Result API
- TCG Research UI
- Profile and Quiz Cards
- TCG Card API
- TCG Card Details
- Header and Filters
- Type Chart UI
- Home Card Showcase
- App Client Shell
- Battle Simulator
- Locale Proxy
- Root and Home Layout
- Home Experience
- Local Preferences
- Album Progress and Attribution
- Move Detail Pages
- Sitemap Generation
- Quiz Leaderboards
- API Client Layer
- Legal Pages
- Quiz Experience
- Sitemap Data
- Local API Cache
- Open Graph Routes
- Encounter Components
- Wishlist Navigation
- Card Image Rendering
- Legal Translations
- Sealed Market Data
- Price Chart Components
- Open Graph API
- Activity Statistics
- Pokémon Name Formatting
- TCG Card Metadata
- Breeding and Nuzlocke
- Route Error Boundaries
- Client Providers
- Sitemap Builders
- Campaign Attribution
- Set Progress Insights
- Share Image Data
- User State API
- Battle Rooms
- Competitive Team Data
- Price Alerts
- Trusted OG Assets
- Account Deletion
- Auth Recovery UI
- Cookie Consent UI
- Brand Fonts
- Sentry Data Scrubbing
- Pokémon OG Endpoint
- TCG Set Pages
- Analytics Consent Bridges
- Desktop Navigation
- Home Filter State
- PostHog Analytics
- Brand Concepts
- Team Sharing
- Home Collection Preview
- Album Card Components
- Push Notifications
- Query Observability
- Activity Heatmap
- Move Coverage Analysis
- Team OG Endpoint
- Memory Cache
- Durable Local Storage
- Sentry Client
- Metrics Retention API
- Smogon Endpoint
- User Cards API
- Team Export
- Source Governance Guides
- Saved Search API
- Breeding Route
- Home Tool Cards
- Animated Home Copy
- Request Instrumentation
- Component Governance Guides
- Team Builder Guide
- Type Chart Guide
- Library Governance Guide
- Store Governance Guide

## God Nodes (most connected - your core abstractions)
1. `useTranslation` - 234 edges
2. `cn()` - 219 edges
3. `getServerLanguage()` - 181 edges
4. `getServerT()` - 174 edges
5. `usePrimeDexStore` - 133 edges
6. `t()` - 119 edges
7. `buildSubpathLanguages()` - 91 edges
8. `useLocaleHref()` - 84 edges
9. `serializeJsonLd()` - 81 edges
10. `useClientLanguage()` - 70 edges

## Surprising Connections (you probably didn't know these)
- `ComparePage()` --indirect_call--> `getAllPokemonSearchIndex()`  [INFERRED]
  app/compare/page.tsx → lib/api/graphql.ts
- `FavoritesPage()` --indirect_call--> `getAllPokemonNames()`  [INFERRED]
  app/favorites/page.tsx → lib/api/rest.ts
- `ItemCard()` --calls--> `formatName()`  [EXTRACTED]
  app/items/ItemsPageClient.tsx → lib/utils.ts
- `PokemonLearnerCard()` --calls--> `useLocaleHref()`  [EXTRACTED]
  app/moves/MoveDetailModal.tsx → hooks/useLocaleHref.ts
- `DeferredOverlays()` --calls--> `usePrimeDexStore`  [EXTRACTED]
  app/providers.tsx → store/primedex.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Lunidex Core Modes** — src_lib_og_assets_primedex_og_pokedex, src_lib_og_assets_primedex_og_teams, src_lib_og_assets_primedex_og_tcg [EXTRACTED 1.00]

## Communities (120 total, 7 thin omitted)

### Community 0 - "Editorial Pages"
Cohesion: 0.06
Nodes (81): Anniversary30Page(), FACT_KEYS, generateMetadata(), getPageContext(), revalidate, revalidate, BlogPage(), revalidate (+73 more)

### Community 1 - "Route Metadata and Auth"
Cohesion: 0.07
Nodes (73): generateMetadata(), generateMetadata(), AboutPage(), generateMetadata(), generateMetadata(), BattlePage(), generateMetadata(), SwordsIcon (+65 more)

### Community 2 - "Account and Battle API"
Cohesion: 0.06
Nodes (74): GET, getAccountExport(), ProfileRow, unavailable(), UserStateRow, BattleChatMessage, BattleRoomRow, BattleTeamMember (+66 more)

### Community 3 - "TCG Collection API"
Cohesion: 0.06
Nodes (75): GET, getTcgCollectionSetCards(), getCollectionSetAlbumPersistent, buildCardQueryParams(), buildSetCollectionCards(), cardMatchesLocalFilters(), compareCards(), compareCollectorNumbers() (+67 more)

### Community 4 - "Sealed Portfolio UI"
Cohesion: 0.06
Nodes (62): AliasEditor(), AnalyticsView(), CashflowView(), CatalogueView(), CollectionView(), DashboardView(), dateLabel(), dayShift() (+54 more)

### Community 5 - "Pokémon Reference UI"
Cohesion: 0.04
Nodes (47): SortKey, ItemCard(), itemSpriteUrl(), SortKey, buildLearners(), groupLearnersByMethod(), MoveDetailModal(), MoveDetailModalProps (+39 more)

### Community 6 - "Dashboard Shell"
Cohesion: 0.07
Nodes (45): DashboardPage(), ThemeProvider(), AccountMenu(), AccountMenuProps, ExtensibleSection(), ICON_MAP, PokedexProgress(), PokedexProgressProps (+37 more)

### Community 7 - "404 Maze Game"
Cohesion: 0.06
Nodes (68): advanceMazeGame(), cloneCoord(), coordKey(), countWalkableNeighbors(), createGeneratedRows(), createMazeGame(), createMazeLayout(), createMazeRound() (+60 more)

### Community 8 - "Cloud Sync and Import"
Cohesion: 0.06
Nodes (62): NeonSyncBridge(), DataExportImport(), ExportPayload, getImportPreview(), ImportPreview, validateImportPayload(), AuthContext, advanceSyncMetadata() (+54 more)

### Community 9 - "Compare and Favorites"
Cohesion: 0.07
Nodes (56): AbilitiesPageClient(), ResetPasswordPage(), ComparePage(), Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart (+48 more)

### Community 10 - "TCG Collection Screens"
Cohesion: 0.10
Nodes (37): TCGSetAlbumPage(), TCGSetAlbumPageProps, TCGCollectionPage(), formatReleaseDate(), sortByReleaseDate(), TCGStartPage(), SyncRequiredPanel(), SyncStatusPanel() (+29 more)

### Community 11 - "Collection Data Routes"
Cohesion: 0.12
Nodes (43): DELETE, deleteAlias(), GET, getAlias(), PUT, putAlias(), GET, getCatalogue() (+35 more)

### Community 12 - "Sealed Pricing Sync"
Cohesion: 0.08
Nodes (50): GET, NO_STORE_HEADERS, runSync(), runtime, SEALED_CARDMARKET_SOURCES, dayValue(), exportSealedPortfolio(), getSealedImageUrl() (+42 more)

### Community 13 - "Auth and Contact UI"
Cohesion: 0.07
Nodes (38): AuthModal, AuthModal(), Mode, AuthModal, ContactForm(), FieldErrors, FieldName, FormValues (+30 more)

### Community 14 - "Pokémon Detail View"
Cohesion: 0.06
Nodes (45): AdvancedInfo, EvolutionChain, HeightComparison, LocalizedGqlData, POKE_COLORS, PokemonBuilds, PokemonCards, PokemonDetailClientProps (+37 more)

### Community 15 - "Navigation and Filters"
Cohesion: 0.07
Nodes (46): PAGE_ITEMS, StaticCommandItem, ConsentPreferencesButton(), FooterLinkGroup(), LANGUAGE_MAP, PokemonMovesProps, CatalogSearchInput(), FilterSection() (+38 more)

### Community 16 - "Profile and Sharing"
Cohesion: 0.06
Nodes (47): ExtensibleSectionProps, ICON_MAP, ProfileAndBadges(), TIER_COLORS, TIER_LABELS, PublicProfileCardProps, ShareButton(), buildAbsoluteUrl() (+39 more)

### Community 17 - "App Route Layouts"
Cohesion: 0.10
Nodes (33): CompareLayout(), CookiePolicyLayout(), DashboardLayout(), FaqCategory, FaqEntry, FaqLink, revalidate, FavoritesLayout() (+25 more)

### Community 18 - "Reference Page Routes"
Cohesion: 0.07
Nodes (40): AbilitiesPage(), revalidate, ItemsPage(), revalidate, MovesPage(), revalidate, PokedexPage(), revalidate (+32 more)

### Community 19 - "Friend Profiles"
Cohesion: 0.07
Nodes (37): FriendPrivacyCard(), DeckCard(), FriendCollection(), FriendDecks(), FriendHero(), FriendProfileClientProps, StatusPanel(), EMPTY_RELATIONS (+29 more)

### Community 20 - "Team Builder UI"
Cohesion: 0.07
Nodes (44): MoveCoverageChecker, PolarAngleAxis, PolarGrid, Radar, RadarChart, RechartsTooltip, ResponsiveContainer, GENERATION_OPTIONS (+36 more)

### Community 21 - "EV/IV Calculator"
Cohesion: 0.06
Nodes (41): EVIVCalculator, EVIVPageClient(), EVPlanner, TABS, BaseStats, calcHP(), calcStat(), DEFAULT_EVS (+33 more)

### Community 22 - "Pokémon List Data"
Cohesion: 0.09
Nodes (44): PokemonCardSkeleton(), _buildInitialDataRaw(), _getCachedInitialData(), _initialDataCache, PokemonList(), PokemonStatMap, PokemonStatName, evictOldestIfNeeded() (+36 more)

### Community 23 - "Collection Analytics"
Cohesion: 0.09
Nodes (42): aggregateCollectionValue(), aggregateCollectionValueBySet(), aggregateCollectionValueWithSets(), aggregateCollectionValueWithVariants(), aggregateSetTotalValue(), compareCollectionCardsByImportance(), computeActiveSetInsights(), computeCollectionStatsFromSets() (+34 more)

### Community 24 - "Auth Proxy Routes"
Cohesion: 0.10
Nodes (31): AuthRouteContext, createHandler(), DELETE, GET, PATCH, POST, PUT, requestWithFreshSessionLookup() (+23 more)

### Community 25 - "Auth Context"
Cohesion: 0.13
Nodes (37): normalizeDisplayName(), AppSession, AppUser, asRuntimeAuthClient(), AuthActionResponse, AuthContextValue, AuthErrorLike, AuthProvider() (+29 more)

### Community 26 - "Pokémon and TCG Fetchers"
Cohesion: 0.08
Nodes (35): GET, getTcgSets(), loadCollectionSetCatalog(), getAllMoves(), getItemDetail(), getAbilityDetail(), getAllPokemonNames(), getPokemonEncounters() (+27 more)

### Community 27 - "TCG Search API"
Cohesion: 0.09
Nodes (34): buildCounts(), buildFacets(), GET, getTcgSearch(), getFilterOptions(), buildInsightLines(), buildTCGSearchInsights(), createSearchId() (+26 more)

### Community 28 - "Public API Telemetry"
Cohesion: 0.09
Nodes (28): allowed, ephemeralClientKey(), EventName, forbidden(), POST, postProductAnalytics(), ProductPayload, ContactPayload (+20 more)

### Community 29 - "Breeding Calculator"
Cohesion: 0.09
Nodes (33): BreedingCalculatorProps, IvEditor(), IvEditorProps, PokemonPickerProps, STAT_COLORS, STAT_LABELS, BreederPokemon, BreedingChainStep (+25 more)

### Community 30 - "Anniversary Tracker"
Cohesion: 0.10
Nodes (32): anniversary30Listeners, Anniversary30Tracker(), handleReset(), handleToggle(), Anniversary30TrackerProps, fillTemplate(), getAnniversary30ServerSnapshot(), getAnniversary30Snapshot() (+24 more)

### Community 31 - "Error Observability"
Cohesion: 0.13
Nodes (27): Error(), GlobalError(), attachAxiosSentryInstrumentation(), clampValue(), createSafeException(), deduplicationKeys, EXPECTED_HTTP_STATUSES, FallbackKind (+19 more)

### Community 32 - "TCG State Types"
Cohesion: 0.07
Nodes (29): DEFAULT_TCG_USER_STATE, TCG_USER_STATE_COOKIE, TCGUserState, TCGCardAbility, TCGCardAttack, TCGCardBooster, TCGCardCategory, TCGCardCount (+21 more)

### Community 33 - "Reference Detail Pages"
Cohesion: 0.11
Nodes (27): AbilityDetailPage(), dynamicParams, Props, revalidate, dynamicParams, generateMetadata(), ItemDetailPage(), itemSpriteUrl() (+19 more)

### Community 34 - "Friends API"
Cohesion: 0.11
Nodes (31): accountDeletionInProgress(), canViewSnapshot(), CollectionPageRow, DeckSnapshotRow, DELETE, deleteFriends(), DirectoryRow, FriendshipRow (+23 more)

### Community 35 - "Quiz Result API"
Cohesion: 0.10
Nodes (29): AnswerRow, AttemptPayload, invalidAttempt(), isUniqueViolation(), isUuid(), NewAttemptRow, noStoreHeaders(), POST (+21 more)

### Community 36 - "TCG Research UI"
Cohesion: 0.11
Nodes (24): DeckBuilderClient(), CatalogSearchInputProps, FilterSectionProps, TCGFilters(), TCGFiltersProps, DiscoveryHero(), EmptyState(), normalizeFilters() (+16 more)

### Community 37 - "Profile and Quiz Cards"
Cohesion: 0.07
Nodes (19): BADGE_ICON_MAP, GEN_TOTALS, PublicProfileCard(), HomeMotionSection(), HomeMotionSectionProps, CHALLENGE_COLORS, CHALLENGE_DOT, GameMode (+11 more)

### Community 38 - "TCG Card API"
Cohesion: 0.11
Nodes (24): GET, getTcgCard(), GET, getTcgCompare(), CardPricing, extractPriceSnapshot(), GET, getPriceHistory() (+16 more)

### Community 39 - "TCG Card Details"
Cohesion: 0.11
Nodes (20): ActionPill(), formatCardList(), formatRetreatCost(), getCategoryLabel(), getCategoryTone(), getEnergyTypeLabel(), getStageLabel(), getTrainerTypeLabel() (+12 more)

### Community 40 - "Header and Filters"
Cohesion: 0.13
Nodes (20): HomeHeaderMobileMenu(), HomeHeaderMobileMenuProps, AuthModal, COLORS, EGG_GROUPS, GENERATIONS, SHAPES, AdvancedFilters (+12 more)

### Community 41 - "Type Chart UI"
Cohesion: 0.09
Nodes (21): containerVariants, itemVariants, typeBadgeStyle(), TypeChart, TypesPage(), BestUserCard(), MoveBestUsers(), MoveBestUsersProps (+13 more)

### Community 42 - "Home Card Showcase"
Cohesion: 0.10
Nodes (21): HomeCardPreview(), HomeCardPreviewProps, HomeCardStyle, resetCardStyle(), RESTING_STYLE, HOME_FEATURED_CARDS, HomeHeroVisual(), TCGAlbumCardProps (+13 more)

### Community 43 - "App Client Shell"
Cohesion: 0.11
Nodes (19): AppContent(), DeferredToaster, InstallPrompt, BeforeInstallPromptEvent, detectInstallPromptMode(), InstallPrompt(), InstallPromptMode, isAndroidDevice() (+11 more)

### Community 44 - "Battle Simulator"
Cohesion: 0.15
Nodes (23): BattleClient(), BattleSimulator, BattleLog(), BattleSimulator(), DamageBar(), MoveSelector(), PokemonWithMoves, BattleLogEntry (+15 more)

### Community 45 - "Locale Proxy"
Cohesion: 0.12
Nodes (25): ANNIVERSARY_30_UNSUPPORTED_LOCALES, CachedResourceProbe, config, confirmTcgSetHasCards(), detectLocaleFromAcceptLanguage(), getCachedResourceProbe(), getResourceProbe(), getResourceProbeCacheKey() (+17 more)

### Community 46 - "Root and Home Layout"
Cohesion: 0.11
Nodes (19): bodyFont, displayFont, RootLayout(), supportedInLanguage, viewport, viewport, HomeFaqAnchorBehavior(), SkipLink() (+11 more)

### Community 47 - "Home Experience"
Cohesion: 0.12
Nodes (15): HomeCollectionSteps(), HomeHeader(), HomeHeaderProps, artworkUrl(), HomeTeamPreview(), TEAM_PREVIEW, FeedbackDialog, ReportProblemButton() (+7 more)

### Community 48 - "Local Preferences"
Cohesion: 0.12
Nodes (19): ClientRecentlyViewed(), RecentlyViewed, RecentlyViewed(), getLanguageId(), resolveLanguage(), isTheme(), LOCAL_PREFERENCE_KEYS, LocalPreferenceKey (+11 more)

### Community 49 - "Album Progress and Attribution"
Cohesion: 0.16
Nodes (21): TCGAlbumPage(), RARITY_TONES, TCGRarityBadge(), TCGRarityBadgeProps, currentSession(), markProductActivation(), saveSession(), trackProductEvent() (+13 more)

### Community 50 - "Move Detail Pages"
Cohesion: 0.16
Nodes (17): dynamicParams, fetchMoveDetail(), fetchPokemonStats(), generateMetadata(), GENERATION_LABELS, MoveDetailPage(), PokemonStatResult, Props (+9 more)

### Community 51 - "Sitemap Generation"
Cohesion: 0.13
Nodes (21): GET(), revalidate, GET(), isSitemapFamily(), revalidate, assertSitemapIntegrity(), assertValidAbsoluteUrl(), EDITORIAL_SITEMAP_ROUTES (+13 more)

### Community 52 - "Quiz Leaderboards"
Cohesion: 0.11
Nodes (19): LeaderboardRow(), PERIOD_LABELS, QuizLeaderboard(), QuizLeaderboardProps, DAILY_QUESTION_COUNT, LEADERBOARD_CHALLENGES, LEADERBOARD_MODES, LEADERBOARD_PERIODS (+11 more)

### Community 53 - "API Client Layer"
Cohesion: 0.12
Nodes (19): apiClient, GRAPHQL_API_BASE, graphqlClient, REST_API_BASE, AbilityDetail, getAllAbilityNames(), getAllItemNames(), getAllMoveNames() (+11 more)

### Community 54 - "Legal Pages"
Cohesion: 0.20
Nodes (13): CookiePolicyPage(), LegalNoticePage(), PrivacyPage(), TermsPage(), calloutIcon, calloutStyles, LegalDocumentView(), copy (+5 more)

### Community 55 - "Quiz Experience"
Cohesion: 0.15
Nodes (20): GameMode, GameState, GENERATIONS, QuizChallenge, QuizPageContent(), seededRandom(), shuffled(), TYPES (+12 more)

### Community 56 - "Sitemap Data"
Cohesion: 0.15
Nodes (21): getSetPageData(), getAllAbilityNamesCached, getAllItemNamesCached, getAllMoveNamesCached, getAllPokemonNamesCached, getAllSetsCached, getTCGSetCardsCached, assertNonEmpty() (+13 more)

### Community 57 - "Local API Cache"
Cohesion: 0.14
Nodes (15): CacheItem, getCachedData(), getCacheKey(), getLocalStorage(), readCacheItem(), readLocalCache(), withTimeout(), fetchCollectionValue() (+7 more)

### Community 58 - "Open Graph Routes"
Cohesion: 0.14
Nodes (16): runtime, alt, contentType, Image(), runtime, size, alt, contentType (+8 more)

### Community 59 - "Encounter Components"
Cohesion: 0.14
Nodes (17): EncounterLocations, EncounterLocations(), EncounterLocationsProps, EmptyState(), EmptyStateProps, EmptyStateMotion(), EmptyStateMotionProps, EncounterEntry (+9 more)

### Community 60 - "Wishlist Navigation"
Cohesion: 0.15
Nodes (15): TCGWishlistPage(), buildTabHref(), FALLBACK_LABELS, normalizePathname(), TABS, TCGPageTabLabels, TCGPageTabs(), TCGPageTabsProps (+7 more)

### Community 61 - "Card Image Rendering"
Cohesion: 0.19
Nodes (18): TCGCardImage(), TCGCardImageProps, adjust(), clamp(), getInitialHoloStyle(), hashToUnit(), HoloStyle, TCGHolographicCard (+10 more)

### Community 62 - "Legal Translations"
Cohesion: 0.13
Nodes (12): en, fr, getActualLegalDocuments(), LegalDocuments, deLegal, enLegal, esLegal, frLegal (+4 more)

### Community 63 - "Sealed Market Data"
Cohesion: 0.15
Nodes (15): decodeJson(), downloadAndParseSealedCardmarketData(), downloadBytes(), DownloadedCardmarketData, isRecord(), metricCents(), nonNegativeInteger(), ParsedCardmarketData (+7 more)

### Community 64 - "Price Chart Components"
Cohesion: 0.15
Nodes (16): ChartTooltip(), ChartTooltipProps, Days, formatChartAmount(), formatDate(), PriceChart(), PriceChartProps, toChartData() (+8 more)

### Community 65 - "Open Graph API"
Cohesion: 0.19
Nodes (15): GET(), runtime, GET(), runtime, getTCGSetCached, PUBLIC_OG_CACHE_HEADERS, MAX_OG_POKEMON_NAME_LENGTH, MAX_OG_TCG_CARD_ID_LENGTH (+7 more)

### Community 66 - "Activity Statistics"
Cohesion: 0.12
Nodes (17): ACTION_ICONS, formatDate(), GeneralActivity(), GeneralActivityProps, ProfileAndBadgesProps, CartesianGrid, Line, LineChart (+9 more)

### Community 67 - "Pokémon Name Formatting"
Cohesion: 0.20
Nodes (17): findLocalizedFormLabel(), FORM_LABELS, FORM_MARKERS, FORM_MARKERS_SORTED, getFormLabel(), getFormMarker(), getPokemonDisplayName(), humanizeBaseName() (+9 more)

### Community 68 - "TCG Card Metadata"
Cohesion: 0.24
Nodes (16): BASIC_RARITIES, formatStageSubtype(), getArtWindow(), getCardSearchableText(), getSubtypeAttribute(), getSupertypeAttribute(), getTCGHoloData(), getTCGHoloRarity() (+8 more)

### Community 69 - "Breeding and Nuzlocke"
Cohesion: 0.18
Nodes (13): BreedingPageClient(), BreedingPageClientProps, isTabId(), TabId, NuzlockeClient(), STATUS_CONFIG, BreedingCalculator(), getLocalizedPokemonName() (+5 more)

### Community 71 - "Client Providers"
Cohesion: 0.14
Nodes (13): CommandPalette, DeferredOverlays(), MotionConfigBoundary(), MotionConfigProps, ProvidersProps, routeNeedsMotionConfig(), SettingsModal, ThemeProviderProps (+5 more)

### Community 72 - "Sitemap Builders"
Cohesion: 0.23
Nodes (17): isTcgLangSupported(), absolutePath(), buildAbilitiesSitemapEntries(), buildGuidesSitemapEntries(), buildItemsSitemapEntries(), buildLanguages(), buildMovesSitemapEntries(), buildPokemonSitemapEntries() (+9 more)

### Community 73 - "Campaign Attribution"
Cohesion: 0.17
Nodes (13): CampaignRouteContext, GET(), MAX_CAMPAIGN_SLUG_LENGTH, normalizeCampaignSlug(), defaultConsent, getTcgStartAttribution(), getTcgStartSource(), isConsent() (+5 more)

### Community 74 - "Set Progress Insights"
Cohesion: 0.18
Nodes (14): formatCardValue(), formatCurrency(), TCGActiveSetInsights(), TCGActiveSetInsightsProps, TCGProgressBar(), TCGProgressBarProps, getActiveSetInsightsFallback(), getSetCompletionFromSet() (+6 more)

### Community 75 - "Share Image Data"
Cohesion: 0.15
Nodes (14): GET(), CHALLENGE_COLORS, CHALLENGE_LABELS, GET(), MODE_LABELS, runtime, SupportedLanguage, normalizeOgEnum() (+6 more)

### Community 76 - "User State API"
Cohesion: 0.29
Nodes (14): GET, getCurrentState(), getUserState(), isExpectedDependencyFailure(), isJsonObject(), isValidTimestamp(), PUT, putUserState() (+6 more)

### Community 77 - "Battle Rooms"
Cohesion: 0.23
Nodes (11): BattleRoomSection(), BattleRoom(), BattleRoomProps, BattleRoomState, ChatMessage, parseChatMessages(), readError(), getNeonAccessToken() (+3 more)

### Community 78 - "Competitive Team Data"
Cohesion: 0.24
Nodes (12): CompetitiveMeta, buildShowdownExport(), CompetitiveMeta(), Props, TIER_COLORS, TIER_DESCRIPTION_KEYS, useSmogonData(), fetchSmogonTier() (+4 more)

### Community 79 - "Price Alerts"
Cohesion: 0.24
Nodes (13): AlertRow(), AlertRowProps, createAlert(), CreateAlertForm(), CreateFormProps, deleteAlert(), fetchAlerts(), getAuthHeader() (+5 more)

### Community 80 - "Trusted OG Assets"
Cohesion: 0.23
Nodes (12): detectOgImageMimeType(), encodeBase64(), fetchOgImageDataUrl(), getTrustedOgImageUrl(), isTrustedHttpsUrl(), isTrustedOgFontUrl(), loadFirstTrustedOgImageDataUrl(), loadTrustedOgImageDataUrl() (+4 more)

### Community 81 - "Account Deletion"
Cohesion: 0.22
Nodes (12): claimDeletion(), ClaimedDeletionRow, DELETE, deleteAccount(), DeletePayload, DeletionState, DeletionStateRow, getDeletionState() (+4 more)

### Community 82 - "Auth Recovery UI"
Cohesion: 0.21
Nodes (9): AuthModalBoundary, AuthModalBoundaryProps, AuthModalBoundaryState, AuthModalLoadError(), AuthModal, SyncAuthPrompt(), getSyncAccessStatus(), onSyncAccessRequired() (+1 more)

### Community 83 - "Cookie Consent UI"
Cohesion: 0.26
Nodes (11): ClientCookieBanner(), CookieBanner, CookieBanner(), getCurrentLanguage(), getServerSnapshot(), getSnapshot(), preferenceLabels, readStoredConsent() (+3 more)

### Community 84 - "Brand Fonts"
Cohesion: 0.21
Nodes (12): CJK_FAMILY, loadBrandFonts(), loadCjkFont(), loadOgFonts(), NUNITO_EXTRA_BOLD_FONT_URL, NUNITO_FONT_URL, OgFont, OgFontWeight (+4 more)

### Community 85 - "Sentry Data Scrubbing"
Cohesion: 0.28
Nodes (11): redactText(), redactUrl(), scrubSentryEvent(), scrubSentryFeedback(), scrubStacktrace(), SentryBreadcrumb, SentryEvent, SentryExceptionValue (+3 more)

### Community 86 - "Pokémon OG Endpoint"
Cohesion: 0.24
Nodes (8): artworkUrl(), formatDexNumber(), GET(), runtime, minimalPokemon, mocks, totalStats(), normalizeOgPokemonName()

### Community 87 - "TCG Set Pages"
Cohesion: 0.29
Nodes (11): buildChecklistMarkup(), buildSetLanguages(), escapeHtml(), formatReleaseDate(), generateMetadata(), PageProps, revalidate, TCGSetPage() (+3 more)

### Community 88 - "Analytics Consent Bridges"
Cohesion: 0.38
Nodes (8): PostHogConsentBridge(), SentryConsentBridge(), AnalyticsEvent, VercelInsights(), syncPostHogConsent(), getProductConsent(), getServerProductConsent(), subscribeProductConsent()

### Community 89 - "Desktop Navigation"
Cohesion: 0.24
Nodes (8): HeaderLink(), HeaderLinkProps, NAV_ITEMS, NavItem, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, DropdownMenuContent(), DropdownMenuItem()

### Community 90 - "Home Filter State"
Cohesion: 0.24
Nodes (10): HeroControls(), usePokemonFilterUrl(), HOME_SORT_VALUES, HomeFilterUrlState, HomeSortValue, HomeViewValue, parseHomeFilters(), serializeHomeFilters() (+2 more)

### Community 91 - "PostHog Analytics"
Cohesion: 0.30
Nodes (11): capturePostHogEvent(), capturePostHogPageview(), initializePostHog(), isExcludedPath(), normalizePath(), PostHogEventProperties, sanitizeEvent(), sanitizeUrl() (+3 more)

### Community 92 - "Brand Concepts"
Cohesion: 0.26
Nodes (12): Collectors, Cosmic Blue-Purple Atlas Aesthetic, Focused Field Guide, Lunidex Pokémon Companion Open Graph Artwork, Lunidex, Players, Pokédex, Pokémon Companion (+4 more)

### Community 93 - "Team Sharing"
Cohesion: 0.35
Nodes (9): firstSearchParam(), generateMetadata(), resolveLang(), sanitizeCode(), SearchParamValue, SharePageProps, TeamSharePage(), RedirectToTeam() (+1 more)

### Community 94 - "Home Collection Preview"
Cohesion: 0.31
Nodes (8): HomeCollectionEntry(), HomeCollectionEntryProps, HomeCollectionPreview(), HomeCollectionPreviewProps, useHomeFeaturedCards(), CollectionEntry, resolveCollectionEntry(), ResolveCollectionEntryInput

### Community 95 - "Album Card Components"
Cohesion: 0.27
Nodes (10): areTCGAlbumCardPropsEqual(), formatPrice(), quantityForVariant(), sameOwnerships(), TCGAlbumCard, VARIANT_HINTS, VARIANT_LABELS, VariantQuantityRow() (+2 more)

### Community 96 - "Push Notifications"
Cohesion: 0.38
Nodes (10): RFC-8291, fetchAppApi(), getAppAccessToken(), getVapidPublicKey(), isPushSupported(), removePushSubscription(), storePushSubscription(), subscribeToPush() (+2 more)

### Community 97 - "Query Observability"
Cohesion: 0.42
Nodes (8): Providers(), createClientI18n(), createObservedMutationCache(), createObservedQueryCache(), getErrorStatus(), getMutationKey(), getQueryContext(), featureFromQueryKey()

### Community 98 - "Activity Heatmap"
Cohesion: 0.31
Nodes (9): ActivityHeatMap(), computeGrid(), getColorLevel(), getDayLabels(), getMonthLabels(), HeatMapCell, LEVEL_CLASSES, toKey() (+1 more)

### Community 99 - "Move Coverage Analysis"
Cohesion: 0.24
Nodes (8): analyzeMoveCoverage(), dedupeSuggestions(), getTypeEffectiveness(), MoveCoverageResult, MoveSuggestion, OFFENSIVE_DAMAGE_TYPES, PokemonMoveCoverage, SUPER_EFFECTIVE_MAP

### Community 100 - "Team OG Endpoint"
Cohesion: 0.33
Nodes (8): GET(), parseTeamIds(), NOTE: satori (next/og) renders a stray black rectangle at the SVG origin when, runtime, spriteUrl(), getBrowserLanguage(), isSupportedLanguage(), synergyColor()

### Community 101 - "Memory Cache"
Cohesion: 0.25
Nodes (4): createMemoryCache(), MemoryCache, MemoryCacheEntry, MemoryCacheOptions

### Community 102 - "Durable Local Storage"
Cohesion: 0.31
Nodes (6): createResilientStorage(), IndexedDbOperations, isUsablePersistedValue(), ResilientStorageOptions, persistedState, withTimeout()

### Community 103 - "Sentry Client"
Cohesion: 0.43
Nodes (7): getEnvironment(), getTraceSampleRate(), hasDsn, initializeSentryClient(), isPerformanceConsentGranted(), ReplayIntegration, syncSentryPerformance()

### Community 104 - "Metrics Retention API"
Cohesion: 0.38
Nodes (6): countFrom(), CountRow, GET, getMetricsRetention(), NO_STORE_HEADERS, unauthorized()

### Community 105 - "Smogon Endpoint"
Cohesion: 0.40
Nodes (5): GET, getPSData(), getSmogonData(), revalidate, runtime

### Community 106 - "User Cards API"
Cohesion: 0.60
Nodes (5): DELETE(), GET(), legacyEndpointResponse(), PATCH(), POST()

### Community 107 - "Team Export"
Cohesion: 0.53
Nodes (5): buildTeamCanvas(), loadImage(), roundRect(), TeamExportButton(), TeamExportButtonProps

### Community 108 - "Source Governance Guides"
Cohesion: 0.40
Nodes (6): Web application source guide, App Router guide, Route Handler guide, Pokémon detail route guide, Quiz route guide, TCG route guide

### Community 109 - "Saved Search API"
Cohesion: 0.70
Nodes (4): DELETE(), GET(), legacyEndpointResponse(), POST()

### Community 110 - "Breeding Route"
Cohesion: 0.50
Nodes (4): BreedingPage(), firstSearchParam(), Props, SearchParamValue

### Community 111 - "Home Tool Cards"
Cohesion: 0.40
Nodes (3): HOME_TOOL_ICONS, HomeToolCardProps, HomeToolIcon

### Community 112 - "Animated Home Copy"
Cohesion: 0.50
Nodes (4): HomeWordReveal(), HomeWordRevealProps, SegmenterLike, segmentText()

## Knowledge Gaps
- **744 isolated node(s):** `revalidate`, `FACT_KEYS`, `SortKey`, `revalidate`, `dynamicParams` (+739 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 896 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTranslation` connect `Dashboard Shell` to `Sealed Portfolio UI`, `Pokémon Reference UI`, `404 Maze Game`, `Cloud Sync and Import`, `Compare and Favorites`, `TCG Collection Screens`, `Auth and Contact UI`, `Pokémon Detail View`, `Navigation and Filters`, `Profile and Sharing`, `Friend Profiles`, `Team Builder UI`, `EV/IV Calculator`, `Pokémon List Data`, `Breeding Calculator`, `TCG Research UI`, `Profile and Quiz Cards`, `TCG Card Details`, `Header and Filters`, `Type Chart UI`, `App Client Shell`, `Local Preferences`, `Album Progress and Attribution`, `Quiz Leaderboards`, `Quiz Experience`, `Encounter Components`, `Wishlist Navigation`, `Card Image Rendering`, `Price Chart Components`, `Activity Statistics`, `Breeding and Nuzlocke`, `Route Error Boundaries`, `Set Progress Insights`, `Competitive Team Data`, `Auth Recovery UI`, `Cookie Consent UI`, `Desktop Navigation`, `Home Collection Preview`, `Album Card Components`, `Activity Heatmap`, `Team Export`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `cn()` connect `Navigation and Filters` to `Pokémon Reference UI`, `Dashboard Shell`, `404 Maze Game`, `Cloud Sync and Import`, `Compare and Favorites`, `TCG Collection Screens`, `Auth and Contact UI`, `Pokémon Detail View`, `Profile and Sharing`, `App Route Layouts`, `Friend Profiles`, `Team Builder UI`, `EV/IV Calculator`, `Breeding Calculator`, `Reference Detail Pages`, `TCG Research UI`, `Profile and Quiz Cards`, `TCG Card Details`, `Header and Filters`, `Type Chart UI`, `Battle Simulator`, `Root and Home Layout`, `Home Experience`, `Album Progress and Attribution`, `Quiz Leaderboards`, `Quiz Experience`, `Encounter Components`, `Wishlist Navigation`, `Card Image Rendering`, `Price Chart Components`, `Activity Statistics`, `Breeding and Nuzlocke`, `Route Error Boundaries`, `Set Progress Insights`, `Battle Rooms`, `Price Alerts`, `Desktop Navigation`, `Album Card Components`, `Activity Heatmap`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `getServerLanguage()` connect `Route Metadata and Auth` to `Editorial Pages`, `Reference Detail Pages`, `Team OG Endpoint`, `Campaign Attribution`, `Breeding Route`, `Root and Home Layout`, `Home Experience`, `App Route Layouts`, `Reference Page Routes`, `Move Detail Pages`, `Legal Pages`, `TCG Set Pages`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `revalidate`, `FACT_KEYS`, `SortKey` to the rest of the system?**
  _744 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Editorial Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Route Metadata and Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.06991260923845194 - nodes in this community are weakly interconnected._
- **Should `Account and Battle API` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._