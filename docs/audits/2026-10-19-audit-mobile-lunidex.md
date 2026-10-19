# Audit mobile de Lunidex

19 octobre 2026 · Audit local en français, Chromium, build webpack local.

## Résultat

Aucun blocage de navigation Scellés n’a été reproduit. Les liens depuis Collection, Catalogue et le menu mobile ouvrent les destinations attendues, préservent le préfixe `/fr` et `tcgLang` lorsqu’il est présent, et le retour navigateur restitue l’écran précédent. Les huit sous-vues Scellés ont été parcourues à 320 × 568. Les cibles tactiles et les zones testées restent dans la fenêtre.

Une première mesure Playwright, prise dès `DOMContentLoaded`, a capturé le lien du menu avant hydratation et l’a mesuré trop petit. Après attente de l’état interactif, la cible mesure au moins 44 px et le parcours fonctionne ; le test attend désormais la fin du chargement avant de toucher le menu. Ce résultat initial venait du moment de mesure et n’a pas été reproduit comme défaut utilisateur.

Un problème de build a été confirmé puis corrigé : Next.js 16 refusait de compiler l’application quand le slot racine implicite `children` n’avait pas de page `default`. L’ajout de [src/app/default.tsx](../../../src/app/default.tsx) renvoie vers la 404 pour les routes sans contenu correspondant et permet au build de réussir. Aucun autre défaut d’usage mobile n’a été démontré dans les parcours exercés ; le rapport sépare donc la validation de route de la validation fonctionnelle.

## Couverture et preuves

La [matrice détaillée](2026-10-19-mobile-ux/coverage-matrix.csv) donne, par parcours et format, l’état de session, les données, le contrôle exercé, le résultat et les limites. Elle contient 73 destinations concrètes chargées sur mobile et desktop (146 mesures), cinq familles dynamiques : les huit vues connues de Scellés ont été exercées, tandis que les quatre autres familles personnelles ou de collection n’ont pas été testées faute d’identifiants ou de données autorisées. Ses 181 lignes totalisent 165 résultats validés, 8 parcours bloqués par les données réseau et 8 non testés. Les scénarios fonctionnels supplémentaires de cette session y figurent aussi. Le [relevé JSON](2026-10-19-mobile-ux/route-smoke.json) conserve statut, URL finale, titre, erreurs de page et mesures de largeur pour chaque chargement.

Le balayage direct a utilisé des contextes anonymes français à 390 × 844 et 1440 × 900. Il ne relève aucun écart de statut inattendu, erreur de navigation, exception JavaScript, avertissement de montage React ni débordement horizontal. Les deux routes inexistantes ont rendu la 404 attendue dans les deux formats. Vingt-deux requêtes d’écriture ont été bloquées. Ce balayage confirme les routes et le rendu initial ; il ne certifie pas les contrôles métier de chaque page.

Les parcours interactifs exécutés cette session sont :

- Scellés : huit sous-vues, navigation tactile et retour navigateur à 320 × 568 ; accès par le menu à 375 × 667, 390 × 844, 412 × 915 et 844 × 390 paysage ; entrée depuis Collection et Catalogue avec `tcgLang=ja` conservé ([test](../../../e2e/tcg-sealed-mobile.spec.ts)).
- Marché des scellés : recherche, filtre d’extension, application et effacement des filtres, fiche produit publique 611877 et retour au marché à 320 × 568 ([test](../../../e2e/tcg-sealed-fixtures.spec.ts)).
- Transaction Scellés : création, recherche catalogue, prix et quantité, édition puis annulation à 320 × 568. La session, l’état initial et les trois mutations sont des fixtures Playwright locales ([test](../../../e2e/tcg-sealed-fixtures.spec.ts)).
- Classeurs personnalisés : création, ajout d’une carte, rechargement, retour du focus, erreur de recherche simulée et annulation de suppression sur mobile et desktop. Un scénario de 2 400 cartes vérifie l’ordre, la pagination de 48 éléments et une concurrence de lectures de détail plafonnée à six ([test](../../../e2e/tcg-custom-collections.spec.ts)).
- Menu partagé : fermeture par Échap, restauration du focus, verrouillage puis libération du scroll et géométrie à 768, 1024 et 1440 px ([test](../../../e2e/tcg-sealed-mobile.spec.ts)).
- Réinitialisation du mot de passe : jeton retiré de l’URL, formulaire toujours actif après rerendus et jeton transmis à une route d’authentification interceptée localement ([test](../../../e2e/auth-reset-token.spec.ts)).

Résultats E2E : le rejeu sur build de production local des tests Scellés donne 10 réussites et 1 scénario de session privée ignoré par ce mode ; le test de transaction privée a été passé séparément avec fixtures. `npm run test:e2e:tcg-custom` donne 3 réussites et le test de réinitialisation avec fixture locale réussit.

## Anomalies et corrections

