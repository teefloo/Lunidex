# Préparer la migration Neon → Supabase

Ce runbook décrit une bascule à préparer en plusieurs étapes. À la date du 24 novembre 2026, l'accès en lecture au Neon courant a répondu HTTP 402 (quota) sans fournir de données. Il n'existe donc pas encore d'export frais ni de comparaison réelle source/cible. Le projet Supabase Lunidex `vrovnfsdjfwuuomwsuvj`, créé en plan Free dans `eu-west-3` (Paris), est la future cible de production et peut servir temporairement aux tests hébergés avec des comptes et données synthétiques. Il ne faut pas y servir le trafic de production avant le GO de cutover. Le projet hébergé existant d'une autre application reste réservé et ne doit jamais être utilisé ou modifié. Le staging permanent reste local et dans GitHub Actions; aucun projet de staging hébergé payant n'est prévu.

**État actuel : NO-GO pour le déploiement.** Aucun export final Neon, validation d'import réelle, ni digest de rollback Supabase-compatible n'a été présenté et validé dans ce checkout. Le dépôt ne contient pas de référence rollback à réutiliser; ne pas inventer de digest ni prendre une fixture de test pour une image publiée. Tant qu'une image rollback réelle et son SHA source ne sont pas configurés dans l'environnement GitHub `ovh-production` et validés par le préflight, le workflow doit refuser le déploiement.

Neon et Supabase restent séparés pendant la préparation. Aucune commande de ce runbook ne constitue une autorisation de bascule de trafic ou de modification de production.

## État et périmètre

