# Déploiement de production Lunidex sur OVH

## État de la migration

Ce document décrit la chaîne de déploiement, pas une migration de production exécutée. Au 26 novembre 2026, la production OVH tourne encore avec l'ancien runtime Neon et le projet Supabase Lunidex n'a pas reçu l'import de production. Le signup hébergé synthétique et son e-mail de confirmation Resend ont abouti; le lien de confirmation a fonctionné. Le login par mot de passe a aussi été validé. Le dernier e-mail de récupération utilise une URL valide `/auth/callback?token_hash=…` et ouvre le formulaire de nouveau mot de passe; le changement reste en attente de la validation manuelle de l'utilisateur. Les tests hébergés antérieurs ont validé le pool PostgreSQL Session Pooler `aws-0-eu-west-3.pooler.supabase.com:5432`, TLS strict avec `NODE_EXTRA_CA_CERTS=.migration/supabase-ca.crt`, `SELECT 1`, `pg_stat_ssl`, la réutilisation d'une session et un test transactionnel en lecture seule avec commit/rollback. Les tests RLS/isolation entre comptes et GET/PUT de collection via `/api/user-state` ont aussi réussi. Un compte synthétique de signup conserve actuellement une carte de collection de test; ne supprimer ce compte qu'après confirmation explicite au moment de l'action. L'accès à Neon reste bloqué par quota (SQLSTATE `53000` lors de la tentative précédente), donc aucun export ni import réel n'a été effectué. Les quotas Supabase ont été vérifiés sur le plan Free, avec le pay-as-you-go désactivé. OAuth Google/GitHub reste désactivé faute d'identifiants client. Le `Site URL` Auth est encore `localhost` pour les tests et devra être remplacé, avec les redirections de production explicitement allowlistées, avant la bascule. Le projet Supabase déjà connecté d'une autre application ne doit pas être utilisé ni modifié.

Le déploiement reste **NO-GO** : aucun digest GHCR de rollback Supabase-compatible n'a été publié et validé, Neon n'a pas pu être exporté, et le compte synthétique avec sa carte de test doit être nettoyé puis contrôlé avant l'import définitif. Ne déclencher `deploy` qu'après ces préconditions, vérification de la capacité du projet Lunidex, configuration des redirections Auth de production, définition des variables/secrets de `ovh-production` et revue indépendante. Les migrations hébergées et les tests synthétiques ne prouvent pas l'import de production ni un cutover.

Le runbook de migration fournit les préconditions détaillées, les commandes sans destruction et les limites connues : [Migration Neon → Supabase](../supabase-migration.md). Les informations sur l'ancien runtime et son ancienne image sont conservées dans [l'archive Supabase → Neon](../neon-migration.md); aucun digest Neon ne constitue un rollback valide après la bascule.

## Contrat de l'image et de la chaîne

- Les images sont publiées sur GHCR et sélectionnées par référence immuable `ghcr.io/teefloo/lunidex@sha256:…`. L'image candidate porte un label de révision Git et `com.lunidex.backend=supabase`.
- Le workflow `.github/workflows/deploy-ovh-production.yml` garde son mode manuel protégé et son mode `workflow_run` existant, encore conditionné à `AUTO_DEPLOY_ENABLED=true`. Cette tâche ne change pas cette variable. Le mode `preflight` valide uniquement le runner GitHub; il ne touche pas OVH.
- Les checks d'image isolés testent le digest, l'architecture `linux/amd64`, le label backend, l'utilisateur, la commande, le contrat Compose et `/api/healthz`, sans secrets runtime ni réseau sortant.
- La production utilise le pool `pg` Supabase avec un petit nombre de connexions et une URL de pooler partagé en mode session sur TLS vérifié. Le certificat racine est préinstallé sur l'hôte dans `/opt/lunidex-production/supabase-ca.crt`, monté en lecture seule dans le conteneur et chargé par Node via `NODE_EXTRA_CA_CERTS`; il n'est pas dans le build ni livré par Actions. `SUPABASE_SECRET_KEY` est la clé runtime serveur/admin préférée; `SUPABASE_SERVICE_ROLE_KEY` reste un repli legacy temporaire. L'URL publique et la clé publishable sont incorporées au build.
- Le healthcheck Docker et `/api/healthz` mesurent seulement le processus. `check-supabase-auth.sh` teste uniquement la joignabilité anonyme de `/auth/v1/health`; aucune de ces sondes ne démontre l'isolation RLS ou une session authentifiée.

### Variables de build et de runtime

