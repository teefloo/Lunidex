# Héberger Lunidex sur un VPS OVHcloud

> **État de référence antérieur à la migration Supabase.** Les informations de déploiement et les mesures Neon ci-dessous décrivent le VPS avant bascule. La branche de migration n'a pas été déployée et l'export Neon courant est encore bloqué; ne réutilisez pas les anciennes valeurs Neon comme configuration runtime. Pour le nouveau contrat OVH, lire le [runbook Supabase](../supabase-migration.md) et le [runbook de production](./ovh-production.md).

Ce guide décrit les environnements Lunidex hébergés sur le VPS OVHcloud : la production sur `lunidex.app` et `www.lunidex.app`, ainsi que le sous-domaine de test `vps-test.lunidex.app`. Les images, caches et configurations Docker de production et de préproduction restent séparés; évitez de faire tourner deux instances lourdes durablement sur les 4 Gio de mémoire du VPS.

## État du VPS au 18 novembre 2026

- L'accès par clé SSH à `ubuntu@51.255.40.19:22` fonctionne. La connexion root est refusée; `ubuntu` reste le compte d'administration. Aucun mot de passe ni clé privée n'est documenté ici.
- Ubuntu 24.04 LTS est confirmé. Les mises à jour système ont été appliquées et le VPS a été redémarré.
- Docker Engine et Docker Compose sont installés. UFW est actif et autorise SSH (22), HTTP (80) et HTTPS (443); aucun port Next.js n'est publié.
- La rotation journald est configurée avec un plafond de 250 Mio.
- Le compte `lunidex-deploy` est créé et verrouillé, appartient au groupe `docker`, et `/opt/lunidex` héberge les fichiers de préproduction. La clé dédiée de GitHub Actions est installée et stockée dans l'environnement GitHub `ovh-preproduction`; ses variables d'hôte, d'utilisateur et de `known_hosts` sont configurées.
- La préproduction a utilisé l'image immuable `7efeb008b5b6f4c54db9d0887c8e64753ba15fa0`; cette instance n'est pas maintenue en fonctionnement permanent afin de préserver les ressources du VPS. La production utilise une image distincte déployée par le workflow protégé; son conteneur et Caddy sont actifs, Caddy sert HTTPS sur les domaines principaux et le healthcheck `/api/healthz` est validé. Le fichier d'environnement d'exécution existe sur le VPS; aucune valeur secrète n'est enregistrée dans ce guide ou dans Git.
- Les unités systemd cron sont préparées, mais les deux timers de production restent désactivés jusqu’à une validation opérationnelle distincte; aucun rattrapage automatique ne doit déclencher des traitements non contrôlés.
- La branche Neon `ovh-preproduction`, enfant de `main`, est active avec Neon Auth. L'application utilise un rôle runtime dédié à cette branche isolée; les secrets et données de production Neon ne sont pas utilisés en préproduction.
- Le DNS est géré par Namecheap (`dns1.registrar-servers.com` et `dns2.registrar-servers.com`). L'enregistrement A `vps-test.lunidex.app → 51.255.40.19` a été créé et sa résolution a été confirmée via Namecheap, `8.8.8.8` et `1.1.1.1`. Les enregistrements A de `lunidex.app` et `www.lunidex.app` pointent désormais vers le VPS OVHcloud.
- Le workflow GitHub Actions de déploiement par push sur `codex/ovh-vps-migration` a réussi (run `44129652554`), y compris `npm ci`, ESLint, TypeScript, 970 tests Vitest, SEO, build Next.js, contrôle du package core, publication de l'image, HTTPS et healthcheck.

## Architecture

```text
Navigateur → Cloudflare → Caddy (HTTPS) → réseau Docker privé → Next.js 16
                                                         ↘ Neon, PokéAPI, TCGdex, Resend
```

