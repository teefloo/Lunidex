# Classeurs multilingues et possession indépendante

Date : 20 octobre 2026.

## Audit

Le dépôt était propre au début de l’intervention. Les références personnalisées avaient déjà une identité composée du classeur, de la langue et de l’identifiant catalogue. Le panneau d’ajout utilisait cependant uniquement la langue de navigation. Le détail du classeur lisait `tcgOwnedCards` et son bouton de possession appelait les actions de collection par série.

Le code actuel conserve les données personnelles dans l’état de compte Neon. IndexedDB contient les préférences et le cache catalogue. Les collections exigent une session synchronisée. Cette règle existante est conservée.

## Modifications

- Chaque entrée de classeur possède une quantité indépendante, comprise entre 0 et 9 999. L’ajout crée une copie. La quantité zéro conserve une carte à rechercher. Le retrait efface uniquement l’entrée du classeur concerné.
- Les quantités classiques, variantes, compteurs de progression et autres classeurs ne changent pas lorsque le classeur est modifié.
- Le panneau d’ajout possède son sélecteur de langue. Changer de langue conserve la recherche et réinitialise les filtres dépendant du catalogue précédent.
- Les éditions française et japonaise d’un même identifiant catalogue coexistent. Leur nom, extension, lien et image suivent leur langue. Une image indisponible utilise le dos de carte, sans afficher une autre édition anglaise.
- Le détail permet de filtrer par langue et de chercher par nom, identifiant ou code de langue. La saisie de quantité conserve un brouillon et valide sur perte de focus ou Entrée.
- La recherche par identifiant respecte les critères de filtre, indépendamment du tri. Les filtres de possession du panneau utilisent le classeur et la langue sélectionnée.
- Les nouvelles chaînes sont traduites dans les huit langues d’interface.

## Données et compatibilité

`TCGCustomCollectionCard.quantity` est un champ numérique additionnel. Une référence historique sans ce champ est normalisée à une copie dans le classeur. Ses identifiants, langue, nom et date sont conservés. La possession des séries n’est jamais consultée pour calculer cette quantité.

Le même normaliseur du package core est utilisé par la validation serveur de l’état de compte et par la réconciliation de synchronisation. L’identité des entrées reste inchangée, donc les éditions linguistiques gardent des quantités et métadonnées de synchronisation distinctes. Le cache des détails catalogue ne constitue pas la source des quantités affichées.

Aucune nouvelle table ni migration SQL n’est nécessaire : les classeurs restent dans le document JSON de compte existant. Aucune base distante n’a été modifiée et aucun déploiement n’a été effectué.

## Validation

Les tests navigateur lancent réellement Next.js avec webpack et Chromium sur `127.0.0.1:3000`. Chaque scénario dispose d’un contexte navigateur isolé. Neon Auth, l’API d’état de compte, les réponses TCGdex et les images sont simulés localement. Les captures utilisent donc des rectangles de test à la place des illustrations. Les requêtes d’écriture d’état sont interceptées et conservées uniquement en mémoire du test.

| Vérification | Résultat |
| --- | --- |
| `npm test` | 725 tests réussis dans 139 fichiers |
| `npm run lint` | Réussi |
| `npm run typecheck` | Réussi |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Réussi |
| `npm run seo:check` | Réussi |
| `npm run test:e2e:tcg-custom` | 5 scénarios Chromium réussis, ordinateur et mobile |
| `npm run build` | Réussi, webpack ; envoi de sourcemaps Sentry et télémétrie Next désactivés pour cette exécution |

Les tests unitaires couvrent la normalisation des anciens enregistrements, le rejet des quantités invalides, les éditions linguistiques distinctes, l’indépendance dans les deux sens, les suppressions, les quantités réconciliées par synchronisation, les filtres d’identifiant et l’absence de substitution de données ou d’images anglaises.

Les parcours navigateur couvrent la création sur ordinateur et mobile, l’ajout, le focus clavier, une panne catalogue simulée, le rechargement, un classeur historique, une entrée à quantité zéro et un classeur de 2 400 entrées avec pagination de 48 cartes et au plus six requêtes de détail simultanées. Le scénario multilingue vérifie une carte française déjà possédée en série, son édition japonaise, leurs quantités, les filtres, la saisie au clavier, les deux sens d’indépendance et le retrait suivi d’un rechargement.

## Limites de la validation

La connexion à une vraie instance Neon et la disponibilité actuelle des données TCGdex ne sont pas testées par ces scénarios isolés. Les conditions d’accès au compte restent celles du projet. La validation locale ne nécessite aucune écriture sur un service externe.

## Parcours demandés

| Test | Preuve locale |
| --- | --- |
| A : multilingue | Ajout de cartes françaises et japonaises dans un seul classeur, affichage des deux noms et extensions |
| B : éditions | Deux entrées `base1-4`, langues `fr` et `ja`, quantités 4 et 1 |
| C : déjà possédée | La carte française avait déjà trois copies dans la série avant son ajout au classeur |
| D : indépendance | Modification puis retrait dans le classeur sans changement des enregistrements de série |
| E : inverse | Quantité classique passée de 3 à 2 dans son interface, classeur conservé à 4 et 1 |
| F : persistance | Rechargement après modification puis après retrait, langues et quantités conservées via l’API locale simulée |
| G : interface | Recherche, sélection de langue, filtre de langue, saisie au clavier, retrait, contrôle du débordement mobile, console et captures |
| H : régressions | Anciennes références sans quantité, classeur à quantité zéro, pagination de 2 400 entrées ; tests unitaires des variantes et compteurs classiques |

## Captures

- [Classeur multilingue sur ordinateur](multilingual-binder-desktop.png).
- [Les deux éditions sur mobile](multilingual-binder-mobile.png).
- [Édition japonaise conservée après retrait de la française et rechargement](multilingual-binder-mobile-after-removal.png).

Le scénario multilingue se termine sans erreur console ni exception de page. Les scénarios de panne catalogue produisent volontairement des réponses 503. Un avertissement de développement sur le chargement du logo LCP reste extérieur à cette fonctionnalité. Le badge de diagnostic Next.js est replié par le test s’il recouvre un contrôle mobile. Une alerte React intermittente observée pendant une exécution précédente n’a pas été reproduite lors de la relance isolée ni de la dernière suite complète ; l’outil de diagnostic Next.js ne signalait aucune erreur active.

Le build de production termine avec succès, y compris TypeScript et la génération de 308 pages statiques. Il émet les avertissements existants concernant le runtime Edge déprécié et sa génération statique.

Le serveur de production local a ensuite été démarré sur `http://127.0.0.1:3000`. La route `/fr/tcg/collection?view=custom` répond HTTP 200. Les données personnelles y restent soumises à la session du compte ; les collections de test ne sont pas injectées dans ce serveur.
