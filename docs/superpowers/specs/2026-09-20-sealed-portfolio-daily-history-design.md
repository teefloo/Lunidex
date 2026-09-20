# Suivi quotidien du portefeuille scellé

## Contexte

Le portefeuille scellé dispose déjà d'un cron Vercel quotidien à `04:47 UTC` pour télécharger les deux publications officielles Cardmarket. Ce traitement est volontairement idempotent : lorsqu'une publication Cardmarket n'a pas changé, il ne réinsère pas les mêmes snapshots de prix.

Le graphique d'historique repose toutefois uniquement sur les jours présents dans `tcg_sealed_price_snapshots`. La table `tcg_sealed_portfolio_daily` existe déjà, mais elle est seulement alimentée comme cache lors du chargement du portefeuille et n'est pas relue pour construire l'historique. En conséquence, l'historique contient les jours de publication Cardmarket plutôt qu'une observation journalière.

## Objectifs

- Conserver la synchronisation Cardmarket automatique une fois par jour.
- Produire un point de valeur du portefeuille pour chaque jour où le portefeuille est consulté.
- Réutiliser la table `tcg_sealed_portfolio_daily` existante pour éviter une nouvelle migration et un nouveau traitement planifié.
- Lire l'historique depuis ce cache journalier afin que les jours sans nouvelle publication Cardmarket restent visibles.
- Ne jamais lancer un téléchargement Cardmarket depuis le navigateur ou à chaque ouverture de page.
- Préserver l'invalidation existante lorsque les transactions changent.

## Hors périmètre

- Calculer les snapshots de tous les comptes chaque jour lorsqu'ils ne visitent pas Lunidex.
- Ajouter un troisième cron Vercel ou une fréquence infra supérieure à une fois par jour.
- Modifier le modèle global des snapshots de prix Cardmarket ou supprimer sa contrainte d'idempotence.
- Ajouter une tâche d'arrière-plan par utilisateur.

## Design retenu

### Flux de données

1. Le cron `/api/cron/tcg-sealed-sync` continue d'exécuter `synchronizeSealedCardmarket` une fois par jour. Il reste l'unique opération lourde : téléchargement, parsing et import des publications Cardmarket.
2. Une requête authentifiée vers `getSealedOverview` charge les transactions et les prix connus, puis calcule la valeur du portefeuille au jour courant avec le dernier prix disponible, même si la publication Cardmarket du jour est inchangée.
3. La requête crée ou met à jour le snapshot du jour courant dans `tcg_sealed_portfolio_daily`. Elle continue également de remplir les anciens jours calculables depuis les snapshots de prix existants.
4. La requête relit ensuite les snapshots journaliers de l'utilisateur et les renvoie dans `history`. L'interface existante du graphique peut donc rester inchangée.
5. Une modification de transaction conserve le comportement actuel : elle supprime les snapshots dérivés de l'utilisateur afin qu'ils soient recalculés à la prochaine consultation.

### Contrat du snapshot

Le champ `data` de `tcg_sealed_portfolio_daily` contient un objet sérialisé correspondant à un `SealedPortfolioPoint` (`day` et les totaux du portefeuille). Les colonnes `transaction_revision` et `price_revision` restent les marqueurs de fraîcheur déjà prévus par le schéma.

Les données sont filtrées côté serveur par `user_id` et par la période demandée. Les lignes malformées ou hors période sont ignorées plutôt que de faire échouer l'ensemble du portefeuille.

### Coût et robustesse

- Le nombre d'invocations Vercel ne change pas : le projet conserve ses deux crons actuels et n'en ajoute aucun.
- L'ouverture de la page ajoute une lecture et une écriture légère dans Neon, sans téléchargement externe.
- L'insertion reste protégée par la clé primaire `(user_id, day)` et ne réécrit une ligne que si la révision transactionnelle ou prix a changé.
- Le cron reste protégé par `CRON_SECRET` et sa fréquence journalière actuelle.

## Fichiers concernés

- `src/lib/tcg-sealed-server.ts` : construire le point du jour, relire les snapshots journaliers et renvoyer l'historique persistant.
- `src/lib/tcg-sealed-server.test.ts` : couvrir la normalisation/lecture des points journaliers si un helper pur est extrait.
- `packages/core/src/lib/sealed-analytics.test.ts` ou le test partagé équivalent : conserver les invariants de calcul de valeur et de totaux.

Aucune modification de `vercel.json` ni de migration SQL n'est prévue.

## Vérification

- Test unitaire du format de snapshot et de la fusion des points journaliers.
- Test des cas suivants : portefeuille vide, prix absent, point du jour absent des snapshots Cardmarket, période personnalisée et révision transactionnelle modifiée.
- `npm run lint`.
- `npm run typecheck`.
- Tests scellés ciblés.
- Vérification manuelle dans le navigateur : tableau de bord, historique contenant le point du jour et navigation collection/formulaire inchangée.
