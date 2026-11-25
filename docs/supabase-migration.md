# Préparer la migration Neon → Supabase

Ce runbook décrit une bascule à préparer en plusieurs étapes. À la date du 24 novembre 2026, l'accès en lecture au Neon courant a répondu HTTP 402 (quota) sans fournir de données. Il n'existe donc pas encore d'export frais ni de comparaison réelle source/cible. Le projet Supabase Lunidex `vrovnfsdjfwuuomwsuvj`, créé en plan Free dans `eu-west-3` (Paris), est la future cible de production et peut servir temporairement aux tests hébergés avec des comptes et données synthétiques. Il ne faut pas y servir le trafic de production avant le GO de cutover. Le projet hébergé existant d'une autre application reste réservé et ne doit jamais être utilisé ou modifié. Le staging permanent reste local et dans GitHub Actions; aucun projet de staging hébergé payant n'est prévu.

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
3. Monter localement la configuration Supabase CLI et appliquer les migrations uniquement au Supabase local. Revoir les migrations et les résultats de tests avant de déployer les migrations de schéma au projet hébergé par une procédure opérateur distincte et explicitement autorisée. Le smoke hébergé exige ces tables, mais ne doit précéder aucun import de données source; vérifier auparavant qu'aucune donnée non synthétique n'existe.
4. Garder le staging permanent dans la stack locale et GitHub Actions. Après avoir vérifié les quotas, utiliser le smoke hébergé opt-in sur le seul projet Lunidex pour tester deux utilisateurs synthétiques, deux JWT, RLS, reset/callback et, si l'application locale est configurée sur ce projet, `/api/user-state`. Le smoke hébergé n'est pas une validation de production complète. Le signup public, l'échange PKCE dans un navigateur, OAuth Google/GitHub et la délivrabilité SMTP restent des lacunes tant qu'ils ne sont pas testés avec des identifiants OAuth de test et des boîtes contrôlées. Ne modifier aucune configuration OAuth ou SMTP de production pour ces tests.
5. Préparer un digest immuable de l'image courante et au moins un digest d'image de rollback explicitement compatible avec Supabase, puis valider ces images dans la stack locale/CI et le smoke hébergé synthétique si nécessaire. L'ancien digest Neon n'est pas une option de rollback après la bascule.
6. Exporter, sauvegarder et vérifier le dump privé source avant d'importer. Préparer les secrets dans le gestionnaire protégé de l'environnement; ne jamais les placer dans des arguments, logs, artefacts CI publics ou variables `NEXT_PUBLIC_*`.

## Gate de premier déploiement

Le premier déploiement est **NO-GO** tant qu'une des portes ci-dessous n'est pas satisfaite et consignée avec son résultat. Les valeurs secrètes ne doivent pas apparaître dans le compte rendu.

| Porte | Preuve exigée avant déploiement |
| --- | --- |
| Source | Lecture Neon rétablie, export final frais après gel, nombre de comptes/lignes relevé, dump source sauvegardé et contrôlé |
| Cible | Ref fixe `vrovnfsdjfwuuomwsuvj` confirmé; plan, région, quotas, sauvegardes et limites approuvés; aucun autre projet touché; cible applicative entièrement vide avant l'import |
| Schéma | Migrations locales et pgTAP verts; import synthétique CI vert; `dry-run` sur la cible Lunidex vide; tests synthétiques hébergés nettoyés et zéro résidu vérifié avant l'import définitif |
| Auth | UUID/email-confirmation réconciliés; décision hash/reset signée; deux comptes fictifs passent login/reset/callback dans les tests locaux et le smoke hébergé; OAuth/SMTP testés séparément si activés |
| Isolation | Tests Data API/RLS avec deux JWT hébergés, y compris accès croisé refusé, compte pending-delete et vues publiques; handlers serveur contrôlés séparément |
| Déploiement | Variables runtime et Auth testées; digest de release épinglé; digest de rollback Supabase-compatible déjà construit et éprouvé; restauration de sauvegarde démontrée |
| Fenêtre | Maintenance, gel des écritures et jobs, contact d'astreinte, observabilité, critères GO/NO-GO, responsable de décision et fenêtre de retour documentés |

