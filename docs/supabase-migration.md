# Préparer la migration Neon → Supabase

Ce runbook décrit une bascule à préparer en plusieurs étapes. À la date du 24 novembre 2026, l'accès en lecture au Neon courant a répondu HTTP 402 (quota) sans fournir de données. Il n'existe donc pas encore d'export frais, de comparaison source/cible, ni de répétition validée sur staging. Le projet Supabase déjà connecté appartient à une autre application et ne doit pas servir de cible. Créer et valider un nouveau projet Lunidex ainsi qu'un staging jetable reste un prérequis externe.

Neon et Supabase restent séparés pendant la préparation. Aucune commande de ce runbook ne constitue une autorisation de bascule de trafic ou de modification de production.

## État et périmètre

- L'application utilise Supabase Auth et un pool PostgreSQL `pg` à faible capacité depuis le runtime Node long-running sur OVH. `SUPABASE_DATABASE_URL` est la connexion runtime au pooler partagé en mode session, avec vérification TLS. Le pool est distinct de la connexion utilisée pour les opérations de migration.
- Le schéma comporte 31 tables applicatives dans `app`, `public` et `analytics`, plus les objets associés (fonctions, vues, déclencheurs, index, clés étrangères, séquences). Le snapshot historique se trouve dans `neon/migrations/`; le schéma Supabase actif est sous `supabase/migrations/`.
- Auth conserve les UUID source et l'état de confirmation d'adresse, mais n'importe ni hashes de mot de passe, ni sessions, ni identités OAuth liées. La compatibilité des hashes Better Auth/Neon avec Supabase n'est pas établie. Chaque utilisateur devra définir un nouveau mot de passe; les utilisateurs sociaux devront relier à nouveau leur fournisseur. Le nombre actuel de comptes reste inconnu tant qu'un export source n'a pas réussi.
- Free n'est pas déclaré suffisant. Les limites officielles actuellement indiquées incluent 500 MB de base, 50 000 MAU, 5 GB d'egress et 5 GB d'egress mis en cache, 1 GB de stockage fichiers et 500 MB de RAM; les projets Free peuvent être suspendus après sept jours d'inactivité. Relever d'abord taille, croissance, connexions, MAU, trafic, charge, sauvegardes et disponibilité requise, puis comparer au [tarif Supabase](https://supabase.com/pricing) et aux [limites de plateforme](https://supabase.com/docs/guides/platform/going-into-prod). Les seuils et tarifs peuvent évoluer.
- L'application n'utilise pas le Data API pour ses mutations métier. RLS est active sur les 31 tables, les privilèges Data API sont refusés par défaut, et seuls des accès de lecture ciblés sont accordés. Les handlers Next gardent les vérifications de propriété car la connexion serveur `postgres` contourne RLS. Les vues publiques doivent rester `security_invoker` ou strictement non exposées.

## Prérequis avant tout import

1. Récupérer l'accès source Neon et confirmer qu'une lecture fraîche fonctionne. Créer un rôle source limité à `SELECT`; ne pas utiliser le rôle d'écriture applicatif pour l'export si un rôle lecture peut être provisionné.
2. Créer un nouveau projet Supabase dédié à Lunidex, avec la région, le plan, les sauvegardes, les SMTP/Auth providers, quotas et limites validés. Confirmer l'identifiant `ref` depuis le tableau de bord. Ne pas réutiliser un projet existant qui contient des utilisateurs ou des données.
3. Monter localement la configuration Supabase CLI et appliquer les migrations uniquement au Supabase local. Revoir les migrations et les résultats de tests avant d'appliquer le même schéma au nouveau projet distant par une procédure opérateur distincte.
4. Faire une répétition complète dans un projet staging vide créé pour Lunidex. Vérifier les deux utilisateurs de test et les politiques RLS avec deux JWT distincts, l'accès après suppression/pending-delete, Auth, OAuth, reset, callbacks, comptes en double, API, sync, leaderboard, partage, jobs et rollback.
5. Décider et tester le mécanisme de rollback. Après toute écriture côté Supabase, revenir à une image Neon seule perd ces écritures. La procédure doit geler les écritures et réconcilier les données dans le sens inverse, ou utiliser une image explicitement construite et vérifiée pour Supabase. N'utiliser aucune image de rollback Neon après bascule.
6. Exporter, sauvegarder et vérifier le dump privé source avant d'importer. Préparer les secrets dans le gestionnaire protégé de l'environnement; ne jamais les placer dans des arguments, logs, artefacts CI publics ou variables `NEXT_PUBLIC_*`.

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

Le job `supabase-local` de CI utilise la CLI officielle épinglée `3.4.0`, démarre PostgreSQL et GoTrue dans une stack locale éphémère (les autres services sont exclus), applique les migrations avec `supabase migration up` et exécute `supabase test db`. La CLI 3 cible sa stack locale par défaut; le workflow n'ajoute aucune option `--remote` et ne lie aucun projet. Il ne lit aucun secret et arrête les conteneurs même si un contrôle échoue. Sur le poste de préparation, le daemon Docker n'est pas disponible; cette validation doit donc être lue dans le résultat de CI, elle n'a pas été exécutée localement.

Dans `supabase/config.toml`, le `site_url` local est `http://localhost:3000` et les callbacks locaux sont limités aux origines HTTP `localhost:3000` et `127.0.0.1:3000`, avec leurs chemins de développement. Cette allowlist est uniquement pour la stack locale. Dans un projet hébergé, configurer `site_url` et les URL de redirection à la main, avec les domaines et chemins de production exacts; ne pas recopier les wildcards ou origines loopback locales.

Aucune répétition staging n'a encore eu lieu : l'accès lecture à la source Neon a répondu HTTP 402/quota, sans renvoyer de données ni permettre un export. Aucun projet Supabase adapté à Lunidex n'est disponible/identifié dans ce travail; le projet Supabase déjà connecté appartient à une autre application et ne doit pas être utilisé. Le nombre actuel de comptes/lignes, l'export frais, l'import, la comparaison réelle de toutes les lignes et le test d'isolation hébergé restent à valider avec une cible staging dédiée avant le cutover.

## Bascule, santé et rollback

Avant de changer le trafic, valider sur staging l'email de confirmation, signup, Google/GitHub OAuth, logout, reset avec callback PKCE, mise à jour de mot de passe, suppression de compte, synchronisation et ownership de toutes les routes API. Relever des métriques source récentes pour vérifier la capacité et le coût. Vérifier les événements d'Auth et la restauration de backup.

Le health check `/api/healthz` vérifie le processus Node uniquement. `scripts/deployment/check-supabase-auth.sh https://<project-ref>.supabase.co` vérifie seulement la joignabilité du endpoint Auth; cela ne prouve pas une session utilisateur, une connexion base, ni RLS. Les vérifications de staging doivent tester Auth, base et isolation séparément.

La bascule production et la création d'un projet externe restent à exécuter après revue indépendante. Ne pas réutiliser l'ancien digest de rollback Neon. Toute image de rollback post-bascule doit avoir un digest immuable et un label/runtime prouvant la compatibilité Supabase; en l'absence d'une telle image validée, bloquer le rollback automatique et suivre la procédure opérateur de gel et de réconciliation. Si des écritures ont déjà atteint Supabase, un rollback d'image seul ne restaure pas ces données vers Neon.

Les limites de connexion et les options runtime doivent rester alignées sur la documentation Supabase actuelle du [pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) et les règles d'[Auth migration](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth-migration). Toute opération hébergée, bascule ou modification de secrets exige une revue et une fenêtre distinctes.