- L'application utilise Supabase Auth et un pool PostgreSQL `pg` à faible capacité depuis le runtime Node long-running sur OVH. `SUPABASE_DATABASE_URL` est la connexion runtime au pooler partagé en mode session, avec vérification TLS. Le pool est distinct de la connexion utilisée pour les opérations de migration.
- Le schéma comporte 31 tables applicatives dans `app`, `public` et `analytics`, plus les objets associés (fonctions, vues, déclencheurs, index, clés étrangères, séquences). Le snapshot historique se trouve dans `neon/migrations/`; le schéma Supabase actif est sous `supabase/migrations/`.
- Auth conserve les UUID source et l'état de confirmation d'adresse, mais le script actuel n'importe ni hashes de mot de passe, ni sessions, ni identités OAuth liées. Better Auth utilise scrypt par défaut. Supabase Auth documente bcrypt, Firebase scrypt et Argon2 pour `password_hash`; le code GoTrue actuel reconnaît les préfixes `$fbscrypt` et `$argon2`, puis interprète les autres formats comme bcrypt. Le scrypt Better Auth n'est donc pas directement compatible par simple copie, sauf preuve qu'il est explicitement encodé dans un format accepté et vérifié par GoTrue. La configuration Better Auth et le format réel de la source restent inconnus tant que l'accès Neon répond 402. Le chemin sûr préparé est un reset de mot de passe et une nouvelle liaison OAuth. Ne changer ce choix que si une répétition locale/CI sur des comptes synthétiques et un smoke hébergé contre le projet Lunidex confirment le format, le préfixe, les paramètres, l'UUID et le login avec un import dédié et revu. Le nombre actuel de comptes reste inconnu tant qu'un export source n'a pas réussi. Voir les recommandations officielles [Better Auth sur les mots de passe](https://better-auth.com/docs/authentication/email-password), [sa référence de sécurité](https://better-auth.com/docs/reference/security), [la référence Supabase `createUser`](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [les types Supabase Auth](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/types.ts) et [l'implémentation GoTrue](https://github.com/supabase/auth/blob/master/internal/crypto/password.go).
- Free n'est pas déclaré suffisant. Les limites officielles actuellement indiquées incluent 500 MB de base, 50 000 MAU, 5 GB d'egress et 5 GB d'egress mis en cache, 1 GB de stockage fichiers et 500 MB de RAM; les projets Free peuvent être suspendus après sept jours d'inactivité. Relever d'abord taille, croissance, connexions, MAU, trafic, charge, sauvegardes et disponibilité requise, puis comparer au [tarif Supabase](https://supabase.com/pricing) et aux [limites de plateforme](https://supabase.com/docs/guides/platform/going-into-prod). Les seuils et tarifs peuvent évoluer.
- L'application n'utilise pas le Data API pour ses mutations métier. RLS est active sur les 31 tables, les privilèges Data API sont refusés par défaut, et seuls des accès de lecture ciblés sont accordés. Les handlers Next gardent les vérifications de propriété car la connexion serveur `postgres` contourne RLS. Les vues publiques doivent rester `security_invoker` ou strictement non exposées.

### Inventaire opérateur observé

Au 25 novembre 2026, l'organisation Supabase consultée est en plan Free. Le projet Lunidex identifié ci-dessus est créé dans `eu-west-3`; un autre projet actif appartient à une application différente et demeure intact. Le plan Free observé autorise deux projets actifs au total, de sorte qu'aucun troisième projet hébergé ne doit être créé dans ce plan. Le devis Free observé était de 0 €/mois, mais ni le coût ni la capacité ne sont garantis. Avant chaque smoke et avant l'import, vérifier dans le tableau de bord le plan, les quotas et l'usage courant : taille et croissance de la base (limite observée de 500 MB), MAU (50 000), egress et cached egress (5 GB chacun), stockage fichiers (1 GB), RAM (500 MB), connexions, sauvegardes, suspension après inactivité et nombre de projets actifs. Les limites Free ne prouvent pas que le service convient à la charge réelle de Lunidex; relever les métriques Neon et refaire l'estimation avant le GO.

## Prérequis avant tout import

1. Récupérer l'accès source Neon et confirmer qu'une lecture fraîche fonctionne. Créer un rôle source limité à `SELECT`; ne pas utiliser le rôle d'écriture applicatif pour l'export si un rôle lecture peut être provisionné.
2. Confirmer dans le tableau de bord que `vrovnfsdjfwuuomwsuvj` est bien le projet Lunidex attendu, en plan/région/quota approuvés. Il sert de future production et de cible temporaire uniquement pour des tests synthétiques contrôlés. Ne pas créer un projet hébergé supplémentaire et ne pas utiliser le projet réservé à une autre application.
3. Monter localement la configuration Supabase CLI et appliquer les migrations uniquement au Supabase local. Les versions de schéma du projet hébergé Lunidex ont déjà été appliquées par l'opérateur; vérifier l'historique enregistré sans réappliquer le DDL distant. Le smoke hébergé exige ces tables et ne doit précéder aucun import de données source; vérifier auparavant qu'aucune donnée non synthétique n'existe.
4. Garder le staging permanent dans la stack locale et GitHub Actions. La première tentative du smoke hébergé a échoué avant toute écriture, car Node ne faisait pas confiance à la chaîne du pooler (`self-signed certificate in certificate chain`). Après chargement du CA via `NODE_EXTRA_CA_CERTS` et correction de l'encodage de `.env.local`, une tentative complète ultérieure a réussi sur le seul projet Lunidex : deux comptes synthétiques, login par mot de passe, récupération et callback allowlist, contrôles RLS/isolation avec deux JWT, et GET/PUT d'une collection TCG via `/api/user-state`. Le test a aussi confirmé `SELECT 1`, TLS dans `pg_stat_ssl`, la réutilisation d'un même PID de session et un rollback temporaire; l'audit de nettoyage a trouvé zéro ligne synthétique restante. Ce smoke hébergé valide ces parcours synthétiques précis, pas une validation de production complète. Le signup public avec livraison d'e-mail, l'échange PKCE dans un navigateur, OAuth Google/GitHub et la délivrabilité SMTP restent non testés. Ne modifier aucune configuration OAuth ou SMTP de production pour ces tests.
5. Préparer le digest immuable de l'image candidate et un digest rollback Supabase-compatible réellement publié, avec son SHA source; faire vérifier les deux par le préflight du workflow. Une image Neon ou `Dockerfile.rollback-baseline` n'est jamais un rollback après bascule.
6. Exporter, sauvegarder et vérifier le dump privé source avant d'importer. Préparer les secrets dans le gestionnaire protégé de l'environnement; ne jamais les placer dans des arguments, logs, artefacts CI publics ou variables `NEXT_PUBLIC_*`.

## Gate de premier déploiement

Le premier déploiement est **NO-GO** tant qu'une des portes ci-dessous n'est pas satisfaite et consignée avec son résultat. Les valeurs secrètes ne doivent pas apparaître dans le compte rendu.

| Porte | Preuve exigée avant déploiement |
| --- | --- |
| Source | Lecture Neon rétablie, export final frais après gel, nombre de comptes/lignes relevé, dump source sauvegardé et contrôlé |
| Cible | Ref fixe `vrovnfsdjfwuuomwsuvj` confirmé; plan, région, quotas, sauvegardes et limites approuvés; aucun autre projet touché; cible applicative entièrement vide avant l'import |
| Schéma | Migrations locales et pgTAP verts; import synthétique CI vert; `dry-run` sur la cible Lunidex vide; tests synthétiques hébergés nettoyés et zéro résidu vérifié avant l'import définitif |
| Auth | UUID/email-confirmation réconciliés; décision hash/reset signée; deux comptes fictifs passent login/reset/callback dans les tests locaux et le smoke hébergé; signup avec e-mail livré, OAuth browser et SMTP testés séparément avant activation |
| Isolation | Smoke hébergé avec deux JWT : accès croisé refusé, profil public autorisé et champs/tables privés refusés; cas pending-delete couvert par pgTAP; les autres handlers serveur restent à contrôler selon leur périmètre |
| Déploiement | CA racine installé sur l'hôte; variables runtime/Auth testées; candidate et rollback référencés par digests immuables et validés par le workflow isolé; comportement du rollback Supabase compatible exercé; restauration de sauvegarde démontrée |
| Fenêtre | Maintenance, gel des écritures et jobs, contact d'astreinte, observabilité, critères GO/NO-GO, responsable de décision et fenêtre de retour documentés |

Le job CI local synthétique ne remplace ni le `dry-run` de la cible réelle, ni le smoke hébergé avec JWT. La source Neon a répondu 402. Le smoke hébergé synthétique décrit ci-dessus a réussi après la première tentative bloquée par TLS, et son audit de cleanup a confirmé zéro résidu synthétique. Cela ne valide ni un export/import de données Neon réelles, ni l'état vide complet de la cible avant import, ni un cutover.

## Variables d'environnement

Copier les variables dans un `.env.local` ignoré par Git ou les fournir via un gestionnaire de secrets. Ne pas afficher les valeurs.

| Variable | Usage |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publique du projet utilisée par le navigateur et Auth SSR |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable publique, jamais la clé service/secret |
| `SUPABASE_URL` | URL API du projet utilisée par les scripts smoke et migration |
| `SUPABASE_DATABASE_URL` | Pool runtime OVH, pooler partagé session, TLS vérifié |
| `SUPABASE_SECRET_KEY` | Clé Supabase serveur/admin préférée; jamais dans le navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Repli de compatibilité temporaire uniquement si la nouvelle clé n'est pas configurée |
| `NEON_SOURCE_DATABASE_URL` | Accès Neon en lecture seule pour l'export |
| `SUPABASE_MIGRATION_DATABASE_URL` | Connexion directe ou pooler session de la cible explicitement choisie |
| `SUPABASE_PROJECT_REF` | `ref` exact correspondant à l'URL API et à l'URL de base |
| `LUNIDEX_STAGING_APP_URL` | Origine de l'app locale `http://localhost:3000` pour le smoke hébergé |
| `LUNIDEX_STAGING_APP_API_CHECK` | Opt-in facultatif, uniquement après avoir démarré l'app avec ce même projet Supabase |
| `LUNIDEX_MIGRATION_EXPORT_DIR` | Répertoire local privé ignoré par Git, par défaut `.migration/neon-to-supabase` |
| `LUNIDEX_MIGRATION_WRITE_FREEZE` | Valeur sentinelle requise pour les commandes Auth/data après gel effectif des écritures |

Le pool runtime OVH et la connexion de migration sont intentionnellement séparés. Pour un serveur Node long-running sur VPS, utiliser le pooler partagé Supabase en mode session (port 5432) afin de préserver transactions et état de session. `pg` impose TLS avec validation du certificat; ne pas désactiver cette vérification. Téléchargez le certificat CA racine depuis **Database Settings > SSL Configuration**. Pour les tests locaux, enregistrez-le dans `.migration/supabase-ca.crt`; le dossier `.migration/` est ignoré par Git et `.dockerignore` l'exclut également avec les fichiers `*.crt`/`*.pem`. Ce certificat CA n'est pas une clé secrète, mais ne le mettez pas dans le dépôt ni dans l'image.

Pour OVH, installez le même certificat séparément sur l'hôte à `/opt/lunidex-production/supabase-ca.crt`, avec mode `0644` (certificat public, lisible par l'utilisateur `nextjs` du conteneur). Vérifiez-le sans afficher son contenu avec `openssl x509 -in /opt/lunidex-production/supabase-ca.crt -noout`. La livraison GitHub Actions n'envoie jamais ce fichier et le Dockerfile ne le copie pas. `compose.production.yaml` le monte en lecture seule à `/etc/ssl/certs/lunidex-supabase-ca.crt` et fournit `NODE_EXTRA_CA_CERTS` au démarrage du processus Node. Le déploiement et le rollback échouent fermés si le fichier hôte manque, est vide, invalide, symbolique, ou illisible par l'app. Le montage utilise `create_host_path: false` pour éviter de créer un faux répertoire à la place du fichier. Cette configuration conserve la validation TLS; ne pas remplacer `ssl: true` ni `sslmode=verify-full` par une option permissive.