- Caddy écoute sur les ports 80 et 443. Il obtient et renouvelle les certificats TLS; ses données sont conservées dans les volumes `lunidex-caddy-data` et `lunidex-caddy-config`.
- Le conteneur Next.js n'a aucun port publié. Seul Caddy peut l'atteindre sur le réseau `backend`; un réseau d'egress séparé lui permet d'appeler Neon et les API externes.
- Le conteneur Next.js tourne avec l'utilisateur `nextjs`, sans capacités Linux, avec un système de fichiers en lecture seule, une limite de 2 Gio de RAM et 1,5 CPU. `NODE_OPTIONS` limite le heap JavaScript à 1 Gio. Caddy est limité à 256 Mio et 0,5 CPU.
- L'image Next.js est compilée dans GitHub Actions avec Node 22.23.4 et publiée dans GHCR sous un SHA Git complet. Aucun build Next.js ne s'exécute sur le VPS.
- Les seules données persistantes de l'application sur le VPS sont le cache Next.js et l'état TLS/Caddy. Lunidex ne nécessite pas de base PostgreSQL locale; les données synchronisées restent dans Neon.

`next.config.ts` active `output: 'standalone'` pour le runtime Docker. Le tracing part de la racine du monorepo afin d'inclure `@primedex/core`. Le Dockerfile copie `public/` et `.next/static/` manuellement, comme requis par le serveur standalone. Le dossier `public/og/` et les polices OG sous `src/lib/og/fonts/` sont inclus par les règles de tracing existantes et le contexte de build. `sharp` est déjà une dépendance du projet, donc `next/image` reste optimisé dans le runtime Node.

Le runtime utilise Sentry et PostHog avec leurs contrôles de consentement. Les mesures Sentry de performance et de replay restent facultatives et ne se déclenchent qu’après consentement.

Le SHA transmis comme `NEXT_DEPLOYMENT_ID` permet à Next.js de détecter les onglets et clients PWA qui naviguent encore avec un ancien build et de demander un rechargement. Le volume `lunidex-next-cache` conserve le cache Next.js local d'une instance unique; il ne contient pas de données utilisateur.

## Contrôles avant un prochain déploiement

L'accès SSH par clé fonctionne pour `ubuntu`; ne pas réactiver le login root. L'OS, les mises à jour/reboot, Docker/Compose, UFW, la limite journald, le compte de déploiement et son répertoire sont déjà en place. La clé GitHub Actions et les variables SSH sont configurées. Avant un nouveau déploiement :

1. Vérifier l'architecture, la mémoire et le disque (`uname -m`, `free -h`, `df -h`). Confirmer `amd64` avant d'utiliser l'image GHCR `linux/amd64`.
2. Vérifier une deuxième connexion SSH avec `lunidex-deploy`, sans fermer la session `ubuntu` actuelle. Ce compte appartient déjà au groupe `docker`, qui équivaut pratiquement à un accès root.
3. Vérifier que les fichiers d'environnement décrits ci-dessous existent et ont des permissions `0600`. Le workflow actualise la liste Cloudflare avant le déploiement.
4. UFW autorise déjà 22/80/443. Vérifier les règles actives sans les remplacer; le conteneur app n'a aucun port publié. Docker peut contourner UFW pour des ports publiés, donc ne jamais publier le port 3000.

Le sous-domaine `vps-test.lunidex.app` pointe déjà vers le VPS et Caddy y sert HTTPS. La configuration Cloudflare, si le proxy est activé, doit rester en mode TLS **Full (strict)**. La préproduction ne doit jamais utiliser `lunidex.app` ou `www.lunidex.app`.

## Variables et secrets

Les valeurs sensibles sont stockées sur le VPS dans `/opt/lunidex/app.env`, propriété de `lunidex-deploy`, permissions `0600`. Ne pas copier `.env.local`, `.env.production` ni une exportation complète de secrets.