Le job CI local synthétique ne remplace ni le `dry-run` de la cible réelle, ni les tests synthétiques hébergés, ni un contrôle d'isolation avec JWT hébergés. La source Neon a répondu 402; aucun export ni test hébergé n'est considéré validé tant qu'il n'a pas été exécuté et consigné.

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

Le pool runtime OVH et la connexion de migration sont intentionnellement séparés. Pour un serveur Node long-running sur VPS, utiliser le pooler partagé Supabase en mode session (port 5432) afin de préserver transactions et état de session. `pg` impose TLS avec validation du certificat; ne pas désactiver cette vérification. Pour les tests locaux sur le pooler Supabase, téléchargez le certificat CA racine depuis **Database Settings > SSL Configuration** et enregistrez-le dans `.migration/supabase-ca.crt`. Le dossier `.migration/` est ignoré par Git; le certificat CA n'est pas une clé secrète, mais gardez ce fichier local. Démarrez chaque processus Node de test local avec `NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt` afin que Node fasse confiance à cette chaîne tout en vérifiant toujours le certificat du serveur.

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
npm run db:migrate:supabase:export
npm run db:migrate:supabase:dry-run
```

`export` ouvre Neon avec une transaction `REPEATABLE READ READ ONLY`, pour que les lignes et les métadonnées de schéma partagent un snapshot cohérent. Il exige exactement les 31 tables attendues, calcule un checksum SHA-256 déterministe par table, inventorie les colonnes et leurs types/defaults, FK, contraintes PK/UNIQUE/CHECK, index, triggers, fonctions/procédures, vues, pgcrypto et séquences avec leurs paramètres, et exporte les identifiants Auth examinés dans des fichiers privés mode `0600`. Le manifeste lie ces inventaires, les lignes et les identités Auth dans un digest source. Les champs de mot de passe et de session ne sont pas exportés. Les données sont stockées localement sous `.migration/neon-to-supabase/`, ignoré par Git. Vérifier manuellement que les fichiers existent et que leur répertoire est protégé; ne jamais les joindre à une issue ou un chat.

Les exports ordinaires servent aux répétitions et ne peuvent pas être importés. La transaction fournit un snapshot cohérent des lignes; elle ne gèle pas les écritures, et les séquences PostgreSQL ne sont pas versionnées dans le snapshot. Pour l'export définitif, arrêter réellement les inscriptions, les écritures applicatives et tous les jobs côté Neon, puis exécuter :

```bash
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES npm run db:migrate:supabase:export -- --final
npm run db:migrate:supabase:dry-run
```

La sentinelle ne coupe aucun trafic : elle confirme seulement que l'opérateur a effectué le gel. Les commandes d'import refusent un manifeste qui ne porte pas `snapshot_is_final` et `writes_frozen`.

`dry-run` n'écrit pas sur la cible. Il exige une correspondance entre `SUPABASE_PROJECT_REF`, URL Supabase et connexion de migration. Il compare l'inventaire de schéma supporté et les clés étrangères, puis exige une cible vide. Il accepte une cible non vide uniquement si le registre de migration prouve que le même digest source est déjà importé et que ses données passent les vérifications.

Le code d'export attend le layout Better Auth examiné (`neon_auth."user"` et colonnes `id`, `email`, `emailVerified`, `name`). Si le layout réel diffère, l'export s'arrête sans inventer de mappage. Les données Neon source n'ayant pas encore été lues, ce mapping reste à confirmer sur un export frais.

## Fenêtre de migration et import

À réaliser uniquement après répétition locale/CI réussie, smoke hébergé terminé et nettoyé, validation de la cible vide et gel confirmé des inscriptions, écritures utilisateur, jobs planifiés, tâches cron et processus source. Mettre en pause les workers et mettre l'application en mode maintenance si nécessaire. Une simple variable sentinelle ne gèle pas le système; l'opérateur doit effectivement couper les écritures.

```bash
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES npm run db:migrate:supabase:auth
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES npm run db:migrate:supabase:data
npm run db:migrate:supabase:verify
```

`auth` crée les utilisateurs avec leurs UUID source, leurs emails et l'état de confirmation; elle refuse un conflit d'ID/email ou une identité cible supplémentaire. Elle crée les comptes sans mot de passe et n'importe pas de sessions. `data` n'accepte que les 31 tables exactes, le schéma comparé, les Auth IDs complètes et une cible applicative vide. Les lignes sont insérées dans l'ordre des dépendances FK, en lots de 500 lignes maximum et 8 Mio de JSON par requête; les colonnes générées restent exclues et chaque lot utilise `ON CONFLICT DO NOTHING`. L'import se fait dans une transaction protégée par verrou consultatif; il ne supprime ni ne remplace de lignes. Les sommes de contrôle finales vérifient toutes les tables avant validation de la transaction. Le même digest peut être relancé de façon idempotente après vérification; un digest différent sur une cible marquée est refusé.

`verify` compare l'inventaire des tables et colonnes, les FK, contraintes PK/UNIQUE/CHECK, index, triggers, fonctions/procédures, vues, pgcrypto, les quantités et checksums de toutes les lignes, les définitions et états des séquences et les identifiants/emails Auth. L'inventaire compare les définitions exposées par les catalogues PostgreSQL de ces objets; il ne prétend pas prouver les comportements applicatifs ni l'isolation du serveur Next.js. Il n'effectue pas de reset ou de cleanup. Le test SQL `supabase/tests/account-rls.sql` vérifie les lectures avec plusieurs contextes JWT et le cas de compte inactif.

## Validation locale et smoke hébergé

Le job `supabase-local` de CI utilise la CLI officielle épinglée `3.4.0`, démarre PostgreSQL, GoTrue, Kong et PostgREST dans une stack locale éphémère, applique les migrations avec `supabase migration up` et exécute `supabase test db`. La sortie de `supabase start` est supprimée car la CLI peut afficher les clés locales. Ensuite, `scripts/migration/local-e2e-fixture.mjs` crée une base source synthétique séparée sur le PostgreSQL local, applique les dix migrations historiques et y insère un seul UUID/email et un score fictifs. Il exécute les commandes d'export final, dry-run, import Auth, import données et vérification, puis les rejoue pour vérifier l'idempotence. Il n'emploie que des hôtes loopback et refuse les refs/URLs hébergées; son export privé temporaire est supprimé à la fin. Le test des gardes de cible peut tourner hors Docker; l'import synthétique nécessite l'ensemble local Auth/API. La CLI 3 cible sa stack locale par défaut; le workflow n'ajoute aucune option `--remote` et ne lie aucun projet. Il ne lit aucun secret et arrête les conteneurs même si un contrôle échoue. Ce scénario vérifie le code et schéma du dépôt sur une fixture, pas le compte Neon courant, ses volumes ni le comportement hébergé. Sur le poste de préparation, le daemon Docker n'est pas disponible; cette validation doit donc être lue dans le résultat de CI, elle n'a pas été exécutée localement.

Dans `supabase/config.toml`, le `site_url` local est `http://localhost:3000` et les callbacks locaux sont limités aux origines HTTP `localhost:3000` et `127.0.0.1:3000`, avec leurs chemins de développement. Cette allowlist est uniquement pour la stack locale. Dans un projet hébergé, configurer `site_url` et les URL de redirection à la main, avec les domaines et chemins de production exacts; ne pas recopier les wildcards ou origines loopback locales.