| Priorité | Constat | Cause et correction | Vérification |
| --- | --- | --- | --- |
| Élevée — build | Le build Next.js échouait avec `IncompatibleParallelRouteSlotsError` en l’absence de fallback pour le slot racine implicite `children`. | Ajout de `src/app/default.tsx`, qui appelle `notFound()` pour les routes sans page correspondante. | `npm run build` réussit ; 308 pages statiques produites. Le build avait échoué avant l’ajout. |
| Qualité des hooks | Quatre effets déclenchaient des mises à jour d’état synchrones ; deux commentaires ESLint désactivaient inutilement la règle. | Agentation conserve son état initial désactivé sans setter superflu ; le jeton de reset est géré via un store externe qui retire le paramètre avant d’exposer le formulaire ; le menu Pokémon se ferme avec son élément natif et sa clé suit l’onglet ; le brouillon TCG se resynchronise lors du rendu conditionnel à un changement de quantité. Les deux directives inutiles ont été supprimées. | Lint complet, typecheck, suite Vitest et test E2E local du reset réussis. |
| Aucune anomalie UX confirmée | Le blocage de sortie des Scellés n’est pas reproductible dans les variantes testées. | Aucune correction de navigation n’a été nécessaire. Les parcours utilisent l’historique navigateur natif et les liens contextuels existants. | Tests tactiles et retour navigateur listés ci-dessus, sur build local et fixtures. |

Le balayage signale 25 erreurs console et 20 requêtes échouées, sans exception de page. Le [diagnostic réseau détaillé](2026-10-19-mobile-ux/network-findings.json) associe plusieurs échecs aux lectures GraphQL publiques de PokéAPI indisponibles dans l’environnement d’audit ; `/fr/quiz` a aussi reçu un 401 de `/api/auth/token` en contexte anonyme. Les routes concernées restent accessibles, mais leurs données dépendantes du réseau et leurs interactions métier ne sont pas certifiées ici. Les 404 des deux chemins volontairement invalides sont attendues. Un 503 injecté dans le test de classeur valide l’état d’erreur de recherche et ne représente pas une panne réelle.

L’exception de build est documentée ici ; aucune capture avant/après d’interface n’est pertinente puisqu’aucun défaut visuel de navigation n’a été reproduit. Les preuves de comportement sont les tests Playwright et leurs assertions, et celles du balayage sont dans les deux fichiers liés plus haut.

## Contrôles

| Commande | Résultat |
| --- | --- |
| `npm run build` | Réussi, webpack, 308 pages statiques ; avertissements existants Edge Runtime et PWA uniquement. |
| `npm run typecheck` | Réussi ; le build a également terminé le contrôle TypeScript. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Réussi. |
| `npm run seo:check` | Réussi pour les contrôles source ; ce n’est pas un audit du sitemap déployé. |
| `npm test` | 135 fichiers, 693 tests réussis. Le premier lancement sandboxé ne pouvait pas ouvrir le port local ; le rejeu autorisé a réussi. |
| ESLint ciblé sur les composants/hooks corrigés et les tests E2E | Réussi. |
| `npm run lint` complet | Réussi, sans erreur ni avertissement. |
| `E2E_CUSTOM_COLLECTIONS=1 npm run test:e2e -- e2e/auth-reset-token.spec.ts` | 1 scénario réussi ; les appels d’auth sont interceptés localement. |
| `git diff --check` | Réussi. |

## Limites restantes

Les écrans Pokédex, Pokémon, Types, Capacités, Talents, Objets, comparaison, quiz, combat, Nuzlocke, élevage, EV/IV, favoris, équipe/partage, wishlist, Deck Builder, tableau de bord, amis/profils, paramètres, recherche globale, consentement, import/export, authentification, récupération de mot de passe, contact, contenus éditoriaux, pages légales et hors ligne ont été chargés dans le balayage quand ils figuraient dans l’inventaire, mais leurs actions métier n’ont pas toutes été rejouées pendant cette session. Les précédentes vérifications détaillées du 7 octobre sont conservées dans le [rapport de navigation antérieur](../2026-10-07-audit-navigation-ux-lunidex.md) ; elles constituent un repère historique, pas une nouvelle validation de chaque interaction.

Aucune session Neon réelle, donnée de compte, mutation distante ou soumission de formulaire vers un service distant n’a été utilisée ; la soumission du reset ciblait une fixture locale. Les quatre familles personnelles ou de collection restantes sans identifiant demeurent non testées. Les erreurs de lecture PokéAPI empêchent de certifier les vues et calculs qui dépendent de ces données. Français prioritaire et une partie du parcours de classeur en anglais ont été vérifiés ; les huit locales n’ont pas été relues dans cette session. Chromium émulé ne valide ni Safari iOS, ni Chrome Android sur téléphone réel, ni clavier virtuel ou gestes système.

Aucun déploiement, migration, push ou changement de service distant n’a été effectué.