Variables publiques dans l'environnement GitHub protégé `ovh-production` :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- variables publiques de mesure/SEO déjà utilisées, si activées

Secrets runtime transmis à `/opt/lunidex-production/app.env` avec permissions `0600` :

- `SUPABASE_DATABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` (temporary legacy fallback)
- `LUNIDEX_CRON_SECRET`
- secrets optionnels de push/contact explicitement requis par l'environnement

Les variables `SUPABASE_MIGRATION_DATABASE_URL`, `NEON_SOURCE_DATABASE_URL`, `SUPABASE_PROJECT_REF` et les artefacts sous `.migration/` servent uniquement à la migration ponctuelle; ils ne doivent pas être injectés dans l'image ni le runtime OVH.

### Rollback compatible

Le job exige `SUPABASE_ROLLBACK_IMAGE_REF` (digest GHCR immuable) et `SUPABASE_ROLLBACK_IMAGE_REVISION` (SHA complet) dans l'environnement `ovh-production`. Le runner valide cette image sans réseau et exige le label `com.lunidex.backend=supabase`; le serveur répète le contrôle avant de remplacer l'application. Le déploiement refuse de démarrer si aucun rollback Supabase-compatible explicite n'est disponible. L'image Neon historique n'est jamais un candidat.

Aucun digest rollback Supabase-compatible n'est validé dans le checkout de préparation; en l'absence d'une référence publiée et d'une validation préflight documentée, le déploiement reste NO-GO. L'image courante Neon et `Dockerfile.rollback-baseline` ne sont pas des alternatives valides.

Après un premier déploiement Supabase, `rollback-production.sh --last-stable` essaie le digest stable précédent puis le rollback Supabase explicitement configuré. Un rollback d'image seul ne réconcilie pas des données écrites côté Supabase vers Neon. Si des écritures ont eu lieu après la bascule, geler les écritures et suivre un plan opérateur de réconciliation avant de changer de runtime.

## Contrôles avant la première bascule

1. Obtenir un export source frais, mesurer la taille/croissance/charge/MAU et confirmer la capacité/quotas du projet Lunidex avant import.
2. Réussir l'import et les checksums des 31 tables, FK, séquences et identités après avoir contrôlé que la cible est vide et que les tests synthétiques ont été nettoyés.
3. Tester avec deux JWT que les politiques isolent les comptes et bloquent les JWT dont le compte est pending/deleted. Les requêtes du serveur `postgres` contournent RLS et dépendent des contrôles d'ownership dans chaque handler.
4. Compléter les parcours opérationnels restants, dont OAuth Google/GitHub après obtention des identifiants, mise à jour manuelle du mot de passe, logout, suppression, synchronisation, routes sensibles et jobs. Le signup synthétique, la confirmation Resend, le login par mot de passe, l'ouverture du lien de récupération, l'isolation RLS et le GET/PUT de collection ont déjà été vérifiés; OAuth n'est pas configuré.
5. Valider un backup restaurable, les paramètres Auth/SMTP/redirect URLs, la charge sur OVH, la capacité Supabase et l'image de rollback.
6. Approuver une fenêtre distincte de bascule; ne pas démarrer deux instances Node lourdes simultanément sur le VPS 4 Gio.

## Opération après validation

Le `deploy` manuel reste limité à `master`, à un SHA complet autorisé et à la phrase de confirmation configurée dans Actions. Il met à jour l'image par digest, puis vérifie le conteneur, `/api/healthz` et les routes HTTPS publiques. Une panne de reachability Auth est rapportée séparément de l'état du processus; elle n'est pas une preuve d'OOM.

Rollback manuel après bascule, uniquement vers l'image Supabase-compatible configurée :

```bash
bash /opt/lunidex-production/scripts/deployment/rollback-production.sh
```

Ne pas exécuter de migration distante, de copie de données, de bascule DNS ou de rollback réel dans le cadre d'une revue de code. Toute activation de cron reste une opération séparée après vérification de ses secrets et de ses effets.

## Surveillance OVH

Les audits mémoire historiques ont observé une pression cgroup (`memory.events:max`) sans OOM confirmé. Après tout futur déploiement, comparer séparément la santé Node/HTTPS/Auth, `RestartCount`, OOM, `memory.current/max/peak`, RSS Node, CPU, RAM hôte, disque et erreurs 5xx. Une augmentation du compteur `max` signale une pression et appelle une analyse; elle ne prouve pas une fuite JavaScript ou un OOM V8.
