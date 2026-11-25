# Déploiement de production Lunidex sur OVH

## État de la migration

Ce document décrit la chaîne de déploiement, pas une migration exécutée. Au 24 novembre 2026, la production OVH tourne encore avec l'ancien runtime Neon. La branche de préparation Supabase n'a pas été publiée ni déployée; l'accès lecture à Neon a répondu HTTP 402 sans fournir de données, et aucune répétition staging n'a été validée. Le projet Supabase déjà connecté appartient à une autre application et ne doit pas être utilisé comme cible.

Ne pas déclencher `deploy` depuis cette branche avant d'avoir créé un projet Lunidex distinct, réussi l'export, testé complètement Auth/RLS/données/rollback sur staging, défini les variables et secrets de l'environnement `ovh-production`, puis terminé la revue indépendante. Les migrations Supabase ne sont pas appliquées à un projet hébergé par cette préparation.

Le runbook de migration fournit les préconditions détaillées, les commandes sans destruction et les limites connues : [Migration Neon → Supabase](../supabase-migration.md). Les informations sur l'ancien runtime et son ancienne image sont conservées dans [l'archive Supabase → Neon](../neon-migration.md); aucun digest Neon ne constitue un rollback valide après la bascule.

## Contrat de l'image et de la chaîne

- Les images sont publiées sur GHCR et sélectionnées par référence immuable `ghcr.io/teefloo/lunidex@sha256:…`. L'image candidate porte un label de révision Git et `com.lunidex.backend=supabase`.
- Le workflow `.github/workflows/deploy-ovh-production.yml` garde son mode manuel protégé et son mode `workflow_run` existant, encore conditionné à `AUTO_DEPLOY_ENABLED=true`. Cette tâche ne change pas cette variable. Le mode `preflight` valide uniquement le runner GitHub; il ne touche pas OVH.
- Les checks d'image isolés testent le digest, l'architecture `linux/amd64`, le label backend, l'utilisateur, la commande, le contrat Compose et `/api/healthz`, sans secrets runtime ni réseau sortant.
- La production utilise le pool `pg` Supabase avec un petit nombre de connexions et une URL de pooler partagé en mode session sur TLS vérifié. Le service role Auth reste une variable runtime serveur. L'URL publique et la clé publishable sont incorporées au build.
- Le healthcheck Docker et `/api/healthz` mesurent seulement le processus. `check-supabase-auth.sh` teste uniquement la joignabilité anonyme de `/auth/v1/health`; aucune de ces sondes ne démontre l'isolation RLS ou une session authentifiée.

### Variables de build et de runtime

Variables publiques dans l'environnement GitHub protégé `ovh-production` :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- variables publiques de mesure/SEO déjà utilisées, si activées

Secrets runtime transmis à `/opt/lunidex-production/app.env` avec permissions `0600` :

- `SUPABASE_DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LUNIDEX_CRON_SECRET`
- secrets optionnels de push/contact explicitement requis par l'environnement

Les variables `SUPABASE_MIGRATION_DATABASE_URL`, `NEON_SOURCE_DATABASE_URL`, `SUPABASE_PROJECT_REF` et les artefacts sous `.migration/` servent uniquement à la migration ponctuelle; ils ne doivent pas être injectés dans l'image ni le runtime OVH.

### Rollback compatible

Le job exige `SUPABASE_ROLLBACK_IMAGE_REF` (digest GHCR immuable) et `SUPABASE_ROLLBACK_IMAGE_REVISION` (SHA complet) dans l'environnement `ovh-production`. Le runner valide cette image sans réseau et exige le label `com.lunidex.backend=supabase`; le serveur répète le contrôle avant de remplacer l'application. Le déploiement refuse de démarrer si aucun rollback Supabase-compatible explicite n'est disponible. L'image Neon historique n'est jamais un candidat.

Après un premier déploiement Supabase, `rollback-production.sh --last-stable` essaie le digest stable précédent puis le rollback Supabase explicitement configuré. Un rollback d'image seul ne réconcilie pas des données écrites côté Supabase vers Neon. Si des écritures ont eu lieu après la bascule, geler les écritures et suivre un plan opérateur de réconciliation avant de changer de runtime.

## Contrôles avant la première bascule

1. Obtenir un export source frais, mesurer la taille/croissance/charge/MAU et confirmer une cible dédiée neuve.
2. Réussir l'import et les checksums des 31 tables, FK, séquences et identités dans un staging vide.
3. Tester avec deux JWT que les politiques isolent les comptes et bloquent les JWT dont le compte est pending/deleted. Les requêtes du serveur `postgres` contournent RLS et dépendent des contrôles d'ownership dans chaque handler.
4. Tester signup, confirmation email, login, OAuth Google/GitHub, logout, récupération PKCE, mise à jour de mot de passe, suppression, synchronisation, routes sensibles et jobs.
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