Les scripts Node n'importent pas `.env.local` automatiquement. Pour exécuter un smoke local ou un script d'opération en chargeant ce fichier sans afficher son contenu, utilisez Node 22 `--env-file` (les noms/valeurs restent dans le fichier ignoré) :

```bash
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt LUNIDEX_STAGING_SMOKE=I_CONFIRM_LUNIDEX_STAGING_DATA_MUTATION node --env-file=.env.local scripts/migration/staging-smoke.mjs
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt LUNIDEX_HOSTED_SMOKE_CLEANUP=I_CONFIRM_DELETE_LUNIDEX_SYNTHETIC_SMOKE_USERS node --env-file=.env.local scripts/migration/cleanup-hosted-smoke.mjs
```

Ne passez jamais une clé ou une URL de base en argument shell et ne faites jamais `cat`, `echo` ou `printenv` sur les clés/URLs chargées. Dans CI/production, fournissez-les via le gestionnaire de secrets.

### Préparer le smoke local et les redirections Auth

`.env.local` est ignoré par Git. Renseignez localement les paramètres ci-dessous pour le projet Lunidex; les clés restent vides dans le dépôt et aucun faux exemple de clé n'est fourni. Gardez les sentinelles d'opt-in uniquement dans la commande shell explicite ci-dessus, pas dans `.env.local` :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PROJECT_REF=vrovnfsdjfwuuomwsuvj
SUPABASE_SECRET_KEY=
SUPABASE_DATABASE_URL=
LUNIDEX_STAGING_APP_URL=http://localhost:3000
```

Choisir dans Connect la connexion **Shared Pooler / Session** et le port `5432`. Pour `SUPABASE_DATABASE_URL`, conserver l'URI exacte et utiliser uniquement aucun paramètre de requête ou `sslmode=verify-full`; les deux scripts vérifient la TLS et refusent `sslmode=require` ou les options qui pourraient l'affaiblir. La clé publishable reste publique; `SUPABASE_SECRET_KEY` ne quitte jamais le serveur. Le repli `SUPABASE_SERVICE_ROLE_KEY` reste accepté temporairement, mais ne désactivez pas les clés legacy dans le projet avant d'avoir migré et validé tous les consommateurs.

Pour les essais de redirection OAuth depuis une application locale, dans Authentication > URL Configuration du projet Lunidex, ajoutez uniquement les URLs de redirection exactes utilisées par l'application, par exemple `http://localhost:3000/fr/auth/callback` et, si un parcours anglais est testé, `http://localhost:3000/en/auth/callback`. Si l'app est démarrée sur `127.0.0.1`, ajoutez séparément les mêmes chemins sur cette origine; n'utilisez pas de wildcard. Dans les consoles Google/GitHub de test, le callback fournisseur reste celui de Supabase Auth : `https://vrovnfsdjfwuuomwsuvj.supabase.co/auth/v1/callback`. Ne changez aucun réglage OAuth de production pour un test local.