L'accès lecture à la source Neon a répondu HTTP 402/quota, sans renvoyer de données ni permettre un export. Le projet hébergé Lunidex est disponible comme cible temporaire de smoke synthétique, mais cela ne valide ni l'export, ni l'import des données réelles, ni une bascule. Le nombre courant de comptes/lignes, l'export frais, la comparaison de toutes les lignes et l'isolation des handlers restent à valider. Ne pas créer de comptes réels ni servir de trafic de production durant les essais.

Le smoke hébergé opt-in de `scripts/migration/staging-smoke.mjs` n'a pas été exécuté. Avant utilisation, revérifier les quotas Free et charger dans un environnement protégé `SUPABASE_URL`, `SUPABASE_PROJECT_REF=vrovnfsdjfwuuomwsuvj`, la connexion runtime `SUPABASE_DATABASE_URL` du Shared Pooler session, `LUNIDEX_STAGING_APP_URL`, la clé publishable et la clé `SUPABASE_SECRET_KEY` (ou temporairement le repli `SUPABASE_SERVICE_ROLE_KEY`); aucune valeur de secret/URL de base ne doit être ajoutée à Git ou affichée. Le script refuse tout ref différent du ref fixe Lunidex, utilise TLS avec validation du certificat, contrôle `pg_stat_ssl` et réemploi de la session PostgreSQL. L'origine de l'application doit être exactement `http://localhost:3000`, `http://127.0.0.1:3000` ou une origine HTTPS de l'application de test sous `*.lunidex.app` hors des domaines de production; l'API et la base restent celles du projet hébergé Lunidex. Pour l'app locale, ajouter explicitement ses URL callback exactes à l'allowlist Auth hébergée avant l'exécution.

