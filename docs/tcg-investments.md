# Investissements en cartes

La route privée `/[locale]/tcg/investments` appartient à l'espace Collection. Elle enregistre des lots d'acquisition indépendants. Un deuxième achat de la même carte crée un nouveau lot. Modifier un lot corrige son achat et sa dernière estimation, sans conserver un journal de ces corrections.

## Données et accès

Les achats sont des petits enregistrements `tcgInvestments` du store web et du document JSON existant `public.user_state.data`. Ils ne contiennent aucun objet de réponse TCGdex. Les dates d'acquisition et de valorisation peuvent rester inconnues. La langue de la carte est indépendante de la langue de l'interface.

Le runtime actuel des collections est connecté au compte : les préférences utilisent IndexedDB, mais les données personnelles viennent du compte Neon. Les investissements suivent ce comportement existant. Ils ne sont pas enregistrés dans un second stockage anonyme. Sans session ou avec le service indisponible, les panneaux d'accès existants s'affichent. Les données sont retirées de la session au changement de compte ou à la déconnexion.

`/api/user-state` détermine le propriétaire à partir de la session, filtre ses lectures et écritures par `user_id`, interdit le cache public et valide les lots. La synchronisation fusionne les achats par UUID et conserve les horloges de modification/suppression. Une écriture refusée reprend le dernier état accepté. Les sauvegardes JSON existantes incluent aussi ce champ.

Aucune migration SQL n'est nécessaire : le champ est ajouté au document JSON déjà utilisé. Aucune base distante n'a été modifiée. Pour mettre cette version en service, le validateur serveur et le client doivent être livrés ensemble. Une ancienne version cliente ne sait pas afficher ou exporter les achats, même si la synchronisation préserve les champs inconnus.

## Calculs

Tous les montants sont des entiers en centimes d'euro. Le prix d'achat et l'estimation sont unitaires. Les frais portent sur le lot entier.

- Investi = quantité × prix d'achat + frais.
- Valeur = quantité × estimation manuelle.
- Plus-value latente = valeur − investi.
- Rendement = plus-value / investi × 100. Un investissement nul n'a pas de rendement défini.

Une estimation absente reste `null`, distincte d'une estimation explicite à zéro. Le portefeuille affiche le total investi, la somme des valeurs connues et le rendement des seuls achats valorisés, avec le capital et les quantités exclus. Les indicateurs décrivent tout le portefeuille ; recherche et filtres concernent la liste.

## Valorisation et limites vérifiées

Le catalogue et les détails utilisent l'API TCGdex existante. Le détail exige la langue demandée sans repli anglais. Les variantes proposées viennent du détail de carte ; une édition particulière peut être décrite avec la finition « Autre ». Les exemplaires certifiés exigent des précisions sur la certification.

Le formulaire réutilise le résolveur de prix existant pour afficher une **référence Cardmarket en EUR**, datée si le fournisseur la date. Il ne convertit pas les prix USD et ne remplace pas une reverse par une holo. Les références ne sont jamais ajoutées aux calculs. Elles ne sont pas proposées pour une édition spéciale décrite dans le formulaire. Le bouton actualise la requête via les caches existants, ce qui ne garantit pas une nouvelle cotation du fournisseur.

Les prix TCGdex ne certifient pas la langue, l'état physique ou la certification d'un exemplaire. La [FAQ officielle TCGdex](https://tcgdex.dev/fr/faq) documente aussi des correspondances de prix incorrectes entre certaines éditions. Aucun prix automatique n'est donc présenté comme la valeur exacte de l'achat. L'utilisateur saisit une estimation manuelle et confirme qu'elle correspond à son exemplaire. Il peut la modifier ou la retirer. Le libellé « Estimation manuelle » et sa date restent visibles.

L'inventaire est relié par carte, extension, langue et finition standard. Le nombre affiché est le nombre de cette finition dans la collection, pas une allocation de copies à un achat. Les éditions spéciales n'ont pas de correspondance automatique. Enregistrer ou supprimer un investissement ne modifie jamais les quantités possédées. Il n'y a ni historique fictif de marché ni courbe reconstituée. La limite est de 1 000 achats et le plafond existant de document de compte reste de 2 Mo.

## Vérification locale

Les tests de domaine couvrent frais, quantités, achats multiples, rendements partiels, données invalides et valeurs manquantes. Les tests du store couvrent l'accès, les sauvegardes, les conflits et suppressions. Les scénarios navigateur utilisent des réponses de compte et de catalogue simulées :

```sh
E2E_INVESTMENTS=1 npx playwright test e2e/tcg-investments.spec.ts
```

Cette commande démarre un serveur de test sur le port 3001 avec une authentification de fixture, dans `.next/investments-e2e`. Elle ne doit pas utiliser une base distante. Les captures se trouvent dans `/tmp/lunidex-investments-desktop.png` et `/tmp/lunidex-investments-mobile.png`. Ces tests ne constituent pas une validation d'une cotation réelle ou d'une base Neon distante.

Vérifications effectuées le 19 octobre 2026 :

- `npm test` : 718 tests réussis dans 139 fichiers.
- Scénarios navigateur investissements : 5 réussis, puis nouvelle vérification des deux parcours principaux après les derniers ajustements.
- Parcours existants de création de collection, ajout et rechargement : réussis sur ordinateur et mobile.
- Lint, contrôles TypeScript web et core, contrôle SEO et build de production : réussis. Le build conserve `--webpack` et la route privée `/tcg/investments`.
- Revue indépendante : aucune correction restante signalée après les ajustements du formulaire et du lien vers l'inventaire.