| Emplacement | Variables | Notes |
| --- | --- | --- |
| `/opt/lunidex/.env` (Compose) | `APP_IMAGE_TAG`, `LUNIDEX_DOMAIN`, `LUNIDEX_HOSTNAMES` | SHA de l'image; hôte TLS de santé; hôtes servis par Caddy. Le script de déploiement actuel exige exactement `vps-test.lunidex.app` pour les deux noms. Une future configuration de production nécessitera un changement séparé après autorisation. |
| `/opt/lunidex/app.env` (runtime cible après migration) | `SUPABASE_DATABASE_URL`, `SUPABASE_SECRET_KEY` (prioritaire) ou `SUPABASE_SERVICE_ROLE_KEY` (repli hérité temporaire) | Valeurs serveur Supabase du runtime OVH. Utiliser le pooler partagé en mode session avec TLS vérifié; garder les clés uniquement côté serveur. |
| `/opt/lunidex/app.env` (optionnel) | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | Les erreurs Sentry restent actives sans token de build. `SENTRY_AUTH_TOKEN` est un secret de build distinct, transmis à BuildKit seulement si configuré. |
| `/opt/lunidex/app.env` (optionnel) | `LUNIDEX_CRON_SECRET`, `LUNIDEX_VAPID_PRIVATE_KEY`, `LUNIDEX_VAPID_SUBJECT` | Secrets serveur du runtime web Lunidex. Les anciens noms `CRON_SECRET` / `VAPID_PRIVATE_KEY` restent acceptés pour compatibilité; utiliser les noms `LUNIDEX_*` pour les nouveaux déploiements. Ne pas copier les variables réservées à Supabase Edge Functions. |
| Variables GitHub de l'environnement `ovh-preproduction` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, variables publiques PostHog/Sentry/SEO/VAPID | Valeurs publiques injectées au build; ne jamais y placer une clé privée. Ne configurez pas cet environnement sur le projet Lunidex de production pour un déploiement de préproduction. Les tests hébergés synthétiques prévus par le runbook sont ponctuels et ne constituent pas un environnement de préproduction OVH. |

`NEXT_PUBLIC_*` est incorporé au bundle client pendant `next build`; modifier une telle valeur impose de reconstruire l'image. Les valeurs serveur non préfixées sont lues à l'exécution. Les URL de migration, l'export local et la connexion runtime doivent rester distincts; aucun paramètre Neon historique n'appartient au runtime cible.

Le fichier `/opt/lunidex/.env` de Compose est déjà configuré pour la préproduction avec l'image déployée :

```dotenv
APP_IMAGE_TAG=7efeb008b5b6f4c54db9d0887c8e64753ba15fa0
LUNIDEX_DOMAIN=vps-test.lunidex.app
LUNIDEX_HOSTNAMES=vps-test.lunidex.app
```

Le fichier `/opt/lunidex/app.env` contient la configuration serveur runtime, sans être copié dans Git. Conserver les permissions `0600` sur les deux fichiers; ne jamais ajouter leurs valeurs secrètes à la documentation.

## Cloudflare et Caddy

Le script `scripts/deployment/update-cloudflare-ranges.sh` lit les plages IPv4/IPv6 depuis les points de distribution officiels Cloudflare, vérifie chaque CIDR, puis écrit `cloudflare-ips.env`. Ce fichier ne contient pas de secret. Le workflow de déploiement l'exécute à distance après le transfert des scripts et avant `docker compose config` et chaque déploiement. Pour une actualisation manuelle, l'exécuter depuis `/opt/lunidex`, puis redémarrer Caddy :

```bash
bash scripts/deployment/update-cloudflare-ranges.sh
docker compose config --quiet
docker compose restart caddy
```

Caddy ne fait confiance qu'aux adresses Cloudflare configurées et transmet `X-Forwarded-For` avec l'adresse client vérifiée. Cela évite qu'une requête directe puisse usurper l'adresse utilisée par les limites de débit. Actualiser les plages si Cloudflare les modifie. Le port 80 doit rester accessible pour ACME; le port 443 sert le trafic et les certificats renouvelés sont conservés dans les volumes Caddy.

Aucun cache HTML global n’est configuré devant Caddy. Next.js conserve ses caches locaux; les en-têtes privés et authentifiés restent `private, no-store`. Ne pas créer de règle Cloudflare qui met en cache les pages HTML, méthodes API, cookies, routes de compte ou réponses d'authentification. Ajouter des règles ciblées uniquement après vérification route par route et test des cookies/méthodes.

## CI, GHCR et déploiement préproduction