Le smoke crée deux comptes confirmés via l'API admin, avec une adresse aléatoire `lunidex-migration-smoke+<UUID>@lunidex.app` et un tag unique dans `app_metadata`; `createUser` ne déclenche pas l'envoi d'un message. Il teste login, génération et vérification locale d'un lien de recovery (sans envoi SMTP), contrôle l'URL callback, l'accès croisé Data API, le profil public et les refus anon pour email, api_keys et analytics. L'option `LUNIDEX_STAGING_APP_API_CHECK=I_CONFIRM_LUNIDEX_STAGING_APP_IS_READY` ajoute le test GET/PUT d'une collection TCG via `/api/user-state` si l'application locale ou de test utilise le même projet hébergé. Le smoke ne valide ni le signup public/email de confirmation, ni la livraison SMTP, ni l'échange PKCE dans le navigateur, ni OAuth Google/GitHub réel; ces parcours restent des lacunes et ne doivent pas être activés en modifiant la configuration OAuth/SMTP de production.

Après un smoke interrompu ou terminé, exécuter le nettoyage récupérable dans un environnement protégé avec les mêmes coordonnées de projet et `LUNIDEX_HOSTED_SMOKE_CLEANUP=I_CONFIRM_DELETE_LUNIDEX_SYNTHETIC_SMOKE_USERS` :

```bash
NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt LUNIDEX_HOSTED_SMOKE_CLEANUP=I_CONFIRM_DELETE_LUNIDEX_SYNTHETIC_SMOKE_USERS node --env-file=.env.local scripts/migration/cleanup-hosted-smoke.mjs
```

Ce script est strictement verrouillé au ref Lunidex ci-dessus et exige la sentinelle explicite. Il ne cible que des UUID Auth dont l'adresse suit le motif réservé `lunidex-migration-smoke+<UUID>@lunidex.app` et dont `app_metadata` porte le tag synthétique; les projections orphelines ne sont récupérées qu'avec cette adresse réservée et le même tag en profil/état. Il supprime leurs lignes `app.users` (les clés étrangères ne peuvent cascader que depuis ces UUID synthétiques), puis les comptes Auth, et vérifie leur absence dans `auth.users`, `app.users`, `profiles` et `user_state`. Les comptes non marqués ou les refs différentes bloquent l'opération. Il ne réinitialise pas la base. En cas d'erreur ou de résidu, arrêter et examiner manuellement; ne pas importer.

Avant l'import définitif, lancer le cleanup jusqu'à résultat zéro résidu, puis exécuter le `dry-run` du migrateur contre ce même projet avec l'export final. Le cleanup confirme uniquement l'absence des comptes/projections synthétiques marqués; le `dry-run` doit aussi confirmer l'absence de comptes Auth non attendus et l'état vide de toutes les tables applicatives. Toute ligne, identité, séquence ou objet inattendu est NO-GO et ne doit pas être « nettoyé » par un reset.

## Bascule, santé et rollback

### Ordre de bascule et portes de cutover

Le premier déploiement est bloqué tant que les gates Source, Cible, Schéma, Auth, Isolation, Déploiement et Fenêtre du tableau « Gate de premier déploiement » ne sont pas toutes documentées comme réussies. En particulier, aucun test hébergé ni export réel n'est actuellement validé. Avant la fenêtre, valider l'email de confirmation, signup, Google/GitHub OAuth si configurés, logout, reset avec callback PKCE, mise à jour de mot de passe, suppression de compte, synchronisation et ownership des routes API dans un environnement de test autorisé. Relever des métriques source récentes et vérifier les événements d'Auth ainsi que la restauration de backup.

