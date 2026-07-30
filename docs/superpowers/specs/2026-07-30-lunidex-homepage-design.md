# Lunidex — accueil collection-first et route Pokédex

**Statut :** conception validée ; aucune implémentation dans ce document.

## 1. Décision produit et périmètre

Lunidex est présenté publiquement comme un compagnon de collection TCG avec des outils de jeu intégrés.

- Slogan : « Collectionnez vos cartes. Jouez vos Pokémon. »
- Promesse : « Votre collection TCG et vos équipes Pokémon, enfin réunies dans un espace simple et personnel. »
- Le compte est facultatif ; aucune invitation contextuelle à en créer un ne doit interrompre le parcours avant la première valeur. Le contrôle discret de compte du header peut rester disponible.
- La collection est d'abord enregistrée dans le navigateur sur l'appareil utilisé. La synchronisation est une option ultérieure, seulement lorsqu'elle est disponible.
- Lunidex est un projet indépendant et non officiel.

La route `/{locale}` devient un accueil public collection-first. Le Pokédex actuel devient une vraie route `/{locale}/pokedex`. Cette extraction, la migration de ses composants, les liens internes, le sitemap, les tests, les traductions et les métadonnées associées font partie de la future implémentation.

### Hors périmètre

- Implémenter cette page, créer des composants, modifier des routes, des assets ou des traductions.
- Ajouter une donnée telle que `tcgLastVisitedSetId`, une stratégie de migration ou de synchronisation associée.
- Créer un tableau de bord sur l'accueil, des recommandations personnalisées, des statistiques marketing, des témoignages ou des compteurs d'utilisateurs.
- Créer un événement analytics d'accueil, de clic ou d'hydratation supplémentaire.
- Étendre le rebranding visible de toutes les pages secondaires, sauf lorsqu'un élément global doit être corrigé pour que l'accueil ne publie pas de référence PrimeDex.

## 2. Identité publique et compatibilité technique

Tous les contenus publics de l'accueil utilisent **Lunidex** : interface, traductions, métadonnées, Open Graph, textes alternatifs et données structurées. Aucune référence publique à PrimeDex ne doit rester sur cette page, y compris dans ses images et JSON-LD.

Les identifiants techniques historiques PrimeDex restent inchangés lorsqu'ils protègent la compatibilité ou les données existantes : clés IndexedDB et localStorage, clés d'authentification, noms internes de stores et de packages, identifiants Supabase et autres identifiants de persistance. Ils ne sont pas exposés comme identité publique.

Les URLs canoniques, `hreflang`, sitemap et JSON-LD sont construits à partir de `SITE_URL`. Aucun domaine Lunidex n'est codé en dur.

## 3. Structure de page

1. Header global : Pokédex, Équipe, TCG, Collection, Quiz ; le lien Pokédex mène à `/{locale}/pokedex`.
2. Hero collection-first, avec aperçu collection intégré au même ensemble sémantique.
3. Section autonome Outils de jeu : deux cartes, Pokédex et Équipe.
4. Parcours collection en trois étapes.
5. Réassurance d'usage local et de synchronisation facultative.
6. FAQ courte.
7. Footer adapté sans lien GitHub, avec avertissement de non-affiliation.

L'accueil ne charge ni grille Pokédex, ni recherche, ni filtres, ni listes de Pokémon, ni données TCG distantes au-dessus du pli.

## 4. Hero et aperçu collection

### 4.1 Contenu public rendu côté serveur

Le `h1`, la promesse et la géométrie du hero sont identiques côté serveur pour tous les visiteurs. L'hydratation ne modifie ni le slogan, ni la promesse, ni les métadonnées, ni la structure de la page.

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Sur-titre | `Lunidex` | `Lunidex` |
| H1 | `Collectionnez vos cartes. Jouez vos Pokémon.` | `Collect your cards. Play your Pokémon.` |
| Promesse | `Votre collection TCG et vos équipes Pokémon, enfin réunies dans un espace simple et personnel.` | `Your TCG collection and Pokémon teams, finally together in one simple, personal space.` |
| Réassurance | `Commencez sans compte.` | `Start without an account.` |
| CTA principal, sans collection | `Commencer ma collection` | `Start my collection` |
| CTA principal, collection locale | `Reprendre ma collection` | `Resume my collection` |
| CTA secondaire | `Explorer le Pokédex` | `Explore the Pokédex` |