`.github/workflows/ci.yml` exécute `npm ci`, ESLint, TypeScript, Vitest, le contrôle SEO, le build et le contrôle du package core sur les PR/pushes configurés. `.github/workflows/deploy-ovh.yml` démarre automatiquement sur les pushes de `codex/ovh-vps-migration`; il peut aussi être lancé manuellement avec une case de confirmation. Le job vérifie que la référence est exactement cette branche, relance les contrôles, construit l'image Linux amd64, la publie dans `ghcr.io/teefloo/lunidex:<SHA>` et la déploie sur la cible préproduction. Le script distant refuse tout domaine autre que `vps-test.lunidex.app` dans `LUNIDEX_DOMAIN` et `LUNIDEX_HOSTNAMES`; ce workflow ne déploie jamais `lunidex.app` ni `www.lunidex.app`.

L'environnement GitHub `ovh-preproduction` existe déjà. Il contient la clé SSH dédiée, les variables d'hôte, d'utilisateur et de `known_hosts`, ainsi que les variables publiques de build nécessaires à l'authentification Neon de préproduction. Aucune valeur privée n'est documentée ici.

Pour référence, les paramètres requis sont :

- Variables `OVH_DEPLOY_HOST`, `OVH_DEPLOY_USER=lunidex-deploy` et `OVH_DEPLOY_KNOWN_HOSTS`, déjà définies. L'empreinte SSH du VPS a été vérifiée avant l'enregistrement de `known_hosts`.
- Secret `OVH_DEPLOY_SSH_KEY`, clé dédiée du compte de déploiement, déjà définie. Le job utilise son `GITHUB_TOKEN` temporaire, autorisé `packages: write`, pour publier l'image et s'authentifier au pull GHCR; le package GHCR doit accorder l'accès au dépôt.
- Les variables publiques de build listées ci-dessus, configurées pour la préproduction et la branche Neon de test.
- Secret facultatif `SENTRY_AUTH_TOKEN`, uniquement si les source maps doivent être envoyées à Sentry pendant le build.

Le `GITHUB_TOKEN` GHCR est envoyé sur l'entrée standard de la session SSH, utilisé avec un `DOCKER_CONFIG` temporaire sous `/tmp`, puis supprimé par un trap de sortie. Il n'est ni écrit dans le dépôt ni conservé dans le `~/.docker/config.json` du VPS. Le script `deploy-ovh.sh` n'accepte que des tags SHA de 40 caractères et exige `vps-test.lunidex.app` dans `LUNIDEX_DOMAIN` et `LUNIDEX_HOSTNAMES`. Il teste le healthcheck local, puis HTTPS via Caddy. En cas d'échec après un déploiement existant, il restaure automatiquement l'image précédente. `rollback-ovh.sh` permet de revenir manuellement au SHA enregistré dans `.previous-image-tag`.

Après chaque déploiement préproduction :

```bash
bash /opt/lunidex/scripts/deployment/healthcheck.sh
docker compose ps
docker compose logs --tail=100 app caddy
```

Le healthcheck `/api/healthz` ne vérifie que la disponibilité du processus; il ne se connecte pas à Neon et ne révèle aucune configuration. La validation des fonctionnalités et des droits doit être faite séparément avec l'environnement Neon de test.

## Tâches planifiées

Les unités dans `deploy/systemd/` conservent les horaires UTC : métriques/rétention à `04:17`, synchronisation TCG scellé à `04:47`. Elles sont déjà installées sur le VPS, mais les deux timers restent désactivés. Le service est un `oneshot`, a un délai maximum de 10 minutes, attend au plus 5 minutes le verrou commun `flock`, et appelle les routes avec un bearer secret lu dans l'environnement du conteneur. Les logs vont dans journald; les secrets et corps complets de réponse ne sont pas écrits.

Les commandes d'installation déjà exécutées sont conservées ici pour référence :