Le contrôle optionnel de collections via `/api/user-state` exige que `npm run dev` soit déjà lancé avec l'URL et la clé publishable de ce même projet Lunidex. Démarrez-le avec le CA ajouté au magasin de confiance Node : `NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt npm run dev`. Après seulement, relancez le smoke avec ces opt-ins :

```bash
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt LUNIDEX_STAGING_APP_API_CHECK=I_CONFIRM_LUNIDEX_STAGING_APP_IS_READY LUNIDEX_STAGING_SMOKE=I_CONFIRM_LUNIDEX_STAGING_DATA_MUTATION node --env-file=.env.local scripts/migration/staging-smoke.mjs
```

Sans ce prérequis, laissez `LUNIDEX_STAGING_APP_API_CHECK` absent; le smoke n'appellera pas l'API de l'app.

Pour tester les courriels d'Auth, configurez SMTP Resend dans le dashboard avec une clé distincte à portée d'envoi seulement, un expéditeur vérifié et une boîte de test contrôlée; vérifiez le quota Free Resend courant avant les essais. Signup réel, confirmation email, recovery email et OAuth en navigateur exigent une boîte contrôlée et un clic manuel sur le lien reçu. Le smoke fourni ne réalise pas ces tests : il crée des comptes confirmés par l'API admin et vérifie un lien recovery généré sans envoi.

## Commandes locales

Vérifier les commandes supportées par la version locale de la CLI avec `supabase --help` avant usage. Les commandes ci-dessous s'appliquent au Supabase local seulement :

```bash
supabase --version
supabase start
supabase migration up
supabase test db
```

La CLI v3 active une base locale par défaut. Ne pas lancer `supabase db reset` sur une cible distante. Les migrations versionnées sont déjà dans `supabase/migrations/`; une modification de schéma se fait dans un nouveau fichier de migration créé avec `supabase migration new <nom>` après consultation de l'aide. Vérifier la migration avec `supabase migration list` et les guides officiels de [développement local](https://supabase.com/docs/guides/local-development) et de [sécurisation du Data API](https://supabase.com/docs/guides/api/securing-your-api).

## Export source et simulation cible

Les commandes utilisent des variables d'environnement; elles ne prennent pas d'URL ou de secret en argument.

```bash
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs export
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs dry-run
```