Destinations :

- Tous les CTA collection utilisent le résolveur de reprise défini à la section 5.
- CTA Pokédex : `/{locale}/pokedex`.

### 4.2 Mise en page au-dessus du pli

À **1440 px**, le hero est sur deux colonnes : texte, réassurance et deux CTA à gauche ; aperçu collection à droite. Le début de l'aperçu est visible sans défilement.

À **375 px**, le hero est sur une colonne : sur-titre, H1, promesse, CTA principal pleine largeur, CTA secondaire, réassurance, puis aperçu collection. L'aperçu reste dans la même section sémantique que le hero ; il n'est pas une section répétée sous le hero. Les cibles tactiles mesurent au moins 44 px.

### 4.3 Aperçu sans collection

Cet aperçu public est une représentation décorative d'interface, pas un skeleton ni une collection fictive. Il n'effectue aucune requête distante.

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Libellé | `APERÇU COLLECTION` | `COLLECTION PREVIEW` |
| Titre | `Votre collection, en un coup d’œil.` | `Your collection, at a glance.` |
| Texte | `Choisissez une extension, ajoutez vos cartes et suivez votre progression à votre rythme.` | `Choose a set, add your cards, and follow your progress at your own pace.` |
| Indication | `Aperçu de l’interface` | `Interface preview` |
| CTA contextuel | `Commencer ma collection` | `Start my collection` |

Le visuel contient seulement trois ou quatre silhouettes de cartes neutres et une ligne visuelle non animée. Il est `aria-hidden`, n'a pas de rôle `progressbar` ni de valeur accessible fictive. Le titre, le texte et l'indication visible portent la valeur accessible. Le CTA contextuel utilise aussi le résolveur de reprise défini à la section 5, sans nouvel événement analytics de position.

### 4.4 Aperçu avec collection locale

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Libellé | `VOTRE COLLECTION` | `YOUR COLLECTION` |
| Titre | `Votre collection vous attend.` | `Your collection is ready.` |
| Compteur | `{{count}} carte enregistrée sur cet appareil` / `{{count}} cartes enregistrées sur cet appareil` | `{{count}} card saved on this device` / `{{count}} cards saved on this device` |
| Réassurance | `Aucun compte nécessaire.` | `No account required.` |
| CTA | `Reprendre ma collection` | `Resume my collection` |

L'aperçu n'affiche que le nombre réel de cartes locales, avec pluralisation localisée dans les huit langues. Il n'affiche ni total d'extension ni pourcentage sans données fiables. Il n'invente ni image de carte, ni extension, ni activité utilisateur.

## 5. Hydratation et reprise locale

Un résolveur client unique est partagé par le CTA du hero, l'aperçu collection, le CTA du parcours en trois étapes et `TCGCollectionStartLink`. Il s'appuie uniquement sur `tcgOwnedCards` et `_hasHydrated`, sans requête réseau et sans tenter de déduire une extension à partir de la forme des identifiants de cartes.

| État local | Destination | Libellé |
| --- | --- | --- |
| Avant hydratation ou aucune carte possédée | `/{locale}/tcg/start?source=home_cta` | `Commencer ma collection` |
| Au moins une carte possédée | `/{locale}/tcg/collection` | `Reprendre ma collection` |
| Stockage inaccessible | `/{locale}/tcg/start?source=home_cta` | `Commencer ma collection` |

`tcgActiveSets[0]` ne signifie ni dernière extension visitée ni meilleure destination et ne doit pas être utilisé dans cette refonte. Une reprise vers un album est explicitement hors périmètre jusqu'à l'existence d'un champ persistant dédié, avec une stratégie de migration et de synchronisation.

