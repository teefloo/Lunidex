# Preuves de l’audit du 7 octobre 2026

Voir [le rapport](../2026-10-07-audit-navigation-ux-lunidex.md) pour la qualification des observations. Les fichiers bruts comprennent aussi les probes intermédiaires invalidées ; un champ `pass: false` n’est pas à lui seul un défaut supplémentaire.

- [Matrice des destinations](matrice-destinations.csv) : 73 destinations/scénarios sur chaque format ; accès direct séparé des interactions.
- [Couverture et compteurs](couverture.json) : totaux dédupliqués, base Git initiale et résultats de tests.
- `production-batch-01` à `09`, puis `11` : 146 chargements directs ; le numéro 10 préliminaire est conservé sous `diagnostics/team-share-before-settling.json`.
- `interactions-01`, `02`, `03`, `06`, `11`, `12`, `13`, `14` : menus/FAQ, langues, tailles, détails/historique, Pokédex/quiz/combat, catalogue, capacités/types, talents/objets/paramètres.
- `interactions-07`, `card-language-context*`, `set-language-context`, `command-palette-name-red`, `interactions-13`, `interactions-15-responsive` et captures de production : défauts confirmés avant correction.
- `network-prefetch`, `build-network-prefetch`, `network-tcgdex-fresh` : contrôles réseau dédiés. `network-tcgdex-retest` porte sur des lectures déjà en cache.
- `build-final-card-flow`, `build-final-catalog-history`, `build-final-language-keyboard`, `build-final-standalone-actions`, `build-final-command-palette`, `build-final-moves`, `build-final-locales`, `build-final-responsive`, `build-routes` : vérifications locales concrètes.
- `validation-build/` : captures du build local, avec panneau de carte stabilisé et menu corrigé à 1024 px.
- `checks/*.txt` : journaux finaux ; core.txt est vide parce que le contrôle a réussi sans diagnostic.

Les essais de développement `local-*`, les anciennes mesures `build-standalone` et les probes `interactions-04/05/08/09` servent au diagnostic. Le rapport précise leurs limites et les retests qui les remplacent. Les captures ouvertes de modales en production peuvent inclure leur transition initiale ; les observations de fermeture sont aussi enregistrées sous forme structurée.

Aucune preuve ne contient de session personnelle, de secret de configuration ni de donnée de compte autorisée. Les essais sont limités à Chromium émulé et aux lectures publiques.