`export` ouvre Neon avec une transaction `REPEATABLE READ READ ONLY`, pour que les lignes et les métadonnées de schéma partagent un snapshot cohérent. Il exige exactement les 31 tables attendues, calcule un checksum SHA-256 déterministe par table, inventorie les colonnes et leurs types/defaults, FK, contraintes PK/UNIQUE/CHECK, index, triggers, fonctions/procédures, vues, pgcrypto et séquences avec leurs paramètres, et exporte les identifiants Auth examinés dans des fichiers privés mode `0600`. Le manifeste lie ces inventaires, les lignes et les identités Auth dans un digest source. Les champs de mot de passe et de session ne sont pas exportés. Les données sont stockées localement sous `.migration/neon-to-supabase/`, ignoré par Git. Vérifier manuellement que les fichiers existent et que leur répertoire est protégé; ne jamais les joindre à une issue ou un chat.

Les exports ordinaires servent aux répétitions et ne peuvent pas être importés. La transaction fournit un snapshot cohérent des lignes; elle ne gèle pas les écritures, et les séquences PostgreSQL ne sont pas versionnées dans le snapshot. Pour l'export définitif, arrêter réellement les inscriptions, les écritures applicatives et tous les jobs côté Neon, puis exécuter :

```bash
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs export --final
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs dry-run
```

La sentinelle ne coupe aucun trafic : elle confirme seulement que l'opérateur a effectué le gel. Les commandes d'import refusent un manifeste qui ne porte pas `snapshot_is_final` et `writes_frozen`.

`dry-run` n'écrit pas sur la cible. Il exige une correspondance entre `SUPABASE_PROJECT_REF`, URL Supabase et connexion de migration. Il compare l'inventaire de schéma supporté et les clés étrangères, puis exige une cible vide. Il accepte une cible non vide uniquement si le registre de migration prouve que le même digest source est déjà importé et que ses données passent les vérifications.

Le code d'export attend le layout Better Auth examiné (`neon_auth."user"` et colonnes `id`, `email`, `emailVerified`, `name`). Si le layout réel diffère, l'export s'arrête sans inventer de mappage. Les données Neon source n'ayant pas encore été lues, ce mapping reste à confirmer sur un export frais.

## Fenêtre de migration et import

À réaliser uniquement après répétition locale/CI réussie, smoke hébergé terminé et nettoyé, validation de la cible vide et gel confirmé des inscriptions, écritures utilisateur, jobs planifiés, tâches cron et processus source. Mettre en pause les workers et mettre l'application en mode maintenance si nécessaire. Une simple variable sentinelle ne gèle pas le système; l'opérateur doit effectivement couper les écritures.

```bash
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs import-auth
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs import-data
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs verify
```

`auth` crée les utilisateurs avec leurs UUID source, leurs emails et l'état de confirmation; elle refuse un conflit d'ID/email ou une identité cible supplémentaire. Elle crée les comptes sans mot de passe et n'importe pas de sessions. `data` n'accepte que les 31 tables exactes, le schéma comparé, les Auth IDs complètes et une cible applicative vide. Les lignes sont insérées dans l'ordre des dépendances FK, en lots de 500 lignes maximum et 8 Mio de JSON par requête; les colonnes générées restent exclues et chaque lot utilise `ON CONFLICT DO NOTHING`. L'import se fait dans une transaction protégée par verrou consultatif; il ne supprime ni ne remplace de lignes. Les sommes de contrôle finales vérifient toutes les tables avant validation de la transaction. Le même digest peut être relancé de façon idempotente après vérification; un digest différent sur une cible marquée est refusé.

`verify` compare l'inventaire des tables et colonnes, les FK, contraintes PK/UNIQUE/CHECK, index, triggers, fonctions/procédures, vues, pgcrypto, les quantités et checksums de toutes les lignes, les définitions et états des séquences et les identifiants/emails Auth. L'inventaire compare les définitions exposées par les catalogues PostgreSQL de ces objets; il ne prétend pas prouver les comportements applicatifs ni l'isolation du serveur Next.js. Il n'effectue pas de reset ou de cleanup. Le test SQL `supabase/tests/account-rls.sql` vérifie les lectures avec plusieurs contextes JWT et le cas de compte inactif.

## Validation locale et smoke hébergé

Le job `supabase-local` de CI utilise la CLI officielle épinglée `3.4.0`, démarre PostgreSQL, GoTrue, Kong et PostgREST dans une stack locale éphémère, applique les migrations avec `supabase migration up` et exécute `supabase test db`. La sortie de `supabase start` est supprimée car la CLI peut afficher les clés locales. Ensuite, `scripts/migration/local-e2e-fixture.mjs` crée une base source synthétique séparée sur le PostgreSQL local, applique les dix migrations historiques et y insère un seul UUID/email et un score fictifs. Il exécute les commandes d'export final, dry-run, import Auth, import données et vérification, puis les rejoue pour vérifier l'idempotence. Il n'emploie que des hôtes loopback et refuse les refs/URLs hébergées; son export privé temporaire est supprimé à la fin. Le test des gardes de cible peut tourner hors Docker; l'import synthétique nécessite l'ensemble local Auth/API. La CLI 3 cible sa stack locale par défaut; le workflow n'ajoute aucune option `--remote` et ne lie aucun projet. Il ne lit aucun secret et arrête les conteneurs même si un contrôle échoue. Ce scénario vérifie le code et schéma du dépôt sur une fixture, pas le compte Neon courant, ses volumes ni le comportement hébergé. Sur le poste de préparation, le daemon Docker n'est pas disponible; cette validation doit donc être lue dans le résultat de CI, elle n'a pas été exécutée localement.

