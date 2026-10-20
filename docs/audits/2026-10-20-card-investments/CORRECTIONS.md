# Corrections de l'audit des investissements

Les corrections portent sur les parcours et calculs existants. Aucun prix absent n'est créé et les références ne deviennent jamais automatiquement des valorisations.

| Constat | Changement |
| --- | --- |
| F01, édition spéciale par défaut | La finition standard unique est proposée ; plusieurs finitions demandent un choix. Une précision n'est obligatoire que pour une édition particulière ou une certification. |
| F02, recherche à refaire | Une fiche de carte ouvre directement un achat avec la carte et sa langue. La sauvegarde ne change pas les quantités de collection. |
| F03, panne du détail bloquante | Une carte déjà identifiée dans le catalogue reste enregistrable avec les informations connues et la saisie manuelle. Un échec d'enrichissement visuel n'annule plus toute la recherche. |
| F04, historique incohérent | Le GET d'historique est en lecture seule. Les anciennes séries sans langue, finition ou métrique identifiées ne sont plus tracées ; une explication remplace la courbe ambiguë. |
| F05, saisie perdue après refus | Le formulaire attend la confirmation du serveur et conserve la saisie en cas d'erreur. Le même UUID est réutilisé après un délai ambigu. L'état accepté en retour constitue la référence de restauration. |
| F06, prix cachés dans les choix | Le sélecteur montre les références EUR disponibles par finition, avec source et date. Une référence absente d'un simple aperçu ne prétend pas être absente du fournisseur. |
| F07, actualisation depuis le cache | L'action explicite contourne les caches applicatifs et signale un échec au lieu de présenter silencieusement une ancienne réponse comme actualisée. |
| F08, validation générale | Les erreurs sont associées aux champs et le premier champ invalide reçoit le focus. Le prix à deux décimales et la confirmation d'estimation restent obligatoires lorsqu'ils s'appliquent. |
| F09, abandon silencieux | La fermeture, Échap et le retour navigateur protègent la saisie modifiée. Une navigation de plusieurs entrées ne désynchronise pas l'URL et la page rendue. |
| F10, langue de l'URL ignorée | Le paramètre explicite `tcgLang` initialise le formulaire avant la préférence de consultation. |
| F11, données techniques dans le formulaire | Les identifiants de variantes sont remplacés par les sous-éditions et tampons disponibles ; la date fournisseur est localisée et distinguée de celle de l'estimation. |
| F12, formulaire mobile long | Les frais et la date d'achat sont repliables. Les actions restent accessibles dans un pied de formulaire fixe. |
| F13, messages hors contexte | Les résultats vides parlent de cartes ou d'achats ; le singulier des achats non valorisés est corrigé. Les textes existent dans les huit langues. |

Une référence peut servir de base à une estimation manuelle, mais l'utilisateur doit toujours confirmer qu'elle correspond à son exemplaire. Les prix USD, les finitions non identifiées et les éditions particulières ne sont pas substitués à une référence EUR manquante.

La revue a aussi couvert les écritures simultanées, les réponses serveur qui excluent un lot, les délais réseau, les changements de compte et les formulaires ouverts depuis une modale. Une réponse HTTP 200 ne suffit pas à confirmer un achat si le lot exact n'est pas accepté. Le brouillon est retiré lorsque l'identité du compte change pour éviter sa réutilisation par un autre compte.

## Limite de l'historique

Les données historiques existantes ne permettent pas de reconstruire sûrement la langue, la finition ou la métrique de chaque point. Elles sont conservées en base et masquées dans l'interface. Une future collecte identifiée est nécessaire pour rétablir des courbes comparables. Cette correction ne crée ni migration de production ni historique reconstitué. Les prix courants et le registre d'estimations manuelles restent utilisables.

## Vérification

Validation finale : 759 tests réussis dans 143 fichiers ; 12 scénarios navigateur réussis, puis une vérification complémentaire du retour de plusieurs entrées dans le même document ; lint, TypeScript web et core, contrôle SEO des sources et build de production réussis. Le build utilise Next.js 16.4.0 et webpack. Un essai du build avec le vrai TCGdex et un compte simulé a enregistré un lot en français sans erreur JavaScript.

Les journaux et captures après correction sont enregistrés dans le sous-dossier `corrections`. Les tests de compte utilisent des réponses isolées ; ils ne constituent pas une validation d'écriture sur le compte Neon réel. Les requêtes de prix des fixtures sont simulées et les captures de carte grise proviennent de ces fixtures.

La suite navigateur couvre l'ajout et la correction sur ordinateur et mobile, les lots multiples, les valeurs absentes, les filtres, la persistance simulée, les refus de sauvegarde et leur reprise, la panne du détail, l'actualisation réseau, le guidage de validation, les confirmations d'abandon, la langue explicite, l'achat depuis une fiche et le retour dans l'historique du navigateur.

La version de production corrigée est servie localement sur [le port 3002](http://127.0.0.1:3002/fr/tcg/investments).

Aucun push, déploiement ou changement de base distante n'est effectué.