Avant hydratation, le CTA et l'aperçu ont les dimensions définitives de leur état final. La version publique est rendue sans spinner. Après hydratation, seuls le libellé, la destination et le contenu interne réservé peuvent changer. Le focus n'est jamais déplacé et aucune annonce intrusive n'est émise.

## 6. Outils de jeu

Cette première section autonome après le hero rend Pokédex et Équipe immédiatement identifiables sans introduire un troisième CTA global.

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Sur-titre | `OUTILS DE JEU` | `GAME TOOLS` |
| Titre | `Explorez les Pokémon. Composez votre équipe.` | `Explore Pokémon. Build your team.` |
| Texte | `Consultez le Pokédex et préparez des équipes équilibrées dans le même espace.` | `Browse the Pokédex and prepare balanced teams in the same place.` |

| Carte | Français | English | Destination |
| --- | --- | --- | --- |
| Pokédex | `Explorer le Pokédex` — `Retrouvez les Pokémon, leurs types, statistiques et évolutions.` | `Explore the Pokédex` — `Browse Pokémon, their types, stats, and evolutions.` | `/{locale}/pokedex` |
| Équipe | `Construire une équipe` — `Composez une équipe et vérifiez sa couverture de types.` | `Build a team` — `Create a team and check its type coverage.` | `/{locale}/team` |

Les deux cartes sont sur une ligne à partir du desktop et empilées sur mobile. Elles sont entièrement cliquables, accessibles au clavier et n'embarquent ni grille de Pokémon, ni constructeur, ni recommandation, ni statistique compétitive.

## 7. Parcours collection et réassurance

### 7.1 Parcours en trois étapes

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Sur-titre | `UNE COLLECTION SIMPLE À SUIVRE` | `A SIMPLE COLLECTION TO FOLLOW` |
| Titre | `Ajoutez vos cartes, gardez le fil.` | `Add your cards, keep track.` |
| Étape 1 | `Choisissez une extension` — `Partez d’une extension que vous collectionnez.` | `Choose a set` — `Start with a set you collect.` |
| Étape 2 | `Ajoutez vos cartes` — `Marquez simplement les cartes que vous possédez.` | `Add your cards` — `Simply mark the cards you own.` |
| Étape 3 | `Suivez votre progression` — `Visualisez l’avancement de chaque extension.` | `Track your progress` — `See the progress of every set.` |
| CTA | `Commencer ma collection` / `Reprendre ma collection`, selon le résolveur de la section 5 | `Start my collection` / `Resume my collection`, according to the resolver in section 5 |

Le CTA utilise le résolveur de la section 5 : sans cartes, `/{locale}/tcg/start?source=home_cta` et « Commencer ma collection » ; avec cartes locales, `/{locale}/tcg/collection` et « Reprendre ma collection ». Cette section ne contient ni chiffres, ni exemple de collection, ni carrousel.

### 7.2 Réassurance

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Titre | `Commencez sans compte.` | `Start without an account.` |
| Texte | `Vos cartes sont d’abord enregistrées dans ce navigateur, sur cet appareil. Vous pourrez créer un compte plus tard pour activer la synchronisation lorsqu’elle est disponible.` | `Your cards are first saved in this browser on this device. You can create an account later to enable synchronization when it is available.` |
| Mention | `Lunidex est un projet indépendant et non officiel.` | `Lunidex is an independent, unofficial project.` |
| Lien | `En savoir plus sur Lunidex` | `Learn more about Lunidex` |

Le lien mène à `/{locale}/about` et reste secondaire.

## 8. FAQ

`HomeFaqSection` reste sur l'accueil mais utilise exactement les quatre questions et réponses visibles suivantes.