Dans `supabase/config.toml`, le `site_url` local est `http://localhost:3000` et les callbacks locaux sont limités aux origines HTTP `localhost:3000` et `127.0.0.1:3000`, avec leurs chemins de développement. Cette allowlist est uniquement pour la stack locale. Dans un projet hébergé, configurer `site_url` et les URL de redirection à la main, avec les domaines et chemins de production exacts; ne pas recopier les wildcards ou origines loopback locales.

L'accès lecture à la source Neon a répondu HTTP 402/quota, sans renvoyer de données ni permettre un export. Le smoke hébergé Lunidex a validé les parcours synthétiques et l'isolation décrits ci-dessus, mais ne valide ni l'export, ni l'import des données réelles, ni une bascule. Le nombre courant de comptes/lignes, l'export frais, la comparaison de toutes les lignes et les handlers non couverts par `/api/user-state` restent à valider. Le cleanup de ce smoke a confirmé zéro ligne synthétique; avant l'import, le `dry-run` doit encore confirmer que la cible entière ne contient aucun autre objet/donnée inattendu. Ne pas créer de comptes réels ni servir de trafic de production durant les essais.

Le smoke hébergé opt-in de `scripts/migration/staging-smoke.mjs` a été exécuté avec succès après chargement du CA et correction de l'encodage de `.env.local`; la première tentative avait échoué au handshake TLS avant toute écriture. Pour le reproduire après un changement de code/configuration, revérifier les quotas Free et charger dans un environnement protégé `SUPABASE_URL`, `SUPABASE_PROJECT_REF=vrovnfsdjfwuuomwsuvj`, la connexion runtime `SUPABASE_DATABASE_URL` du Shared Pooler session, `LUNIDEX_STAGING_APP_URL`, la clé publishable et la clé `SUPABASE_SECRET_KEY` (ou temporairement le repli `SUPABASE_SERVICE_ROLE_KEY`); aucune valeur de secret/URL de base ne doit être ajoutée à Git ou affichée. Le script refuse tout ref différent du ref fixe Lunidex, utilise TLS avec validation du certificat, contrôle `pg_stat_ssl` et réemploi de la session PostgreSQL. L'origine de l'application doit être exactement `http://localhost:3000`, `http://127.0.0.1:3000` ou une origine HTTPS de l'application de test sous `*.lunidex.app` hors des domaines de production; l'API et la base restent celles du projet hébergé Lunidex. Pour l'app locale, ajouter explicitement ses URL callback exactes à l'allowlist Auth hébergée avant l'exécution.

Le smoke crée deux comptes confirmés via l'API admin, avec une adresse aléatoire `lunidex-migration-smoke+<UUID>@lunidex.app` et un tag unique dans `app_metadata`; `createUser` ne déclenche pas l'envoi d'un message. Le dernier run réussi a vérifié le login par mot de passe, génération et vérification d'un lien recovery (sans envoi SMTP), callback allowlist, accès croisé Data API refusé, profil public lisible et refus anon pour email, `api_keys` et analytics. L'option `LUNIDEX_STAGING_APP_API_CHECK=I_CONFIRM_LUNIDEX_STAGING_APP_IS_READY` a été activée pour vérifier GET/PUT d'une collection TCG via `/api/user-state` avec deux comptes et l'absence de modification de l'état du second compte. La connexion PostgreSQL runtime a aussi réussi `SELECT 1`, `pg_stat_ssl` a confirmé TLS, et les requêtes ont réutilisé la même session; le contrôle de rollback temporaire et l'audit de cleanup ont réussi, avec zéro ligne synthétique restante. Le smoke ne valide ni le signup public/email de confirmation livré, ni la délivrabilité SMTP, ni l'échange PKCE dans le navigateur, ni OAuth Google/GitHub réel; ces parcours restent des lacunes et ne doivent pas être activés en modifiant la configuration OAuth/SMTP de production.

Après un smoke interrompu ou terminé, exécuter le nettoyage récupérable dans un environnement protégé avec les mêmes coordonnées de projet et `LUNIDEX_HOSTED_SMOKE_CLEANUP=I_CONFIRM_DELETE_LUNIDEX_SYNTHETIC_SMOKE_USERS` :

```bash
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt LUNIDEX_HOSTED_SMOKE_CLEANUP=I_CONFIRM_DELETE_LUNIDEX_SYNTHETIC_SMOKE_USERS node --env-file=.env.local scripts/migration/cleanup-hosted-smoke.mjs
```

