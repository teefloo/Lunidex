# Préparer la migration Neon → Supabase

Ce runbook décrit une bascule à préparer en plusieurs étapes. À la date du 24 novembre 2026, l'accès en lecture au Neon courant a répondu HTTP 402 (quota) sans fournir de données. Il n'existe donc pas encore d'export frais, de comparaison source/cible, ni de répétition validée sur staging. Le projet Supabase déjà connecté appartient à une autre application et ne doit pas servir de cible. Créer et valider un nouveau projet Lunidex ainsi qu'un staging jetable reste un prérequis externe.

Neon et Supabase restent séparés pendant la préparation. Aucune commande de ce runbook ne constitue une autorisation de bascule de trafic ou de modification de production.

## État et périmètre

- L'application utilise Supabase Auth et un pool PostgreSQL `pg` à faible capacité depuis le runtime Node long-running sur OVH. `SUPABASE_DATABASE_URL` est la connexion runtime au pooler partagé en mode session, avec vérification TLS. Le pool est distinct de la connexion utilisée pour les opérations de migration.
- Le schéma comporte 31 tables applicatives dans `app`, `public` et `analytics`, plus les objets associés (fonctions, vues, déclencheurs, index, clés étrangères, séquences). Le snapshot historique se trouve dans `neon/migrations/`; le schéma Supabase actif est sous `supabase/migrations/`.
- Auth conserve les UUID source et l'état de confirmation d'adresse, mais le script actuel n'importe ni hashes de mot de passe, ni sessions, ni identités OAuth liées. Better Auth utilise scrypt par défaut. Supabase Auth documente bcrypt, Firebase scrypt et Argon2 pour `password_hash`; le code GoTrue actuel reconnaît les préfixes `$fbscrypt` et `$argon2`, puis interprète les autres formats comme bcrypt. Le scrypt Better Auth n'est donc pas directement compatible par simple copie, sauf preuve qu'il est explicitement encodé dans un format accepté et vérifié par GoTrue. La configuration Better Auth et le format réel de la source restent inconnus tant que l'accès Neon répond 402. Le chemin sûr préparé est un reset de mot de passe et une nouvelle liaison OAuth. Ne changer ce choix que si un staging confirme format, préfixe, paramètres, UUID et login de comptes synthétiques avec un import dédié et revu. Le nombre actuel de comptes reste inconnu tant qu'un export source n'a pas réussi. Voir les recommandations officielles [Better Auth sur les mots de passe](https://better-auth.com/docs/authentication/email-password), [sa référence de sécurité](https://better-auth.com/docs/reference/security), [la référence Supabase `createUser`](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [les types Supabase Auth](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/types.ts) et [l'implémentation GoTrue](https://github.com/supabase/auth/blob/master/internal/crypto/password.go).
- Free n'est pas déclaré suffisant. Les limites officielles actuellement indiquées incluent 500 MB de base, 50 000 MAU, 5 GB d'egress et 5 GB d'egress mis en cache, 1 GB de stockage fichiers et 500 MB de RAM; les projets Free peuvent être suspendus après sept jours d'inactivité. Relever d'abord taille, croissance, connexions, MAU, trafic, charge, sauvegardes et disponibilité requise, puis comparer au [tarif Supabase](https://supabase.com/pricing) et aux [limites de plateforme](https://supabase.com/docs/guides/platform/going-into-prod). Les seuils et tarifs peuvent évoluer.
- L'application n'utilise pas le Data API pour ses mutations métier. RLS est active sur les 31 tables, les privilèges Data API sont refusés par défaut, et seuls des accès de lecture ciblés sont accordés. Les handlers Next gardent les vérifications de propriété car la connexion serveur `postgres` contourne RLS. Les vues publiques doivent rester `security_invoker` ou strictement non exposées.

### Inventaire opérateur observé

Au 25 novembre 2026, l'organisation Supabase consultée est en plan Free. Elle contient un projet hébergé actif qui appartient à une autre application et doit rester intact; aucun projet Lunidex n'a été créé ou identifié. Le devis observé pour un nouveau projet Free était de 0 €/mois et proposait la région `eu-west-3` (Paris), sous réserve de confirmation au moment de la création. Le plan Free limite à deux projets actifs au total : réserver son dernier slot disponible pour staging le consommerait. Le projet de production devra donc faire l'objet d'une stratégie de plan/capacité et d'une autorisation distinctes; ne pas supposer qu'un slot Free sera disponible pour staging et production à la fois. Ces limites et devis peuvent évoluer et ne constituent pas une réservation.

## Prérequis avant tout import

1. Récupérer l'accès source Neon et confirmer qu'une lecture fraîche fonctionne. Créer un rôle source limité à `SELECT`; ne pas utiliser le rôle d'écriture applicatif pour l'export si un rôle lecture peut être provisionné.
2. Créer un nouveau projet Supabase dédié à Lunidex, avec la région, le plan, les sauvegardes, les SMTP/Auth providers, quotas et limites validés. Confirmer l'identifiant `ref` depuis le tableau de bord. Ne pas réutiliser un projet existant qui contient des utilisateurs ou des données.
3. Monter localement la configuration Supabase CLI et appliquer les migrations uniquement au Supabase local. Revoir les migrations et les résultats de tests avant d'appliquer le même schéma au nouveau projet distant par une procédure opérateur distincte.
4. Faire une répétition complète dans un projet staging vide créé pour Lunidex. Vérifier l'import synthétique, deux utilisateurs fictifs et les politiques RLS avec deux JWT distincts, l'accès après suppression/pending-delete, Auth, reset et callbacks. Tester OAuth réel uniquement si ses identifiants et origines sont configurés; tester la délivrabilité SMTP avec des boîtes de staging contrôlées. Tester comptes en double, API, sync, leaderboard, partage, jobs et les deux procédures de rollback décrites plus bas.
5. Préparer un digest immuable de l'image courante et au moins un digest d'image de rollback explicitement compatible avec Supabase, puis valider ces images contre la version du schéma/API de staging. L'ancien digest Neon n'est pas une option de rollback après la bascule.
6. Exporter, sauvegarder et vérifier le dump privé source avant d'importer. Préparer les secrets dans le gestionnaire protégé de l'environnement; ne jamais les placer dans des arguments, logs, artefacts CI publics ou variables `NEXT_PUBLIC_*`.

## Gate de premier déploiement

Le premier déploiement est **NO-GO** tant qu'une des portes ci-dessous n'est pas satisfaite et consignée avec son résultat. Les valeurs secrètes ne doivent pas apparaître dans le compte rendu.

| Porte | Preuve exigée avant déploiement |
| --- | --- |
| Source | Lecture Neon rétablie, export final frais après gel, nombre de comptes/lignes relevé, dump source sauvegardé et contrôlé |
| Cible | Ref exact du nouveau projet Lunidex confirmé; projet de staging dédié; cible de production vide et distincte du projet staging; plan, région, quotas et sauvegardes approuvés |
| Schéma | Migrations locales et pgTAP verts; import synthétique CI vert; `dry-run` sur la vraie cible vide; staging complet vérifié par checksums, séquences, Auth et FK |
| Auth | UUID/email-confirmation réconciliés; décision hash/reset signée; deux comptes fictifs passent login, reset et callback en staging; OAuth/SMTP testés si activés |
| Isolation | Tests Data API/RLS avec deux JWT hébergés, y compris accès croisé refusé, compte pending-delete et vues publiques; handlers serveur contrôlés séparément |
| Déploiement | Variables runtime et Auth testées; digest de release épinglé; digest de rollback Supabase-compatible déjà construit et éprouvé; restauration de sauvegarde démontrée |
| Fenêtre | Maintenance, gel des écritures et jobs, contact d'astreinte, observabilité, critères GO/NO-GO, responsable de décision et fenêtre de retour documentés |

Le job CI local synthétique ne remplace ni le `dry-run` de la cible réelle, ni la répétition hébergée, ni un contrôle d'isolation avec JWT hébergés. Aucun résultat actuel ne satisfait les portes Source, Cible ou Staging : l'accès Neon a répondu 402 et aucune cible Lunidex dédiée n'a été identifiée.

## Variables d'environnement

Copier les variables dans un `.env.local` ignoré par Git ou les fournir via un gestionnaire de secrets. Ne pas afficher les valeurs.

| Variable | Usage |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publique du projet utilisée par le navigateur et Auth SSR |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable publique, jamais la clé service/secret |
| `SUPABASE_DATABASE_URL` | Pool runtime OVH, pooler partagé session, TLS vérifié |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement : administration Auth et import explicite des identités |
| `NEON_SOURCE_DATABASE_URL` | Accès Neon en lecture seule pour l'export |
| `SUPABASE_MIGRATION_DATABASE_URL` | Connexion directe ou pooler session de la cible explicitement choisie |
| `SUPABASE_PROJECT_REF` | `ref` exact correspondant à l'URL API et à l'URL de base |
| `LUNIDEX_MIGRATION_EXPORT_DIR` | Répertoire local privé ignoré par Git, par défaut `.migration/neon-to-supabase` |
| `LUNIDEX_MIGRATION_WRITE_FREEZE` | Valeur sentinelle requise pour les commandes Auth/data après gel effectif des écritures |

Le pool runtime OVH et la connexion de migration sont intentionnellement séparés. Pour un serveur Node long-running sur VPS, utiliser le pooler partagé Supabase en mode session (port 5432) afin de préserver transactions et état de session. `pg` impose TLS avec validation du certificat; ne pas désactiver cette vérification.

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

À réaliser uniquement après répétition staging réussie, validation de la cible vide et gel confirmé des inscriptions, écritures utilisateur, jobs planifiés, tâches cron et processus source. Mettre en pause les workers et mettre l'application en mode maintenance si nécessaire. Une simple variable sentinelle ne gèle pas le système; l'opérateur doit effectivement couper les écritures.

```bash
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES npm run db:migrate:supabase:auth
LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES npm run db:migrate:supabase:data
npm run db:migrate:supabase:verify
```

`auth` crée les utilisateurs avec leurs UUID source, leurs emails et l'état de confirmation; elle refuse un conflit d'ID/email ou une identité cible supplémentaire. Elle crée les comptes sans mot de passe et n'importe pas de sessions. `data` n'accepte que les 31 tables exactes, le schéma comparé, les Auth IDs complètes et une cible applicative vide. Les lignes sont insérées dans l'ordre des dépendances FK, en lots de 500 lignes maximum et 8 Mio de JSON par requête; les colonnes générées restent exclues et chaque lot utilise `ON CONFLICT DO NOTHING`. L'import se fait dans une transaction protégée par verrou consultatif; il ne supprime ni ne remplace de lignes. Les sommes de contrôle finales vérifient toutes les tables avant validation de la transaction. Le même digest peut être relancé de façon idempotente après vérification; un digest différent sur une cible marquée est refusé.

`verify` compare l'inventaire des tables et colonnes, les FK, contraintes PK/UNIQUE/CHECK, index, triggers, fonctions/procédures, vues, pgcrypto, les quantités et checksums de toutes les lignes, les définitions et états des séquences et les identifiants/emails Auth. L'inventaire compare les définitions exposées par les catalogues PostgreSQL de ces objets; il ne prétend pas prouver les comportements applicatifs ni l'isolation du serveur Next.js. Il n'effectue pas de reset ou de cleanup. Le test SQL `supabase/tests/account-rls.sql` vérifie les lectures avec plusieurs contextes JWT et le cas de compte inactif.

## Validation locale et staging

Le job `supabase-local` de CI utilise la CLI officielle épinglée `3.4.0`, démarre PostgreSQL, GoTrue, Kong et PostgREST dans une stack locale éphémère, applique les migrations avec `supabase migration up` et exécute `supabase test db`. La sortie de `supabase start` est supprimée car la CLI peut afficher les clés locales. Ensuite, `scripts/migration/local-e2e-fixture.mjs` crée une base source synthétique séparée sur le PostgreSQL local, applique les dix migrations historiques et y insère un seul UUID/email et un score fictifs. Il exécute les commandes d'export final, dry-run, import Auth, import données et vérification, puis les rejoue pour vérifier l'idempotence. Il n'emploie que des hôtes loopback et refuse les refs/URLs hébergées; son export privé temporaire est supprimé à la fin. Le test des gardes de cible peut tourner hors Docker; l'import synthétique nécessite l'ensemble local Auth/API. La CLI 3 cible sa stack locale par défaut; le workflow n'ajoute aucune option `--remote` et ne lie aucun projet. Il ne lit aucun secret et arrête les conteneurs même si un contrôle échoue. Ce scénario vérifie le code et schéma du dépôt sur une fixture, pas le compte Neon courant, ses volumes, une cible distante ou un staging. Sur le poste de préparation, le daemon Docker n'est pas disponible; cette validation doit donc être lue dans le résultat de CI, elle n'a pas été exécutée localement.

Dans `supabase/config.toml`, le `site_url` local est `http://localhost:3000` et les callbacks locaux sont limités aux origines HTTP `localhost:3000` et `127.0.0.1:3000`, avec leurs chemins de développement. Cette allowlist est uniquement pour la stack locale. Dans un projet hébergé, configurer `site_url` et les URL de redirection à la main, avec les domaines et chemins de production exacts; ne pas recopier les wildcards ou origines loopback locales.

Aucune répétition staging n'a encore eu lieu : l'accès lecture à la source Neon a répondu HTTP 402/quota, sans renvoyer de données ni permettre un export. Aucun projet Supabase adapté à Lunidex n'est disponible/identifié dans ce travail; le projet Supabase déjà connecté appartient à une autre application et ne doit pas être utilisé. Le nombre actuel de comptes/lignes, l'export frais, l'import, la comparaison réelle de toutes les lignes et le test d'isolation hébergé restent à valider avec une cible staging dédiée avant le cutover.

Un smoke opt-in est préparé dans `scripts/migration/staging-smoke.mjs`, mais n'a pas été exécuté. Après approbation et création du projet de staging Lunidex, charger dans l'environnement protégé `LUNIDEX_STAGING_PROJECT_REF` (le ref généré visible dans le dashboard), le même `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_DATABASE_URL`, `LUNIDEX_STAGING_APP_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` et `LUNIDEX_STAGING_SMOKE=I_CONFIRM_LUNIDEX_STAGING_DATA_MUTATION`, puis lancer `node scripts/migration/staging-smoke.mjs`. Le script vérifie que ref, URL API et Shared Pooler session (port 5432, utilisateur `postgres.<ref>`) identifient le même projet, impose TLS avec validation du certificat, contrôle `pg_stat_ssl` et que le backend PostgreSQL est réutilisé; `LUNIDEX_STAGING_APP_URL` accepte soit une origine HTTPS de staging sous `*.lunidex.app`, hors origines de production connues, soit exactement `http://localhost:3000` ou `http://127.0.0.1:3000` pour une app locale; toute autre origine loopback/réseau, credential, port, chemin, query ou fragment est refusé. Le ref/API/base de données restent toujours ceux du projet staging hébergé. Pour l'app locale, ajouter explicitement les URL callback locales autorisées dans la configuration Auth de staging avant l'exécution; ne pas élargir la liste avec un wildcard général. Le ref du projet Supabase déjà occupé par une autre application est refusé. Il crée deux comptes synthétiques via l'API admin (pas via le formulaire signup), leurs projections `app.users`/profiles/state, teste login, reset via lien/token généré sans envoi SMTP, contrôle l'URL callback produite, les lectures Data API de snapshots/collections en accès croisé, le profil public et les refus anon pour email, api_keys et analytics, puis supprime uniquement ses UUIDs. L'API web `/api/user-state` peut être ajoutée au contrôle en configurant `LUNIDEX_STAGING_APP_API_CHECK=I_CONFIRM_LUNIDEX_STAGING_APP_IS_READY` seulement après déploiement de l'app sur le même projet staging; elle fait alors un GET, ajoute une collection TCG synthétique via PUT avec version attendue, puis vérifie que chaque bearer relit uniquement son snapshot et que le snapshot du second compte est inchangé. Le script ne valide pas la livraison d'e-mail, le signup public, l'échange navigateur PKCE, OAuth réel ni les autres endpoints applicatifs de collections; ceux-ci restent à vérifier avec deux comptes et boîtes fictifs contrôlés. Le scénario local CI et ce script de smoke sont des préparations, pas des résultats staging. L'option app API est absente tant que l'application staging compatible n'est pas réellement déployée.

## Bascule, santé et rollback

### Ordre de bascule et portes de cutover

Le premier déploiement est bloqué tant que les gates Source, Cible, Schéma, Auth, Isolation, Déploiement et Fenêtre du tableau « Gate de premier déploiement » ne sont pas toutes documentées comme réussies. En particulier, aucun staging ou export n'est actuellement validé. Avant la fenêtre, valider sur staging l'email de confirmation, signup, Google/GitHub OAuth si configurés, logout, reset avec callback PKCE, mise à jour de mot de passe, suppression de compte, synchronisation et ownership des routes API. Relever des métriques source récentes et vérifier les événements d'Auth ainsi que la restauration de backup.

Procéder dans cet ordre, avec un GO explicite entre chaque phase :

1. Geler réellement les inscriptions, les nouvelles sessions si elles écrivent dans Auth, les mutations API, les workers, cron et autres jobs côté Neon; placer Lunidex en maintenance et vérifier les files vides. La sentinelle de migration ne fait pas ce gel.
2. Maintenir Neon en lecture seule et immuable pendant toute la bascule. Produire l'export `--final`, le protéger, vérifier les quantités et faire `dry-run` contre le projet de production dont le ref a été confirmé indépendamment. Tout objet inattendu ou toute table déjà non vide signifie NO-GO; ne pas vider la cible pour contourner le garde-fou.
3. Importer Auth, puis les données. Exécuter `verify`; archiver localement le digest, les comptes et les résultats de comparaison sans publier les identifiants ni données. Confirmer que la cible est exactement celle de production dédiée, jamais le projet hébergé d'une autre application.
4. Déployer sur OVH le digest immuable de l'application Supabase-compatible, trafic toujours en maintenance. Tester séparément Auth, connexion PostgreSQL runtime, `/api/healthz`, API et isolation. Effectuer au plus une écriture contrôlée avec un compte fictif.
5. Si toutes les sondes réussissent, autoriser le trafic et les jobs sur Supabase. Continuer d'observer Auth, latence, pool, quotas, egress et compteurs d'écriture; ne jamais réactiver les jobs Neon.

Le health check `/api/healthz` vérifie le processus Node uniquement. `scripts/deployment/check-supabase-auth.sh https://<project-ref>.supabase.co` vérifie seulement la joignabilité du endpoint Auth; cela ne prouve pas une session utilisateur, une connexion base, ni RLS. Les vérifications de staging doivent tester Auth, base et isolation séparément.

La bascule production et la création d'un projet externe restent à exécuter après revue indépendante. Ne pas réutiliser l'ancien digest de rollback Neon. Toute image de rollback doit avoir un digest immuable et une preuve de compatibilité Supabase; elle doit démarrer avec `SUPABASE_DATABASE_URL`, `SUPABASE_URL`, la clé publishable et la clé Auth serveur correspondantes, et lire le schéma déjà appliqué y compris après les migrations de cutover. Valider cette image contre le schéma de staging avant la fenêtre.

**Rollback d'image avant ou après la première écriture Supabase :** déployer uniquement le digest Supabase-compatible prévalidé en laissant la base Supabase en place. Ce rollback remet une version applicative précédente, mais n'annule aucune donnée et n'autorise pas à repointer le runtime vers Neon. Si aucune image compatible ne passe les sondes, geler le trafic et réparer avec une autre image compatible; ne pas lancer une image Neon de secours.

La « première écriture » comprend une création ou modification de compte Auth, une session ou un refresh token, un reset/changement de mot de passe, une liaison OAuth, une suppression de compte, une mutation applicative et tout cron/worker. Après cette première écriture, les nouveaux états existent uniquement dans Supabase. Un retour de données vers Neon exigerait une réplication inverse distincte, implémentée, testée en staging et approuvée avant exécution; un simple changement d'image ou d'URL perdrait ces écritures.

Même avant la première écriture d'exploitation, le retour de données vers Neon n'est envisageable qu'après gel complet et vérification qu'aucune mutation Auth/API/cron n'a eu lieu depuis l'import, que le digest et les checksums sont toujours ceux de l'import, et que Neon est resté gelé. C'est une décision opérateur contrôlée avec comparaison explicite, jamais un retour aveugle. Les écritures de migration ont déjà été appliquées sur Supabase : ne pas traiter la cible comme une simple réplique.

Les limites de connexion et les options runtime doivent rester alignées sur la documentation Supabase actuelle du [pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) et les règles d'[Auth migration](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth-migration). Toute opération hébergée, bascule ou modification de secrets exige une revue et une fenêtre distinctes.