| Question française | Réponse française | English question | English answer |
| --- | --- | --- | --- |
| `Faut-il un compte pour commencer ?` | `Non. Vous pouvez commencer à suivre vos cartes sans compte.` | `Do I need an account to start?` | `No. You can start tracking your cards without an account.` |
| `Où sont enregistrées mes cartes ?` | `Vos cartes sont enregistrées dans ce navigateur, sur cet appareil. Elles peuvent être perdues si vous effacez les données du navigateur. La synchronisation est facultative et proposée seulement lorsqu’elle est disponible.` | `Where are my cards saved?` | `Your cards are saved in this browser on this device. They can be lost if you clear your browser data. Synchronization is optional and offered only when it is available.` |
| `Comment suivre une extension ?` | `Choisissez une extension, ajoutez les cartes que vous possédez et consultez votre progression.` | `How do I track a set?` | `Choose a set, add the cards you own, and view your progress.` |
| `Puis-je aussi préparer une équipe Pokémon ?` | `Oui. Le Pokédex et l’outil Équipe sont accessibles depuis Lunidex.` | `Can I also prepare a Pokémon team?` | `Yes. The Pokédex and Team tool are available from Lunidex.` |

Le JSON-LD `FAQPage` est conservé, reproduit strictement les quatre questions et réponses visibles et est couvert par un test de correspondance. Il n'est pas utilisé comme promesse de résultat enrichi : les résultats FAQ enrichis sont généralement réservés par Google aux sites gouvernementaux et de santé reconnus.

## 9. Extraction de la route Pokédex et composants

| Élément actuel | Décision | Destination ou responsabilité |
| --- | --- | --- |
| `Header` et navigation | Conserver et adapter | Marque publique Lunidex sur l'accueil ; lien Pokédex vers `/{locale}/pokedex` |
| `HeroSection` | Remplacer | Hero collection-first et aperçu intégré |
| `TCGCollectionStartLink` | Conserver et faire évoluer | Réutilise le résolveur unique de reprise |
| `PokemonList` | Déplacer | `/{locale}/pokedex` |
| `HeroControls` | Déplacer | `/{locale}/pokedex` avec recherche et filtres |
| `PokemonOfTheDay` | Déplacer | `/{locale}/pokedex` |
| Préchargements des listes Pokémon de la racine | Déplacer | Future route Pokédex, absents de l'accueil |
| `ClientRecentlyViewed` | Déplacer | Sous la grille principale ou dans une zone secondaire de `/{locale}/pokedex`, toujours chargé côté client |
| `HomeFaqSection` | Conserver et réécrire | FAQ collection-first décrite ci-dessus |
| `ItemList` Pokédex | Déplacer | `/{locale}/pokedex` |
| `HowTo` Équipe | Supprimer | Ne pas le déplacer vers `/{locale}/team` dans cette implémentation |
| Métadonnées Pokédex de la racine | Déplacer et adapter | `/{locale}/pokedex` |

Les fonctions exclues de l'accueil sont : grille, recherche et filtres Pokédex ; Pokémon du jour ; favoris et états capturé/manquant ; cartes TCG réelles au-dessus du pli ; prix, rareté, wishlist, comparaison et deck builder ; badges, activité, quiz, social, partage, classement, paramètres et tableau de bord ; demande de compte contextuelle avant la première valeur ; carrousels, témoignages et métriques inventées.

## 10. Métadonnées et données structurées

### 10.1 Métadonnées de l'accueil

| Élément | Français de référence | English reference |
| --- | --- | --- |
| Titre SEO | `Lunidex — Collection TCG et équipes Pokémon` | `Lunidex — TCG collection and Pokémon teams` |
| Description SEO | `Suivez votre collection de cartes TCG, explorez le Pokédex et préparez vos équipes Pokémon dans un espace simple et personnel. Commencez sans compte.` | `Track your TCG card collection, explore the Pokédex, and prepare your Pokémon teams in one simple, personal space. Start without an account.` |
| OG/X titre | `Lunidex — Collectionnez vos cartes. Jouez vos Pokémon.` | `Lunidex — Collect your cards. Play your Pokémon.` |
| OG/X description | Même texte que la description SEO | Same text as the SEO description |
| Texte alternatif OG | `Aperçu de Lunidex, pour suivre une collection TCG et préparer des équipes Pokémon.` | `Lunidex preview for tracking a TCG collection and preparing Pokémon teams.` |