Ce script est strictement verrouillé au ref Lunidex ci-dessus et exige la sentinelle explicite. Il ne cible que des UUID Auth dont l'adresse suit le motif réservé `lunidex-migration-smoke+<UUID>@lunidex.app` et dont `app_metadata` porte le tag synthétique; les projections orphelines ne sont récupérées qu'avec cette adresse réservée et le même tag en profil/état. Il supprime leurs lignes `app.users` (les clés étrangères ne peuvent cascader que depuis ces UUID synthétiques), puis les comptes Auth, et vérifie leur absence dans `auth.users`, `app.users`, `profiles` et `user_state`. Les comptes non marqués ou les refs différentes bloquent l'opération. Il ne réinitialise pas la base. En cas d'erreur ou de résidu, arrêter et examiner manuellement; ne pas importer.

Avant l'import définitif, lancer le cleanup jusqu'à résultat zéro résidu, puis exécuter le `dry-run` du migrateur contre ce même projet avec l'export final. Le cleanup confirme uniquement l'absence des comptes/projections synthétiques marqués; le `dry-run` doit aussi confirmer l'absence de comptes Auth non attendus et l'état vide de toutes les tables applicatives. Toute ligne, identité, séquence ou objet inattendu est NO-GO et ne doit pas être « nettoyé » par un reset.

## Bascule, santé et rollback

### Préflight candidate et rollback

Le déploiement utilise `.github/workflows/deploy-ovh-production.yml`. Lancer d'abord `workflow_dispatch` depuis `master`, avec le SHA complet choisi, `confirmation=DEPLOY_OVH_PRODUCTION` et `deployment_mode=preflight`. Le préflight ne se connecte pas à OVH. Si `candidate_image_digest` est vide, il construit **et publie** l'image candidate sur GHCR; si un digest déjà publié et approuvé est fourni, il le réutilise sans build/publication. Le préflight télécharge ensuite le rollback configuré et la candidate par digest et exécute `scripts/deployment/validate-image-isolated.sh` sur chacun : SHA source, digest, `linux/amd64`, label `com.lunidex.backend=supabase`, utilisateur `nextjs`, commande `node server.js`, contrat Compose (limites et CA read-only) et `/api/healthz` dans un conteneur sans réseau et sans secret runtime. Le préflight est une écriture GHCR quand il construit; aucune image n'a été publiée dans cette préparation.

Les variables protégées `SUPABASE_ROLLBACK_IMAGE_REF` et `SUPABASE_ROLLBACK_IMAGE_REVISION` doivent désigner un digest GHCR réel et son SHA source complet. L'image rollback doit provenir d'un commit dont le runtime utilise Supabase et doit être compatible avec le schéma conservé sur la cible. Le label ou le healthcheck hors réseau ne prouve pas, à lui seul, le fonctionnement de l'Auth et de PostgreSQL; documenter aussi la preuve fonctionnelle de cette version sur le schéma Supabase. Sur la première bascule, l'image Neon encore en place n'est pas une candidate de rollback.

**NO-GO actuel :** aucun digest de rollback Supabase-compatible n'est consigné ou validé dans ce checkout, et aucun digest réel ne doit être déduit des fixtures de tests. N'utiliser ni `Dockerfile.rollback-baseline`, ni un ancien digest Neon, ni un digest inventé. Le workflow doit refuser le deploy si le rollback ou sa révision manquent ou si la validation isolée échoue. Il faut fournir une référence GHCR publiée et autorisée, valider son SHA, obtenir le préflight vert pour candidate et rollback, et examiner les résultats avant tout mode `deploy`.

Après préflight réussi et autorisation de bascule, conserver la référence candidate et son digest dans le compte rendu. Le `workflow_dispatch` de déploiement reprend le même SHA et transmet ce digest dans `candidate_image_digest`, avec `deployment_mode=deploy` et la confirmation exacte. Il revalide le rollback et la candidate, prépare les variables runtime, vérifie le CA sur l'hôte avant d'arrêter la préproduction, puis déploie le digest immuable. Ne pas activer le mode automatique de production comme raccourci.

| Exécution Actions | `production_commit` | `candidate_image_digest` | `deployment_mode` | `confirmation` |
| --- | --- | --- | --- | --- |
| Préflight | SHA master complet | vide pour build/publish approuvé, ou digest candidat GHCR déjà publié | `preflight` | `DEPLOY_OVH_PRODUCTION` |
| Cutover après GO | même SHA master | digest retourné par le préflight vert | `deploy` | `DEPLOY_OVH_PRODUCTION` |

Un mode `preflight` sans digest candidat publie donc une image GHCR; laisser l'entrée vide seulement après l'autorisation séparée de cette publication. Le mode `deploy` réutilise le digest validé et n'en fabrique pas un nouveau.

### Cutover définitif

