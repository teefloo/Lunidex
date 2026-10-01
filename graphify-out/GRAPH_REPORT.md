# Graph Report - Lunidex  (2026-10-01)

## Corpus Check
- Corpus: 645 files · ~370,690 words (643 code files, 2 documents). Seven SQL files were not parsed because the optional tree_sitter_sql dependency is unavailable.

## Summary
- 4490 nodes · 14435 edges · 157 communities (149 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 152 edges (avg confidence: 0.85)
- Graphify-recorded token cost: 0 input · 0 output. The semantic agent response did not include token usage, so this excludes semantic-agent tokens.

## Extraction Integrity
- Diagnostics found 533 dangling-endpoint edges, 6 self-loops, and endpoint collapses (238 directed, 243 undirected). The graph may be incomplete.

## Community Hubs (Navigation)
- Shared Application Components
- Anniversary Content Pages
- API Keys and Sealed Data
- Product Analytics Events
- Account Data Export
- Ability and Item Catalog
- Battle Room Interface
- Localized Marketing Pages
- Pokemon Reference and Breeding
- Authentication and Deck Tools
- Analytics Query Charts
- Not Found Maze Game
- Sealed Product Search
- Localized Route Metadata
- TCG Collection Valuation
- TCG Card Search API
- Pokemon Detail Panels
- Sealed Portfolio Analytics
- TCG Card Detail UI
- Ability and Item Routes
- Sealed Portfolio Workspace
- Pokemon REST Client
- TCG Collection Types
- Legal Policy Pages
- About and FAQ Content
- Route Errors and Nuzlocke
- Client Observability Feedback
- Quiz Submission API
- Smogon Data API
- EV and IV Calculator
- Localized TCG Set Albums
- TCG Card and Set Routes
- Header Language Controls
- Shared Client Providers
- TCG Search Insights
- Profile and Quiz Routes
- Unified Authenticated Routes
- Locale Proxy and Caching
- TCG Domain Types
- Sealed Product Pages
- Friend Collection API
- Breeding Calculator
- Dashboard Activity Data
- Collection Sync State
- Workspace Dependencies
- Shared Pokemon Domain
- Campaigns and Consent
- Sealed Product Guides
- TCG Collection Helpers
- Collection Key Utilities
- Evolution and Social Metadata
- Home Filters and Menus
- Anniversary Product Types
- Anniversary Card Data
- Ability and Item Detail Pages
- Neon Sync Client
- Root Package Manifest
- Sealed Portfolio Data
- UI Tests and Contrast
- TCG Card and Set Pages
- Sentry Runtime Setup
- Sitemap Generation
- TCG Card Detail Components
- Neon Authentication
- Sealed Portfolio Types
- Battle Simulator
- Pokemon Move Pages
- Holographic Card Effects
- Open Graph Image Assets
- UI Component Configuration
- Cardmarket Price Data
- Friend Data Client
- Authentication Providers
- OpenAPI Document
- Booster Price Guides
- TCG Price Charts
- Pokemon Team Suggestions
- Sealed Product Releases
- Analytics Consent Bridges
- Quiz Leaderboard
- Shared Data Cache
- Development Overlay
- TCG Collection Navigation
- IndexedDB API Cache
- TCG Set Catalog
- Booster Value Analysis
- TypeScript Configuration
- Authentication Dependencies
- SEO Validation Script
- Homepage Card Catalog
- TCG Image Utilities
- Pokemon Filter State
- Anniversary Card Data Routes
- Documentation Translations
- Sitemap Entry Builders
- TCG Rarity Helpers
- Core TypeScript Config
- Server Analytics Integration
- Anniversary Card Grid
- Account Deletion API
- Contact Form API
- TCG Price History API
- API Documentation Page
- Anniversary Progress Migration
- TCG API Sync Metadata
- Workspace Dev Dependencies
- Badge Progress Logic
- TCG User State Model
- Pokemon Data API
- Pokemon Team Sharing
- Shared Language Utilities
- Local Data Import Export
- Cookie Consent Interface
- Trainer Progression
- Workspace Script Commands
- Sealed Product Models
- Anniversary Progress Tracker
- Dashboard Summary Data
- Public Profile Data
- API Reference Localization
- Toast Notification UI
- Team Share Links
- Badge Tier Logic
- Type Matchup Suggestions
- Move Coverage Analysis
- Continuous Integration Checks
- API Architecture Notes
- Next.js Security and Runtime
- Core Package Exports
- Shared Core Utilities
- Profile Activity Components
- In-Memory Cache
- Pokemon Encounter Data
- Browser Persistence
- Sealed Guide Section
- Smogon Tier Data
- TCG Valuation Helpers
- Metrics Retention Endpoint
- Anniversary Countdown
- Showdown Import Parser
- Competitive Held Items
- Pokemon Card Association
- User Card API
- Breeding Calculator Page
- Sitemap Index Route
- TCG Rarity Normalization
- Open Graph Image Optimization
- Saved Search Endpoint
- Vercel Cron Configuration
- Neon Import Script
- Neon Migration Verification
- Supabase Export Script
- ESLint Configuration
- PostCSS Configuration
- Legacy Service Worker Cache

## God Nodes (most connected - your core abstractions)
1. `useTranslation` - 248 edges
2. `cn()` - 213 edges
3. `getServerLanguage()` - 199 edges
4. `getServerT()` - 191 edges
5. `react` - 152 edges
6. `usePrimeDexStore` - 152 edges
7. `lucide-react` - 141 edges
8. `t()` - 132 edges
9. `buildSubpathLanguages()` - 103 edges
10. `serializeJsonLd()` - 93 edges

## Surprising Connections (you probably didn't know these)
- `makeState()` --calls--> `encodeTCGCollectionCardKey()`  [EXTRACTED]
  src/lib/public-api-tcg.test.ts → packages/core/src/lib/tcg-collections.ts
- `exportSealedPortfolio()` --calls--> `summarizeSealedPortfolio()`  [EXTRACTED]
  src/lib/tcg-sealed-server.ts → packages/core/src/lib/sealed-analytics.ts
- `getSealedCurrentPortfolio()` --calls--> `summarizeSealedPortfolio()`  [EXTRACTED]
  src/lib/tcg-sealed-server.ts → packages/core/src/lib/sealed-analytics.ts
- `getSealedOverview()` --calls--> `summarizeSealedPortfolio()`  [EXTRACTED]
  src/lib/tcg-sealed-server.ts → packages/core/src/lib/sealed-analytics.ts
- `summarizeSealedProductDetail()` --calls--> `summarizeSealedPortfolio()`  [EXTRACTED]
  src/lib/tcg-sealed-server.ts → packages/core/src/lib/sealed-analytics.ts

## Import Cycles
- None detected.

## Communities (157 total, 6 thin omitted)

### Community 0 - "Shared Application Components"
Cohesion: 0.04
Nodes (113): getTCGCardLanguageName(), TCG_CARD_LANGUAGES, AbilitiesPageClient(), ResetPasswordPage(), DashboardPage(), FavoritesPage(), NuzlockeClient(), TCGSetAlbumPage() (+105 more)

### Community 1 - "Anniversary Content Pages"
Cohesion: 0.04
Nodes (94): i18next, Anniversary30Page(), FACT_KEYS, FAQ_NUMBERS, generateMetadata(), getAnniversary30CardLink(), getPageContext(), PRODUCT_MONTH_LABEL_KEYS (+86 more)

### Community 2 - "API Keys and Sealed Data"
Cohesion: 0.06
Nodes (89): isSealedDate(), isSealedProductLanguage(), DELETE, deleteApiKey(), mocks, GET, getApiKeys(), POST (+81 more)

### Community 3 - "Product Analytics Events"
Cohesion: 0.06
Nodes (82): allowed, ephemeralClientKey(), EventName, forbidden(), POST, postProductAnalytics(), ProductPayload, GET (+74 more)

### Community 4 - "Account Data Export"
Cohesion: 0.05
Nodes (86): GET, getAccountExport(), ProfileRow, unavailable(), UserStateRow, BattleChatMessage, BattleRoomRow, BattleTeamMember (+78 more)

### Community 5 - "Ability and Item Catalog"
Cohesion: 0.04
Nodes (68): SortKey, ItemCard(), ItemsPageClient(), itemSpriteUrl(), SortKey, buildLearners(), groupLearnersByMethod(), MoveDetailModal() (+60 more)

### Community 6 - "Battle Room Interface"
Cohesion: 0.05
Nodes (73): lucide-react, BattleRoomSection(), CopyCodeButtonProps, EVIVPageClient(), TABS, GameMode, GameState, GENERATIONS (+65 more)

### Community 7 - "Localized Marketing Pages"
Cohesion: 0.07
Nodes (62): next, AboutPage(), generateMetadata(), generateMetadata(), ContactPage(), ContactSearchParams, firstQueryValue(), generateMetadata() (+54 more)

### Community 8 - "Pokemon Reference and Breeding"
Cohesion: 0.05
Nodes (63): class-variance-authority, BreedingPageClient(), BreedingPageClientProps, isTabId(), TabId, ComparePage(), CompetitiveMeta, EggMoveExplorer (+55 more)

### Community 9 - "Authentication and Deck Tools"
Cohesion: 0.06
Nodes (53): react, AccountMenuProps, AuthModal, AuthModal(), Mode, AuthModalBoundary, AuthModalBoundaryProps, AuthModalBoundaryState (+45 more)

### Community 10 - "Analytics Query Charts"
Cohesion: 0.05
Nodes (59): framer-motion, recharts, @tanstack/react-query, Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart (+51 more)

### Community 11 - "Not Found Maze Game"
Cohesion: 0.06
Nodes (68): advanceMazeGame(), cloneCoord(), coordKey(), countWalkableNeighbors(), createGeneratedRows(), createMazeGame(), createMazeLayout(), createMazeRound() (+60 more)

### Community 12 - "Sealed Product Search"
Cohesion: 0.05
Nodes (57): sealedHistoryDays(), EXPANSION_ALIASES, getSealedCardmarketUrl(), getSealedImageCandidates(), normalizeSearch(), parseSealedCatalogueSearch(), removePhrase(), SealedCatalogueSearch (+49 more)

### Community 13 - "Localized Route Metadata"
Cohesion: 0.06
Nodes (46): generateMetadata(), BattlePage(), generateMetadata(), SwordsIcon, EVIVPage(), generateMetadata(), generateMetadata(), NotFound() (+38 more)

### Community 14 - "TCG Collection Valuation"
Cohesion: 0.07
Nodes (59): TCG_DEFAULT_VARIANT_ORDER, getRarityLabel(), formatCardValue(), formatCurrency(), TCGActiveSetInsights(), TCGCollectionValuationWithTopCards, aggregateCollectionValue(), aggregateCollectionValueBySet() (+51 more)

### Community 15 - "TCG Card Search API"
Cohesion: 0.05
Nodes (57): buildCardQueryParams(), cardMatchesLocalFilters(), compareCards(), compareCollectorNumbers(), compareDates(), compareStrings(), fetchAllCardSearchPages(), fetchCollectionSetAlbumForLanguage() (+49 more)

### Community 16 - "Pokemon Detail Panels"
Cohesion: 0.06
Nodes (51): AdvancedInfo, PokemonDetailClientProps, SpriteGallery, AdvancedInfo(), AdvancedInfoProps, Props, PokemonBuildsProps, GqlPokemonData (+43 more)

### Community 17 - "Sealed Portfolio Analytics"
Cohesion: 0.08
Nodes (55): calculateSealedCashflow(), dayDate(), periodEnd(), ratio(), sealedRecentDays(), shiftDay(), summarizeSealedPortfolio(), allocateCost() (+47 more)

### Community 18 - "TCG Card Detail UI"
Cohesion: 0.06
Nodes (45): getTCGDefaultPhysicalVariant(), handleToggle(), handleMigrationAction(), handleReset(), ActionPill(), formatCardList(), formatRetreatCost(), getCategoryLabel() (+37 more)

### Community 19 - "Ability and Item Routes"
Cohesion: 0.06
Nodes (41): AbilitiesPage(), generateMetadata(), revalidate, generateMetadata(), ItemsPage(), revalidate, generateMetadata(), MovesPage() (+33 more)

### Community 20 - "Sealed Portfolio Workspace"
Cohesion: 0.07
Nodes (39): AliasEditor(), AnalyticsView(), CashflowView(), CatalogueView(), CollectionView(), DashboardView(), dateLabel(), dayShift() (+31 more)

### Community 21 - "Pokemon REST Client"
Cohesion: 0.06
Nodes (46): apiClient, REST_API_BASE, getAbilityPokemon(), getAllMoves(), getItemDetail(), getLocalizedPokemonData(), getPokemonSummarySlice(), AbilityDetail (+38 more)

### Community 22 - "TCG Collection Types"
Cohesion: 0.06
Nodes (45): MigratedLegacyTCGOwnedCards, TCGCollectionCardOwnership, TCGCardLanguage, TCGActiveSetInsightsProps, TCGAlbumCardProps, TCGAlbumPageProps, TCGCardDetailModalProps, TCGCardItemProps (+37 more)

### Community 23 - "Legal Policy Pages"
Cohesion: 0.09
Nodes (30): CookiePolicyPage(), generateMetadata(), generateMetadata(), LegalNoticePage(), generateMetadata(), PrivacyPage(), generateMetadata(), TermsPage() (+22 more)

### Community 24 - "About and FAQ Content"
Cohesion: 0.07
Nodes (39): revalidate, FaqCategory, FaqEntry, FaqLink, FaqPage(), generateMetadata(), revalidate, bodyFont (+31 more)

### Community 25 - "Route Errors and Nuzlocke"
Cohesion: 0.06
Nodes (21): STATUS_CONFIG, EMPTY_RELATIONS, FRIENDS_QUERY_KEY, FriendsClient(), RelationRow(), BackToTopButton(), RouteErrorState(), RouteErrorStateProps (+13 more)

### Community 26 - "Client Observability Feedback"
Cohesion: 0.09
Nodes (37): onRouterTransitionStart(), posthog-js, FeedbackDialog, ReportProblemButton(), ReportProblemButtonProps, applyPostHogConsent(), capturePostHogException(), capturePostHogFeatureError() (+29 more)

### Community 27 - "Quiz Submission API"
Cohesion: 0.08
Nodes (39): AnswerRow, AttemptPayload, invalidAttempt(), isUniqueViolation(), isUuid(), NewAttemptRow, noStoreHeaders(), POST (+31 more)

### Community 28 - "Smogon Data API"
Cohesion: 0.09
Nodes (36): axios, axios-retry, GET, getPSData(), getSmogonData(), revalidate, runtime, Error() (+28 more)

### Community 29 - "EV and IV Calculator"
Cohesion: 0.07
Nodes (39): EVIVCalculator, EVPlanner, BaseStats, calcHP(), calcStat(), DEFAULT_EVS, DEFAULT_STATS, EVIVCalculator() (+31 more)

### Community 30 - "Localized TCG Set Albums"
Cohesion: 0.10
Nodes (36): LocalizedSetAlbumPage(), EmptyCollectionState(), formatCurrency(), LegacySetAttributionRow(), TCGCollectionOverview(), TCGCollectionOverviewProps, withQuery(), formatCurrency() (+28 more)

### Community 31 - "TCG Card and Set Routes"
Cohesion: 0.12
Nodes (38): GET, getTcgCard(), GET, getTcgCollectionSetCards(), getTcgSearch(), getTCGCardCached, getTCGSetCardsPersistent, getTCGSetPersistent (+30 more)

### Community 32 - "Header Language Controls"
Cohesion: 0.09
Nodes (31): HomeLanguageSelect(), HomeLanguageSelectProps, OPTIONS, HeaderActions(), HeaderActionsPlacement, HeaderActionsProps, HeaderDesktopNav(), HeaderLink() (+23 more)

### Community 33 - "Shared Client Providers"
Cohesion: 0.09
Nodes (32): react-i18next, CommandPalette, DeferredInitialLanguageBundle(), DeferredOverlays(), MotionConfigBoundary(), MotionConfigProps, Providers(), ProvidersProps (+24 more)

### Community 34 - "TCG Search Insights"
Cohesion: 0.09
Nodes (35): buildCounts(), buildFacets(), GET, buildInsightLines(), buildTCGSearchInsights(), createSearchId(), DEFAULT_TCG_SEARCH_LIMIT, formatTCGCardCount() (+27 more)

### Community 35 - "Profile and Quiz Routes"
Cohesion: 0.13
Nodes (31): GET(), runtime, CHALLENGE_COLORS, CHALLENGE_LABELS, GET(), MODE_LABELS, runtime, GET() (+23 more)

### Community 36 - "Unified Authenticated Routes"
Cohesion: 0.10
Nodes (29): AuthRouteContext, createHandler(), DELETE, GET, PATCH, POST, PUT, requestWithFreshSessionLookup() (+21 more)

### Community 37 - "Locale Proxy and Caching"
Cohesion: 0.09
Nodes (35): ANNIVERSARY_30_UNSUPPORTED_LOCALES, CachedResourceProbe, config, confirmTcgSetHasCards(), detectLocaleFromAcceptLanguage(), getCachedResourceProbe(), getEnglishFallbackCacheKey(), getResourceProbe() (+27 more)

### Community 38 - "TCG Domain Types"
Cohesion: 0.06
Nodes (35): TCGCollection, TCGCollectionState, TCGPhysicalVariant, TCGCard, TCGCardAbility, TCGCardAttack, TCGCardBooster, TCGCardCategory (+27 more)

### Community 39 - "Sealed Product Pages"
Cohesion: 0.12
Nodes (30): SEALED_PRODUCT_CATEGORY_IDS, SealedPriceSnapshot, generateMetadata(), productId(), ProductPageProps, PublicSealedProductPage(), link(), MarketFrame() (+22 more)

### Community 40 - "Friend Collection API"
Cohesion: 0.10
Nodes (34): accountDeletionInProgress(), canViewSnapshot(), CollectionPageRow, DeckSnapshotRow, DELETE, deleteFriends(), DirectoryRow, FriendshipRow (+26 more)

### Community 41 - "Breeding Calculator"
Cohesion: 0.09
Nodes (32): BreedingCalculatorProps, IvEditor(), IvEditorProps, PokemonPickerProps, STAT_COLORS, STAT_LABELS, BreederPokemon, BreedingChainStep (+24 more)

### Community 42 - "Dashboard Activity Data"
Cohesion: 0.09
Nodes (25): ActivityHeatMap(), computeGrid(), getColorLevel(), getDayLabels(), getMonthLabels(), HeatMapCell, LEVEL_CLASSES, toKey() (+17 more)

### Community 43 - "Collection Sync State"
Cohesion: 0.12
Nodes (31): advanceSyncMetadata(), chooseEntry(), COLLECTION_KEYS, collectionEntryId(), CollectionKey, collectionValues(), compareStamps(), extractSyncMetadata() (+23 more)

### Community 44 - "Workspace Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, axios, axios-retry, @base-ui/react, class-variance-authority, clsx, cmdk, @ducanh2912/next-pwa (+25 more)

### Community 45 - "Shared Pokemon Domain"
Cohesion: 0.06
Nodes (30): getThemeColor(), getTypeGradientStyle(), TYPE_ICONS, AbilityListItem, AbilityPokemonLearner, GraphQLAbilityData, GraphQLAbilityPokemonData, GraphQLMoveData (+22 more)

### Community 46 - "Campaigns and Consent"
Cohesion: 0.11
Nodes (27): CampaignRouteContext, GET(), ConsentPreferencesButton(), MAX_CAMPAIGN_SLUG_LENGTH, normalizeCampaignSlug(), createUnsetProductConsent(), getProductMeasurementConsentFromCookie(), PRODUCT_CONSENT_POLICY_VERSION (+19 more)

### Community 47 - "Sealed Product Guides"
Cohesion: 0.12
Nodes (28): ageDays(), allProductMovers(), buildGuideIndex(), buildProductMovers(), buildSeriesMovers(), GuideBasket, GuideObservation, GuideProduct (+20 more)

### Community 48 - "TCG Collection Helpers"
Cohesion: 0.22
Nodes (30): addTCGCollectionCard(), adjustTCGCollectionVariantQuantity(), assignLegacyTCGSetToCollection(), COLLECTION_VARIANTS, copyTCGLegacyOwnedCards(), decodeTCGCollectionCardKey(), deriveTCGOwnedCardIds(), encodeTCGCollectionCardKey() (+22 more)

### Community 49 - "Collection Key Utilities"
Cohesion: 0.12
Nodes (27): createTCGCollection(), decodeTCGCollectionKey(), encodeTCGCollectionKey(), getTCGCollectionKeysForSet(), normalizeSetId(), normalizeTCGCollectionKeys(), normalizeTokenList(), TCG_PHYSICAL_VARIANTS (+19 more)

### Community 50 - "Evolution and Social Metadata"
Cohesion: 0.11
Nodes (27): alt, contentType, Image(), runtime, size, getCurrentEvolutionSpeciesName(), findLocalizedFormLabel(), FORM_LABELS (+19 more)

### Community 51 - "Home Filters and Menus"
Cohesion: 0.11
Nodes (23): HomeHeaderMobileMenuProps, COLORS, EGG_GROUPS, GENERATIONS, SHAPES, AdvancedFilters, AdvancedFiltersWrapper(), formatPrice() (+15 more)

### Community 52 - "Anniversary Product Types"
Cohesion: 0.08
Nodes (25): Anniversary30CardImageStatus, Anniversary30CardScope, Anniversary30Language, Anniversary30LocalizedAsset, Anniversary30PikachuSlot, Anniversary30PikachuSlotId, Anniversary30Product, Anniversary30ProductMonth (+17 more)

### Community 53 - "Anniversary Card Data"
Cohesion: 0.10
Nodes (29): Anniversary30CardDataset, ANNIVERSARY_30_BASIC_ENERGY_CARDS, ANNIVERSARY_30_CARD_SCOPES, ANNIVERSARY_30_CLASSIC_CARDS, ANNIVERSARY_30_FEATURE_CARD_NAMES, ANNIVERSARY_30_NUMBERED_CARDS, ANNIVERSARY_30_PROMO_CARDS, ANNIVERSARY_30_SECRET_CARDS (+21 more)

### Community 54 - "Ability and Item Detail Pages"
Cohesion: 0.12
Nodes (26): AbilityDetailPage(), dynamicParams, generateMetadata(), Props, revalidate, dynamicParams, generateMetadata(), ItemDetailPage() (+18 more)

### Community 55 - "Neon Sync Client"
Cohesion: 0.12
Nodes (20): NeonSyncBridge(), fetchAppApi(), getAppAccessToken(), retryAsync(), RetryOptions, isLikelyNetworkError(), buildSyncPayload(), getInitialSyncState() (+12 more)

### Community 56 - "Root Package Manifest"
Cohesion: 0.07
Nodes (27): license, name, private, sideEffects, version, workspaces, @base-ui/react, cmdk (+19 more)

### Community 57 - "Sealed Portfolio Data"
Cohesion: 0.16
Nodes (26): SealedSourceStatus, SealedPortfolioPage(), createSealedTransaction(), downloadSealedExport(), fetchPublicSealedCatalogue(), fetchSealedAlias(), fetchSealedCatalogue(), fetchSealedOverview() (+18 more)

### Community 58 - "UI Tests and Contrast"
Cohesion: 0.10
Nodes (18): vitest, GET, mocks, getContrastRatio(), getReadableTextColor(), parseHexColor(), relativeLuminance(), RGB (+10 more)

### Community 59 - "TCG Card and Set Pages"
Cohesion: 0.13
Nodes (24): generateMetadata(), getPageCard, PageProps, TCGCardPage(), buildChecklistMarkup(), buildSetLanguages(), escapeHtml(), formatReleaseDate() (+16 more)

### Community 60 - "Sentry Runtime Setup"
Cohesion: 0.15
Nodes (21): @sentry/nextjs, onRequestError(), register(), getEnvironment(), getTraceSampleRate(), hasDsn, initializeSentryClient(), isPerformanceConsentGranted() (+13 more)

### Community 61 - "Sitemap Generation"
Cohesion: 0.11
Nodes (24): GET(), revalidate, ANNIVERSARY_30_INDEXABLE_LANGUAGES, ANNIVERSARY_30_LAST_MODIFIED_DATE, EDITORIAL_ROUTES, assertSitemapIntegrity(), assertValidAbsoluteUrl(), EDITORIAL_SITEMAP_ROUTES (+16 more)

### Community 62 - "TCG Card Detail Components"
Cohesion: 0.11
Nodes (22): getAbilities(), TCGCardDetailModal, TCGCardDetailRoute(), CatalogSearchInput(), CatalogSearchInputProps, FilterSection(), FilterSectionProps, TCGFiltersProps (+14 more)

### Community 63 - "Neon Authentication"
Cohesion: 0.09
Nodes (22): AppSession, AppUser, AuthActionResponse, AuthContext, AuthContextValue, AuthErrorLike, AuthProvider(), AuthResult (+14 more)

### Community 64 - "Sealed Portfolio Types"
Cohesion: 0.12
Nodes (20): SealedPortfolioSummary, SealedCashflowRow, SealedPortfolioPoint, SealedPortfolioTotals, SealedPosition, SealedPositionView, SealedTransaction, SealedTransactionDraft (+12 more)

### Community 65 - "Battle Simulator"
Cohesion: 0.15
Nodes (23): BattleClient(), BattleSimulator, BattleLog(), BattleSimulator(), DamageBar(), MoveSelector(), PokemonWithMoves, BattleLogEntry (+15 more)

### Community 66 - "Pokemon Move Pages"
Cohesion: 0.14
Nodes (19): dynamicParams, fetchMoveDetail(), fetchPokemonStats(), generateMetadata(), GENERATION_LABELS, MoveDetailPage(), PokemonStatResult, Props (+11 more)

### Community 67 - "Holographic Card Effects"
Cohesion: 0.16
Nodes (23): adjust(), clamp(), getInitialHoloStyle(), hashToUnit(), HoloStyle, TCGHolographicCard, BASIC_RARITIES, formatStageSubtype() (+15 more)

### Community 68 - "Open Graph Image Assets"
Cohesion: 0.11
Nodes (23): detectOgImageMimeType(), encodeBase64(), fetchOgImageDataUrl(), getTrustedOgImageUrl(), isTrustedHttpsUrl(), isTrustedOgFontUrl(), loadFirstTrustedOgImageDataUrl(), loadTrustedOgImageDataUrl() (+15 more)

### Community 69 - "UI Component Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 70 - "Cardmarket Price Data"
Cohesion: 0.14
Nodes (16): SealedPriceMetrics, decodeJson(), downloadAndParseSealedCardmarketData(), downloadBytes(), DownloadedCardmarketData, isRecord(), metricCents(), nonNegativeInteger() (+8 more)

### Community 71 - "Friend Data Client"
Cohesion: 0.16
Nodes (19): callApi(), CollectionPageResponse, DecksResponse, DirectoryResponse, ErrorPayload, getErrorMessage(), getFriendDirectoryEntry(), PrivacyResponse (+11 more)

### Community 72 - "Authentication Providers"
Cohesion: 0.24
Nodes (22): normalizeDisplayName(), asRuntimeAuthClient(), captureAuthPostHogEvent(), confirmSignedIn(), ConnectedAuthProvider(), DeferredAuthProvider(), getRedirectTo(), getResetRedirectTo() (+14 more)

### Community 73 - "OpenAPI Document"
Cohesion: 0.12
Nodes (14): GET, privateErrorResponses, privateResponses, sealedTransactionDraftProperties, specification, API_GUIDE_OPERATIONS, API_GUIDE_QUOTAS, ApiGuideParameter (+6 more)

### Community 74 - "Booster Price Guides"
Cohesion: 0.16
Nodes (13): generateMetadata(), BoosterExplainer(), boosterGuideMetadata(), GuideKind, guidePaths, generateMetadata(), PUBLISHED_PULL_STUDIES_V1, PublishedPullRarity (+5 more)

### Community 75 - "TCG Price Charts"
Cohesion: 0.15
Nodes (17): ChartTooltip(), ChartTooltipProps, Days, formatChartAmount(), formatDate(), formatTimestamp(), PriceChart(), PriceChartProps (+9 more)

### Community 76 - "Pokemon Team Suggestions"
Cohesion: 0.18
Nodes (20): AutoCompleteOptions, AutoCompleteResult, buildPokemonDetailFromBasic(), calculateTeamSynergyScore(), classifyRoleByStats(), DEFAULT_AUTO_COMPLETE_OPTIONS, getBaseStatTotal(), getPokemonTypes() (+12 more)

### Community 77 - "Sealed Product Releases"
Cohesion: 0.19
Nodes (15): generateMetadata(), releaseSortTime(), SealedReleasesPage(), sortReleases(), PURCHASE_SAFETY_V1, PurchaseSafetyTopicV1, POKECARDEX_2026_SOURCE, SEALED_RELEASES_V1 (+7 more)

### Community 78 - "Analytics Consent Bridges"
Cohesion: 0.24
Nodes (12): PostHogConsentBridge(), PostHogIdentityBridge(), SentryConsentBridge(), AnalyticsEvent, VercelInsights(), DeferredComponents, IdleClientServices(), Window (+4 more)

### Community 79 - "Quiz Leaderboard"
Cohesion: 0.15
Nodes (17): LeaderboardRow(), PERIOD_LABELS, QuizLeaderboardProps, LEADERBOARD_PERIODS, LeaderboardEntry, LeaderboardPeriod, LeaderboardResponse, answerDailyQuizQuestion() (+9 more)

### Community 80 - "Shared Data Cache"
Cohesion: 0.15
Nodes (19): getAllAbilityNamesCached, getAllItemNamesCached, getAllMoveNamesCached, getAllPokemonNamesCached, assertNonEmpty(), fetchCompleteTcgCardIds(), fetchTcgCardPage(), getValidatedAbilityNames (+11 more)

### Community 81 - "Development Overlay"
Cohesion: 0.15
Nodes (14): agentation, AppContent(), DeferredToaster, InstallPrompt, BeforeInstallPromptEvent, detectInstallPromptMode(), InstallPrompt(), InstallPromptMode (+6 more)

### Community 82 - "TCG Collection Navigation"
Cohesion: 0.20
Nodes (15): getTCGCollectionCardIds(), TCGAlbumPage(), getDisplayableCompletionByRarity(), getMissingCardsInSet(), getSetCompletion(), parseTCGCollectionScrollPosition(), shouldUseTCGCollectionHistoryBack(), TCG_COLLECTION_HISTORY_TARGET_KEY (+7 more)

### Community 83 - "IndexedDB API Cache"
Cohesion: 0.23
Nodes (14): idb-keyval, CacheItem, evictOldestIfNeeded(), getCachedData(), getCacheKey(), getLocalStorage(), isIndexedDbAvailable(), readCacheItem() (+6 more)

### Community 84 - "TCG Set Catalog"
Cohesion: 0.15
Nodes (18): GET, getTcgSets(), loadCollectionSetCatalog(), getCollectionSetAlbumPersistent, getCollectionSetCatalogCached, getCollectionSetCatalogPersistent, getInitialTcgCatalogPersistent, getLimitedCollectionSetCatalogPersistent (+10 more)

### Community 85 - "Booster Value Analysis"
Cohesion: 0.25
Nodes (17): calculateExpectedValue(), calculatePullRates(), CardmarketPriceSnapshotV1, cardmarketUrl(), date(), httpUrl(), label(), nonnegativeNumber() (+9 more)

### Community 86 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 87 - "Authentication Dependencies"
Cohesion: 0.11
Nodes (18): @neondatabase/auth-ui, @daveyplate/better-auth-ui, postcss, sharp, overrides, @better-auth/api-key, @better-auth/core, @better-auth/utils (+10 more)

### Community 88 - "SEO Validation Script"
Cohesion: 0.11
Nodes (15): aiAssets, allUrls, childUrls, failures, families, forbiddenAiPatterns, forbiddenClaims, forbiddenPaths (+7 more)

### Community 89 - "Homepage Card Catalog"
Cohesion: 0.24
Nodes (14): CatalogCardImage(), CatalogCardImageProps, getCardSlots(), HomeCatalogPreview(), HomeCatalogPreviewProps, RARITY_TRANSLATION_KEYS, TCGCardDetailModal, getHomeCatalogCandidates() (+6 more)

### Community 90 - "TCG Image Utilities"
Cohesion: 0.22
Nodes (15): TCGCardImage(), TCGCardImageProps, addTcgDexLanguageVariants(), appendFormat(), buildTcgImageUrl(), getAnniversary30ClassicImage(), getEnglishTcgDexVariant(), getTCGCardImageCandidates() (+7 more)

### Community 91 - "Pokemon Filter State"
Cohesion: 0.14
Nodes (16): HOME_SORT_VALUES, HomeFilterUrlSerializableState, HomeFilterUrlState, HomeSortValue, HomeViewValue, parseBoundedInteger(), parseBoundedRange(), parseEnumList() (+8 more)

### Community 92 - "Anniversary Card Data Routes"
Cohesion: 0.23
Nodes (16): Anniversary30Card, ANNIVERSARY_30_FALLBACK_SET_ID, countAnniversary30IncompleteImages(), getAnniversary30Manifest(), getAnniversary30ManifestDataQuality(), Anniversary30PageData, Anniversary30ProviderStatus, buildAnniversary30PageData() (+8 more)

### Community 93 - "Documentation Translations"
Cohesion: 0.12
Nodes (16): de, DocsTranslation, docsTranslations, en, es, fr, it, ja (+8 more)

### Community 94 - "Sitemap Entry Builders"
Cohesion: 0.24
Nodes (17): absolutePath(), buildAbilitiesSitemapEntries(), buildGuidesSitemapEntries(), buildItemsSitemapEntries(), buildLanguages(), buildMovesSitemapEntries(), buildPokemonSitemapEntries(), buildReferenceEntries() (+9 more)

### Community 95 - "TCG Rarity Helpers"
Cohesion: 0.21
Nodes (12): MAX_TCG_COLLECTION_PHYSICAL_CARDS, DEFAULT_TCG_DISPLAY_CURRENCY, isTCGDisplayCurrency(), normalizeTCGDisplayCurrency(), TCG_DISPLAY_CURRENCIES, TCGDisplayCurrency, DEFAULT_TCG_CARD_LANGUAGE, TCG_CARD_LANGUAGE_ENGLISH_NAMES (+4 more)

### Community 96 - "Core TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 97 - "Server Analytics Integration"
Cohesion: 0.21
Nodes (13): posthog-node, asRequestLike(), capturePostHogServerException(), consentFromRequest(), deduplicationKeys, getCookieHeader(), getDistinctId(), getHeader() (+5 more)

### Community 98 - "Anniversary Card Grid"
Cohesion: 0.16
Nodes (14): Anniversary30CardGrid(), handleFilterChange(), Anniversary30CardGridLabels, Anniversary30CardGridProps, ANNIVERSARY_30_DEFAULT_FILTERS, FILTER_LABEL_KEYS, getCardUrl(), getOwnedSet() (+6 more)

### Community 99 - "Account Deletion API"
Cohesion: 0.21
Nodes (14): claimDeletion(), ClaimedDeletionRow, DELETE, deleteAccount(), DeletePayload, DeletionState, DeletionStateRow, getDeletionState() (+6 more)

### Community 100 - "Contact Form API"
Cohesion: 0.22
Nodes (12): resend, ContactPayload, headers, invalid(), isText(), LIMITS, POST, postContact() (+4 more)

### Community 101 - "TCG Price History API"
Cohesion: 0.19
Nodes (13): CardPricing, extractPriceSnapshot(), GET, getPriceHistory(), hasAnyPrice(), NumericValue, PriceHistoryRow, PriceSnapshot (+5 more)

### Community 102 - "API Documentation Page"
Cohesion: 0.16
Nodes (10): CopyCodeButton(), accessClasses, CodeCopyLabels, generateMetadata(), getAccessLevel(), getOperationParameters(), methodClasses, operationGroups (+2 more)

### Community 103 - "Anniversary Progress Migration"
Cohesion: 0.30
Nodes (12): Anniversary30MigrationState, createAnniversary30MigrationState(), getAnniversary30MigrationPlan(), isValidCardId(), LEGACY_SLOT_IDS, LegacyAnniversary30Progress, parseAnniversary30MigrationState(), parseLegacyAnniversary30Progress() (+4 more)

### Community 104 - "TCG API Sync Metadata"
Cohesion: 0.26
Nodes (13): advanceTcgApiSyncMetadata(), asObject(), COLLECTION_KEYS, identity(), parseEntry(), parseMetadata(), parseStamp(), SyncEntry (+5 more)

### Community 105 - "Workspace Dev Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, agentation, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @testing-library/dom, @types/node (+5 more)

### Community 106 - "Badge Progress Logic"
Cohesion: 0.21
Nodes (9): BADGE_DEFINITIONS, ActivityAction, BadgeConditionData, BadgeDefinition, BadgeDefinitionWithStatus, CategoryStats, DashboardData, ExtensibleMetric (+1 more)

### Community 107 - "TCG User State Model"
Cohesion: 0.19
Nodes (10): TCG_COLLECTION_MODEL_VERSION, DEFAULT_TCG_USER_STATE, TCG_USER_STATE_COOKIE, TCGUserState, PrimeDexStore, ActivityAction, QuizSession, TCGDeck (+2 more)

### Community 108 - "Pokemon Data API"
Cohesion: 0.22
Nodes (8): artworkUrl(), formatDexNumber(), GET(), runtime, minimalPokemon, mocks, totalStats(), PUBLIC_OG_CACHE_HEADERS

### Community 109 - "Pokemon Team Sharing"
Cohesion: 0.27
Nodes (11): GET(), parseTeamIds(), NOTE: satori (next/og) renders a stray black rectangle at the SVG origin when, runtime, spriteUrl(), TypeRelations, getPokemonDetailCached, getTypeRelationsCached (+3 more)

### Community 110 - "Shared Language Utilities"
Cohesion: 0.21
Nodes (10): AppLanguage, getBrowserLanguage(), getLanguageId(), isSupportedLanguage(), languageToMetadataLocale, languageToOpenGraphLocale, languageToPokemonLanguageId, resolveLanguage() (+2 more)

### Community 111 - "Local Data Import Export"
Cohesion: 0.26
Nodes (11): countPhysicalTCGCards(), DataExportImport(), ExportPayload, getImportPreview(), ImportPreview, validateImportPayload(), applySyncState(), pickSyncState() (+3 more)

### Community 112 - "Cookie Consent Interface"
Cohesion: 0.27
Nodes (10): ClientCookieBanner(), CookieBanner, CookieBanner(), getCurrentLanguage(), getServerSnapshot(), getSnapshot(), preferenceLabels, readStoredConsent() (+2 more)

### Community 113 - "Trainer Progression"
Cohesion: 0.21
Nodes (11): computeWeeklyQuest(), didLevelUp(), getTrainerLevel(), getWeekNumber(), getXPProgress(), LEVEL_TITLE_KEYS, LEVEL_XP_TABLE, WEEKLY_QUESTS (+3 more)

### Community 114 - "Workspace Script Commands"
Cohesion: 0.18
Nodes (11): scripts, build, db:neon:export, db:neon:import, db:neon:verify, dev, lint, seo:check (+3 more)

### Community 115 - "Sealed Product Models"
Cohesion: 0.36
Nodes (8): SealedProduct, SealedProductLanguage, getSealedExchangeProducts(), getSealedSaleProducts(), SealedExchangePositionWithProduct, SealedExchangeProductCandidate, SealedPositionWithProduct, SealedSaleProductCandidate

### Community 116 - "Anniversary Progress Tracker"
Cohesion: 0.27
Nodes (10): Anniversary30Tracker(), Anniversary30TrackerProps, fillTemplate(), getMigrationMessage(), readStorageValue(), writeStorageValue(), ANNIVERSARY_30_LEGACY_STORAGE_KEY, ANNIVERSARY_30_STORAGE_KEY (+2 more)

### Community 117 - "Dashboard Summary Data"
Cohesion: 0.24
Nodes (10): ExtensibleSectionProps, computeCategoryStats(), GENERATIONS, useDashboardData(), getAllPokemonSummary(), BADGE_DEFINITIONS, findNextBadge(), BadgeConditionData (+2 more)

### Community 118 - "Public Profile Data"
Cohesion: 0.24
Nodes (9): PublicProfileCardProps, rowToPublicProfile(), BadgeDefinition, BadgeDefinitionWithStatus, HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, HANDLE_REGEX, PublicProfile (+1 more)

### Community 119 - "API Reference Localization"
Cohesion: 0.18
Nodes (10): apiDocsTranslations, de, en, es, fr, it, ja, ko (+2 more)

### Community 120 - "Toast Notification UI"
Cohesion: 0.29
Nodes (9): sonner, getSystemTheme(), subscribeSystemTheme(), Toaster(), dispatchToast(), loadSonner(), markToasterReady(), requestToaster() (+1 more)

### Community 121 - "Team Share Links"
Cohesion: 0.36
Nodes (8): firstSearchParam(), generateMetadata(), resolveLang(), sanitizeCode(), SearchParamValue, SharePageProps, TeamSharePage(), RedirectToTeam()

### Community 122 - "Badge Tier Logic"
Cohesion: 0.24
Nodes (8): BADGE_TIER_ORDER, computeBadgeStatus(), getRawValue(), getTierForValue(), TIER_RAW_KEY, BadgeTier, BadgeTierDefinition, TierStatus

### Community 123 - "Type Matchup Suggestions"
Cohesion: 0.27
Nodes (9): CompareSuggestions, CounterSuggestion, findCounterTypes(), findPartnerTypes(), getCompareSuggestions(), getTypesThatHitSuperEffective(), PartnerSuggestion, TypeRelationsForSuggestion (+1 more)

### Community 124 - "Move Coverage Analysis"
Cohesion: 0.24
Nodes (8): analyzeMoveCoverage(), dedupeSuggestions(), getTypeEffectiveness(), MoveCoverageResult, MoveSuggestion, OFFENSIVE_DAMAGE_TYPES, PokemonMoveCoverage, SUPER_EFFECTIVE_MAP

### Community 125 - "Continuous Integration Checks"
Cohesion: 0.22
Nodes (9): Lunidex CI workflow, Core TypeScript check, Lint checks, Node.js 22 setup, npm ci dependency installation, Production build, SEO check, Web workspace type-check (+1 more)

### Community 126 - "API Architecture Notes"
Cohesion: 0.39
Nodes (9): Neon access token helper, Observed route wrapper, Shared Pokémon REST client, Profile route, Potential public API or MCP server foundations, Lunidex API architecture query, TCG search route, Server cache (+1 more)

### Community 127 - "Next.js Security and Runtime"
Cohesion: 0.22
Nodes (8): csp, nextConfig, projectRoot, publicPageCacheHeader, publicPageCacheRoutes, securityHeaders, withPWA, @ducanh2912/next-pwa

### Community 128 - "Core Package Exports"
Cohesion: 0.22
Nodes (8): exports, license, main, name, private, sideEffects, types, version

### Community 130 - "Profile Activity Components"
Cohesion: 0.28
Nodes (8): ACTION_ICONS, formatDate(), GeneralActivity(), GeneralActivityProps, PokedexProgressProps, ProfileAndBadgesProps, QuizStatisticsProps, DashboardData

### Community 131 - "In-Memory Cache"
Cohesion: 0.25
Nodes (4): createMemoryCache(), MemoryCache, MemoryCacheEntry, MemoryCacheOptions

### Community 132 - "Pokemon Encounter Data"
Cohesion: 0.25
Nodes (8): EncounterEntry, EncounterLocationGroup, EncounterVersionGroup, groupEncountersByVersionGroup(), resolveVersionGroup(), VERSION_GROUP_BY_VERSION, VERSION_GROUP_LABELS, VERSION_GROUP_ORDER

### Community 133 - "Browser Persistence"
Cohesion: 0.31
Nodes (6): createResilientStorage(), IndexedDbOperations, isUsablePersistedValue(), ResilientStorageOptions, persistedState, withTimeout()

### Community 134 - "Sealed Guide Section"
Cohesion: 0.46
Nodes (7): guideCoverage(), guideDate(), guideDay(), guideNumber(), guidePercent(), PublicSealedGuideSection(), fetchPublicSealedGuide()

### Community 135 - "Smogon Tier Data"
Cohesion: 0.46
Nodes (6): useSmogonData(), fetchSmogonTier(), normalizeNameForPS(), PSFormatsEntry, SmogonData, SmogonTier

### Community 136 - "TCG Valuation Helpers"
Cohesion: 0.32
Nodes (6): fetchCollectionValue(), fetchValuationCardWithTimeout(), getCollectionValuationTimeoutMs(), mapWithConcurrencyUntilTimeout(), worker(), normalizeOwnedVariantsForValuation()

### Community 137 - "Metrics Retention Endpoint"
Cohesion: 0.38
Nodes (6): countFrom(), CountRow, GET, getMetricsRetention(), NO_STORE_HEADERS, unauthorized()

### Community 138 - "Anniversary Countdown"
Cohesion: 0.43
Nodes (6): Anniversary30Countdown(), Anniversary30CountdownProps, fillTemplate(), getDuration(), Anniversary30ReleaseState, getAnniversary30ReleaseState()

### Community 139 - "Showdown Import Parser"
Cohesion: 0.38
Nodes (6): MatchedSet, ParsedShowdownSet, parseShowdownPaste(), parseStatLine(), slugify(), STAT_ALIASES

### Community 140 - "Competitive Held Items"
Cohesion: 0.29
Nodes (6): GUTS_POKEMON, HeldItem, HeldItemPokemon, ITEMS, NOTABLE_NFE_POKEMON, POISON_HEAL_POKEMON

### Community 141 - "Pokemon Card Association"
Cohesion: 0.52
Nodes (5): containsWholePokemonName(), isNameBoundary(), isPokemonNameInCardTitle(), normalizeCardName(), scriptGroup()

### Community 142 - "User Card API"
Cohesion: 0.60
Nodes (5): DELETE(), GET(), legacyEndpointResponse(), PATCH(), POST()

### Community 143 - "Breeding Calculator Page"
Cohesion: 0.40
Nodes (5): BreedingPage(), firstSearchParam(), generateMetadata(), Props, SearchParamValue

### Community 144 - "Sitemap Index Route"
Cohesion: 0.47
Nodes (5): GET(), revalidate, isNeonConfiguredServer, renderSitemapIndex(), sitemapIndexUrls()

### Community 145 - "TCG Rarity Normalization"
Cohesion: 0.60
Nodes (4): CANONICAL_RARITY_KEYS, getCanonicalTcgRarity(), isSameTcgRarity(), normalizeRarityText()

### Community 146 - "Open Graph Image Optimization"
Cohesion: 0.80
Nodes (3): sharp, optimizeOgImageResponse(), optimizeOgPngResponse()

### Community 147 - "Saved Search Endpoint"
Cohesion: 0.70
Nodes (4): DELETE(), GET(), legacyEndpointResponse(), POST()

### Community 148 - "Vercel Cron Configuration"
Cohesion: 0.40
Nodes (4): crons, name, routes, $schema

### Community 150 - "Neon Migration Verification"
Cohesion: 0.83
Nodes (3): count_rows(), fail(), verify-migration.sh script

## Knowledge Gaps
- **1165 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+1160 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1363 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Authentication and Deck Tools` to `Shared Application Components`, `Anniversary Content Pages`, `Ability and Item Catalog`, `Battle Room Interface`, `Pokemon Reference and Breeding`, `Analytics Query Charts`, `Anniversary Countdown`, `Not Found Maze Game`, `Localized Route Metadata`, `TCG Collection Valuation`, `Pokemon Detail Panels`, `TCG Card Detail UI`, `Ability and Item Routes`, `Sealed Portfolio Workspace`, `Pokemon REST Client`, `Route Errors and Nuzlocke`, `Client Observability Feedback`, `Smogon Data API`, `EV and IV Calculator`, `Localized TCG Set Albums`, `Header Language Controls`, `Shared Client Providers`, `Breeding Calculator`, `Dashboard Activity Data`, `Campaigns and Consent`, `Home Filters and Menus`, `Neon Sync Client`, `Root Package Manifest`, `TCG Card and Set Pages`, `TCG Card Detail Components`, `Neon Authentication`, `Battle Simulator`, `Holographic Card Effects`, `TCG Price Charts`, `Analytics Consent Bridges`, `Quiz Leaderboard`, `Development Overlay`, `TCG Collection Navigation`, `Homepage Card Catalog`, `TCG Image Utilities`, `Anniversary Card Data Routes`, `Anniversary Card Grid`, `Local Data Import Export`, `Cookie Consent Interface`, `Anniversary Progress Tracker`, `Dashboard Summary Data`, `Toast Notification UI`, `Team Share Links`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Battle Room Interface` to `Shared Application Components`, `Anniversary Content Pages`, `Profile Activity Components`, `Ability and Item Catalog`, `Localized Marketing Pages`, `Pokemon Reference and Breeding`, `Authentication and Deck Tools`, `Analytics Query Charts`, `Not Found Maze Game`, `Localized Route Metadata`, `TCG Collection Valuation`, `Pokemon Detail Panels`, `TCG Card Detail UI`, `Ability and Item Routes`, `Sealed Portfolio Workspace`, `Legal Policy Pages`, `About and FAQ Content`, `Route Errors and Nuzlocke`, `Client Observability Feedback`, `EV and IV Calculator`, `Localized TCG Set Albums`, `Header Language Controls`, `Sealed Product Pages`, `Breeding Calculator`, `Dashboard Activity Data`, `Shared Pokemon Domain`, `Home Filters and Menus`, `Ability and Item Detail Pages`, `Root Package Manifest`, `TCG Card and Set Pages`, `TCG Card Detail Components`, `Battle Simulator`, `Pokemon Move Pages`, `TCG Price Charts`, `Quiz Leaderboard`, `Development Overlay`, `TCG Collection Navigation`, `Anniversary Card Grid`, `API Documentation Page`, `Local Data Import Export`, `Cookie Consent Interface`, `Toast Notification UI`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `vitest` connect `UI Tests and Contrast` to `Anniversary Content Pages`, `API Keys and Sealed Data`, `Product Analytics Events`, `In-Memory Cache`, `Account Data Export`, `Browser Persistence`, `TCG Valuation Helpers`, `Authentication and Deck Tools`, `Sealed Product Search`, `Localized Route Metadata`, `TCG Collection Valuation`, `TCG Card Search API`, `Pokemon Detail Panels`, `Sealed Portfolio Analytics`, `TCG Card Detail UI`, `Ability and Item Routes`, `Open Graph Image Optimization`, `Pokemon REST Client`, `TCG Collection Types`, `Sealed Portfolio Workspace`, `About and FAQ Content`, `Client Observability Feedback`, `Smogon Data API`, `Localized TCG Set Albums`, `Shared Client Providers`, `TCG Search Insights`, `Profile and Quiz Routes`, `Unified Authenticated Routes`, `Locale Proxy and Caching`, `Sealed Product Pages`, `Collection Sync State`, `Campaigns and Consent`, `Sealed Product Guides`, `TCG Collection Helpers`, `Collection Key Utilities`, `Evolution and Social Metadata`, `Home Filters and Menus`, `Anniversary Product Types`, `Neon Sync Client`, `Root Package Manifest`, `Sentry Runtime Setup`, `Sitemap Generation`, `TCG Card Detail Components`, `Sealed Portfolio Types`, `Open Graph Image Assets`, `Pokemon Card Association`, `Cardmarket Price Data`, `OpenAPI Document`, `Booster Price Guides`, `Sealed Product Releases`, `TCG Collection Navigation`, `IndexedDB API Cache`, `Booster Value Analysis`, `Homepage Card Catalog`, `TCG Image Utilities`, `Pokemon Filter State`, `Anniversary Progress Migration`, `Pokemon Data API`, `Sealed Product Models`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _1165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared Application Components` be split into smaller, more focused modules?**
  _Cohesion score 0.03962264150943396 - nodes in this community are weakly interconnected._
- **Should `Anniversary Content Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.04487989886219975 - nodes in this community are weakly interconnected._
- **Should `API Keys and Sealed Data` be split into smaller, more focused modules?**
  _Cohesion score 0.05537948290241868 - nodes in this community are weakly interconnected._