Chaque accueil localisé et chaque route `/{locale}/pokedex` doit posséder une canonique auto-référente, les huit `hreflang` incluant la locale courante, les mêmes relations réciproques, et `x-default` vers `/en`. Les URLs relatives Next.js sont admises quand `metadataBase` les résout via `SITE_URL`. Les URLs de metadata, sitemap et JSON-LD doivent être cohérentes.

`DEFAULT_OG_IMAGE` et `primedex-og.jpg` sont remplacés avant publication par `/og/lunidex-og.jpg`, une image statique de 1200 × 630. Elle porte le nom Lunidex et une composition abstraite évoquant une collection et un univers connecté, avec silhouettes de cartes et éléments d'interface neutres. Elle n'utilise aucun logo, personnage ou artwork Pokémon, aucune statistique ni fausse donnée, et aucun texte dépendant de la langue afin de servir les huit locales. Son texte alternatif est localisé dans les métadonnées. Toute image, capture, texte alternatif, données structurées ou texte public PrimeDex est retiré ou mis à jour lorsqu'il est rendu sur l'accueil. Les liens et métadonnées Twitter/Discord PrimeDex sont retirés. Le lien GitHub est retiré de l'accueil, du footer rendu sur l'accueil et des données structurées publiques dans cette implémentation. Le dépôt n'est ni renommé ni modifié dans ce chantier ; le lien ne pourra être réintroduit qu'après son rebranding public et celui de son README. Aucun lien social fictif n'est publié.

### 10.2 Audit des JSON-LD globaux

La future implémentation audite, puis réduit, les déclarations aujourd'hui émises depuis `src/app/layout.tsx`.

- Conserver des `WebSite` et `WebApplication` globaux, factuels et au nom de Lunidex.
- Émettre un `WebPage` spécifique à chaque route avec son URL localisée réelle : l'accueil pour `/{locale}` et le Pokédex pour `/{locale}/pokedex`. Le `WebPage` de l'accueil n'est pas émis indistinctement par le layout sur toutes les pages.
- Ne pas déclarer de `legalName`.
- Supprimer le JSON-LD `Organization` ; aucune entité éditrice Lunidex vérifiée ne le justifie dans cette implémentation.
- Retirer `author` et `publisher` qui pointent vers cette organisation inexistante, ainsi que `foundingDate`, `ContactPoint` et `sameAs`.
- Retirer toute `Offer` à prix zéro et tout `availability: InStock`.
- Retirer les captures d'écran tant qu'elles représentent l'ancienne identité ou l'ancien accueil.
- Auditer `FEATURE_LIST` et ne conserver que les fonctions publiques, réelles et vérifiables.
- Retirer le `SearchAction` pointant vers `/?search=...`. Aucun `SearchAction` n'est créé dans cette implémentation.
- Ne pas déclarer d'affiliation officielle, de prix, de disponibilité, de témoignage, de note ou de volume d'utilisateurs.

## 11. Accessibilité, performance et erreurs

### 11.1 Accessibilité

- Un seul `h1` dans le hero ; sections en `h2` et cartes Outils de jeu en `h3`.
- Ordre de tabulation : navigation, CTA hero, CTA contextuel de l'aperçu, cartes Outils de jeu, parcours, lien À propos, FAQ.
- Focus visible, contraste WCAG AA, cibles tactiles d'au moins 44 px et aucune interaction critique dépendante du survol.
- Les états locaux sont exprimés par texte et non par la couleur ou une icône seule.
- Aucun déplacement de focus ni annonce intrusive pendant l'hydratation.

### 11.2 Performance

L'objectif de conception est que le texte server-rendered du hero soit le LCP, sans attente d'IndexedDB, d'API TCG ou d'image distante.