Ne commencer qu'après GO écrit sur les portes Source, Cible, Schéma, Auth, Isolation, Déploiement et Fenêtre. Avant le gel, le CA doit être préinstallé sur l'hôte OVH et validé par `require-supabase-ca.sh`; le mode `deploy` le vérifiera avant l'arrêt de la préproduction. Les migrations Supabase versionnées sont déjà appliquées sur le projet Lunidex; vérifier leur historique exact et ne pas réappliquer du DDL distant dans cette procédure.

1. Terminer les tests synthétiques hébergés et exécuter le cleanup avec la commande de la section précédente. Vérifier qu'il annonce zéro compte/projection synthétique restant; ne pas importer avant le gel et l'export définitif.
2. Placer Lunidex en maintenance. Arrêter réellement signup, modifications de compte/Auth, mutations API, cron, tâches planifiées et workers qui écrivent sur Neon; drainer les files et établir une lecture seule effective de la source. `I_HAVE_FROZEN_WRITES` ne fait que confirmer le gel, il ne l'active pas.
3. Créer le snapshot final Neon après le gel, puis vérifier et sauvegarder son manifeste et son export privé local. Lancer ensuite le `dry-run` final : il doit prouver le schéma attendu, l'absence d'identités Auth inattendues et des tables applicatives vides. Tout résidu est NO-GO; ne jamais vider la cible par reset. Les commandes Node ci-dessous chargent `.env.local` sans afficher les valeurs; `NODE_EXTRA_CA_CERTS` est défini avant le démarrage Node pour que la connexion au pooler Supabase vérifie sa chaîne :

   ```bash
   LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs export --final
   NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs dry-run
   ```

4. Si le dry-run passe et que la cible/ref sont reconfirmés, importer Auth, puis les données, puis vérifier les checksums et le schéma :

   ```bash
   LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs import-auth
   LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs import-data
   NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt node --env-file=.env.local scripts/migration/neon-to-supabase.mjs verify
   ```

   Ces imports sont non destructifs, exigent le snapshot final et une cible vide, préservent les UUID et n'importent pas les mots de passe. Toute erreur, différence de compte, FK, séquence, ligne ou checksum est NO-GO : garder l'application en maintenance et analyser sans reset.
5. Déployer uniquement le digest candidat prévalidé en mode `deploy` avec le rollback configuré. Tester distinctement Supabase Auth, le pool PostgreSQL runtime (TLS vérifié), le parcours de connexion/reset, `/api/healthz`, les routes API et l'ownership avec deux utilisateurs. `/api/healthz` confirme le processus Node seulement. `check-supabase-auth.sh` confirme la reachability anonyme d'Auth seulement; aucun de ces deux probes ne valide une session ou RLS.
6. Si les contrôles passent, autoriser le trafic et les jobs d'écriture sur Supabase, puis surveiller Auth, erreurs, latence, pool, quotas, egress, sauvegarde et compteurs d'écriture. Ne jamais réactiver les writers Neon après l'autorisation.

### Rollback et limites

Avant ou après la première écriture Supabase, un rollback d'application sélectionne uniquement un digest Supabase-compatible prévalidé; la base Supabase reste en place. En cas d'échec pendant le déploiement, le script essaie le dernier digest sain Supabase puis le rollback explicite. Après un échec de santé publique, le workflow utilise `rollback-production.sh --last-stable`. Pour un rollback manuel explicitement autorisé :

```bash
bash /opt/lunidex-production/scripts/deployment/rollback-production.sh --last-stable
```

Le script revalide le CA, le digest et le label Supabase, puis la santé applicative. Le retour d'image ne restaure ni n'annule les données. La « première écriture » inclut compte/session/refresh Auth, reset mot de passe, liaison OAuth, suppression de compte, mutation applicative et cron/worker. Après cette première écriture, ne pas revenir à Neon; il faudrait une réplication inverse séparée, implémentée, testée et approuvée. Même avant cette première écriture, ne considérer un retour vers Neon qu'après un gel total et une comparaison explicitement approuvée des identités, lignes et checksums. Aucun changement d'image ou d'URL ne réconcilie ces états.

Si aucun digest Supabase-compatible ne passe le préflight, si le CA manque ou si l'import est incertain, garder la maintenance active et ne pas basculer. En panne après cutover, garder Supabase comme source de vérité et réparer avec un digest compatible; une image Neon de secours ou un rollback de données aveugle est interdit.

Les tests synthétiques sont supprimés avant import définitif par le cleanup à sentinelle de la section précédente; puis `dry-run` doit confirmer zéro résidu avant l'import. En cas de smoke interrompu avant ce point, exécuter le cleanup récupérable et contrôler les tables. Il ne supprime que les comptes Lunidex tagués et leurs projections synthétiques. Toute donnée non synthétique signifie NO-GO et exige une décision opérateur séparée.

Les limites de connexion et les options runtime doivent rester alignées sur la documentation Supabase actuelle du [pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) et les règles d'[Auth migration](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth-migration). Toute opération hébergée, bascule ou modification de secrets exige une revue et une fenêtre distinctes.