Procéder dans cet ordre, avec un GO explicite entre chaque phase :

1. Après avoir terminé les tests synthétiques hébergés, exécuté le cleanup et vérifié zéro résidu, geler réellement les inscriptions, les nouvelles sessions si elles écrivent dans Auth, les mutations API, les workers, cron et autres jobs côté Neon; placer Lunidex en maintenance et vérifier les files vides. La sentinelle de migration ne fait pas ce gel.
2. Maintenir Neon en lecture seule et immuable pendant toute la bascule. Produire l'export `--final`, le protéger, vérifier les quantités et faire `dry-run` contre le projet Lunidex dont le ref fixe a été confirmé indépendamment. Tout objet inattendu ou toute table déjà non vide signifie NO-GO; ne pas vider la cible pour contourner le garde-fou.
3. Importer Auth, puis les données. Exécuter `verify`; archiver localement le digest, les comptes et les résultats de comparaison sans publier les identifiants ni données. Confirmer que la cible est exactement celle de production dédiée, jamais le projet hébergé d'une autre application.
4. Déployer sur OVH le digest immuable de l'application Supabase-compatible, trafic toujours en maintenance. Tester séparément Auth, connexion PostgreSQL runtime, `/api/healthz`, API et isolation. Effectuer au plus une écriture contrôlée avec un compte fictif.
5. Si toutes les sondes réussissent, autoriser le trafic et les jobs sur Supabase. Continuer d'observer Auth, latence, pool, quotas, egress et compteurs d'écriture; ne jamais réactiver les jobs Neon.

Le health check `/api/healthz` vérifie le processus Node uniquement. `scripts/deployment/check-supabase-auth.sh https://<project-ref>.supabase.co` vérifie seulement la joignabilité du endpoint Auth; cela ne prouve pas une session utilisateur, une connexion base, ni RLS. Les tests Auth hébergés doivent couvrir Auth, base et isolation séparément.

La bascule de production reste à exécuter après revue indépendante. Le projet Lunidex hébergé est la future cible de production; les tests qui y sont exécutés restent synthétiques tant que le GO n'est pas donné. Ne pas réutiliser l'ancien digest de rollback Neon. Toute image de rollback doit avoir un digest immuable et une preuve de compatibilité Supabase; elle doit démarrer avec `SUPABASE_DATABASE_URL`, `SUPABASE_URL`, la clé publishable et la clé Auth serveur correspondantes, et lire le schéma déjà appliqué y compris après les migrations de cutover. Valider cette image dans la stack locale/CI et, si le contrôle hébergé est requis, contre le schéma Lunidex avant la fenêtre.

**Rollback d'image avant ou après la première écriture Supabase :** déployer uniquement le digest Supabase-compatible prévalidé en laissant la base Supabase en place. Ce rollback remet une version applicative précédente, mais n'annule aucune donnée et n'autorise pas à repointer le runtime vers Neon. Si aucune image compatible ne passe les sondes, geler le trafic et réparer avec une autre image compatible; ne pas lancer une image Neon de secours.

La « première écriture » comprend une création ou modification de compte Auth, une session ou un refresh token, un reset/changement de mot de passe, une liaison OAuth, une suppression de compte, une mutation applicative et tout cron/worker. Après cette première écriture, les nouveaux états existent uniquement dans Supabase. Un retour de données vers Neon exigerait une réplication inverse distincte, implémentée, validée sur fixture locale/CI et approuvée avant exécution; un simple changement d'image ou d'URL perdrait ces écritures.

Même avant la première écriture d'exploitation, le retour de données vers Neon n'est envisageable qu'après gel complet et vérification qu'aucune mutation Auth/API/cron n'a eu lieu depuis l'import, que le digest et les checksums sont toujours ceux de l'import, et que Neon est resté gelé. C'est une décision opérateur contrôlée avec comparaison explicite, jamais un retour aveugle. Les écritures de migration ont déjà été appliquées sur Supabase : ne pas traiter la cible comme une simple réplique.

Les limites de connexion et les options runtime doivent rester alignées sur la documentation Supabase actuelle du [pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) et les règles d'[Auth migration](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth-migration). Toute opération hébergée, bascule ou modification de secrets exige une revue et une fenêtre distinctes.