| Phase | Objectif |
| --- | --- |
| Avant lancement, laboratoire | LCP ≤ 2,5 s et CLS ≤ 0,1 ; contrôle des longues tâches et interactions |
| Après trafic consenti suffisant, Speed Insights au 75e percentile | LCP ≤ 2,5 s, CLS ≤ 0,1 et INP ≤ 200 ms |

Lighthouse ou une mesure navigateur sert de contrôle de laboratoire avant lancement ; il ne mesure pas directement l'INP de terrain. Vercel Speed Insights est la mesure terrain au 75e percentile seulement lorsqu'un volume suffisant de trafic consenti est disponible.

- Speed Insights ne doit être monté que lorsque le consentement audience/performance est accordé.
- Aucune liste Pokémon, extension TCG ou image de carte distante n'est dans le chemin critique de l'accueil.
- Les zones hydratées réservent leur taille ; l'aperçu décoratif n'a ni shimmer ni animation de chargement.
- Aucun ajout de police, de bibliothèque d'animation ou de préchargement non critique.
- Les images non critiques sont dimensionnées, optimisées et chargées paresseusement.
- Les `dns-prefetch` PokéAPI globaux sont audités : ils sont déplacés vers les routes qui les utilisent réellement ou retirés s'ils ne servent plus l'accueil.

### 11.3 Erreurs et indisponibilités

| Situation | Comportement |
| --- | --- |
| Stockage lisible, aucune carte | Version publique et CTA démarrage |
| Stockage lisible, cartes locales | Version reprise locale et compteur réel |
| Stockage inaccessible ou erreur de lecture | Version publique sûre et CTA démarrage |
| Réseau indisponible | L'accueil reste rendu et navigable. La route d'activation gère séparément les éventuelles indisponibilités du réseau ou du stockage. |
| Échec d'un enrichissement non critique | Masquer seulement cet enrichissement, sans remplacer le hero par une erreur ou un spinner |

## 12. Mesure consentie

Aucun événement d'accueil, de clic, de vue, d'hydratation ou de lecture du stockage n'est ajouté.

Les CTA collection utilisent tous `source=home_cta`. Le seul jalon produit lié à l'accueil est l'événement existant `tcg_start_opened` avec `propertyA: "home_cta"`, émis par `/tcg/start` après hydratation pour un nouveau collectionneur et seulement lorsque la mesure produit est consentie.

Les événements existants du parcours TCG restent inchangés : `tcg_set_search_used`, `tcg_set_selected`, `tcg_album_opened`, `tcg_first_value_reached`, `tcg_activation_completed`, `tcg_sync_prompt_shown`, `tcg_sync_prompt_actioned`, `tcg_returned_after_activation` et `tcg_activation_error`. Sans consentement, aucun appel de mesure produit ne part.

## 13. Traductions et vérification future

Toutes les nouvelles chaînes de l'accueil, du Pokédex déplacé, des métadonnées et des données structurées reçoivent des clés de traduction dans `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` et `zh`. Les textes français et anglais de référence figurent dans ce document ; les autres traductions doivent préserver le sens, la pluralisation et les destinations.

La future implémentation vérifie au minimum :

- contrôle navigateur à 375 × 812 et 1440 × 900, sans débordement horizontal ;
- navigation complète au clavier, focus visible et tailles tactiles conformes ;
- routes et navigation localisées ;
- comportement sans données, avec données et stockage inaccessible ;
- absence de déplacement visible à l'hydratation et destinations identiques de tous les CTA collection selon le résolveur ;
- conservation de la recherche, des filtres, du Pokémon du jour, de la grille et de l'historique récent sur `/{locale}/pokedex` ;
- absence de préchargement Pokédex sur l'accueil ;
- métadonnées, `hreflang`, sitemap et URLs localisées cohérentes ;
- contrôle des JSON-LD rendus sur l'accueil et `/{locale}/pokedex`, y compris la correspondance FAQ visible/JSON-LD ;
- consentement analytics et conservation des données locales historiques.