```bash
sudo install -m 0755 scripts/deployment/run-cron.sh /usr/local/bin/lunidex-cron
sudo install -m 0644 deploy/systemd/lunidex-cron@.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/lunidex-cron@metrics-retention.timer /etc/systemd/system/
sudo install -m 0644 deploy/systemd/lunidex-cron@tcg-sealed-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

**Les deux timers de production restent désactivés.** Leur activation demande une approbation distincte après vérification des secrets, de la base Neon main, de l’absence de timers préproduction actifs et d’un plan de démarrage sans rattrapage dangereux. Vérifier qu’aucun autre scheduler n’appelle ces routes avant toute activation. `Persistent=true` rattrape une exécution manquée au redémarrage; le verrou commun évite que les deux tâches de rattrapage écrivent simultanément.

Contrôler les unités avec :

```bash
systemctl list-timers 'lunidex-cron*'
journalctl -u 'lunidex-cron@metrics-retention.service' --since today
journalctl -u 'lunidex-cron@tcg-sealed-sync.service' --since today
```

Une exécution manuelle n'est permise que sur une branche Neon isolée : `sudo systemctl start lunidex-cron@metrics-retention.service` ou `sudo systemctl start lunidex-cron@tcg-sealed-sync.service`.

## Logs, surveillance et limites du VPS

- Docker applique une rotation `json-file` limitée : app 3 × 10 Mio, Caddy 3 × 5 Mio. Voir `docker compose logs -f app` et `docker compose logs --since=1h caddy`.
- Journald est déjà limité à 250 Mio. Vérifier cette configuration périodiquement avec `journalctl --disk-usage`.
- Vérifier régulièrement `df -h`, `free -h`, `uptime`, `docker system df` et `docker stats --no-stream`. Conserver l'image courante et la précédente; ne supprimer les autres SHA GHCR/locales qu'après une validation réussie et un contrôle de l'espace.
- Le build est exclusivement dans GitHub Actions. Si une image échoue au démarrage, inspecter `docker compose logs app`, conserver l'image précédente et utiliser `bash scripts/deployment/rollback-ovh.sh`.
- Caddy et l'application redémarrent avec `unless-stopped`. Aucun Redis, Kubernetes ou service PostgreSQL n'est ajouté.

## Sauvegardes et restauration

Les collections locales des utilisateurs restent dans leur navigateur; les espaces synchronisés restent dans Neon. Il n'y a pas de base utilisateur sur le VPS. Vérifier dans Neon la politique de sauvegarde existante et réaliser un exercice de restauration vers une branche de test avant la bascule. Aucun accès aux sauvegardes Neon ni restauration n'a été réalisé dans le cadre de cette préparation.

Les certificats Caddy et sa configuration ACME méritent une copie hors du volume Docker. Après création de `/var/backups/lunidex` avec permissions minimales :

```bash
docker run --rm -v lunidex-caddy-data:/source:ro -v /var/backups/lunidex:/backup alpine:3.22 \
  tar -czf /backup/caddy-data-$(date -u +%F).tar.gz -C /source .
docker run --rm -v lunidex-caddy-config:/source:ro -v /var/backups/lunidex:/backup alpine:3.22 \
  tar -czf /backup/caddy-config-$(date -u +%F).tar.gz -C /source .
```

Tester la restauration périodiquement sur un volume distinct et un nom préproduction; ne pas écraser les données Caddy en production sans arrêt planifié. Le cache Next.js peut être recréé et n'a pas besoin d'une sauvegarde.

## Bascule DNS et retour arrière

Pour toute modification DNS future, inventorier les enregistrements A/AAAA, `www`, MX et TXT et préserver les enregistrements de messagerie et les sous-domaines tiers. Les domaines principaux servent maintenant depuis OVH avec HTTPS public. Vérifier après un changement les sessions Neon, langues, SEO, PWA, e-mails, notifications, permissions et les ressources du VPS.

Le retour applicatif s’effectue en gardant les DNS sur OVH et en restaurant la dernière image OVH connue comme saine avec `rollback-production.sh`. Vérifier ensuite le healthcheck, les sessions Neon et Caddy. Le changement DNS vers un ancien fournisseur ne constitue pas un rollback opérationnel. Les timers cron restent séparément désactivés pendant le diagnostic.

## Accès Codex/Hermes

Utiliser uniquement un compte SSH dédié et une clé différente de la clé personnelle et de la clé GitHub Actions. La clé privée doit être fournie au terminal Codex/Hermes via son gestionnaire de secrets ou agent SSH autorisé; ne pas la stocker dans ce dépôt ni dans `app.env`. Les droits Docker du compte sont root-equivalents. Pour une session temporaire, retirer ensuite la clé `authorized_keys` et vérifier qu'une autre session d'administration fonctionne avant tout changement de SSH.
