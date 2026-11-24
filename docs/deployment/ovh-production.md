# Déploiement de production Lunidex sur OVH

## État actuel

- Production reste sur `d0f5e1af2cf95dd43eb046069c0d37f0a2add93e`. L'audit T+48 le plus récent rapportait 0 redémarrage et 0 OOM, avec RSS Node stable sur les dernières 25 heures. Il a aussi compté `memory.events:max=1315` : cela signale une pression à la limite cgroup, même sans OOM. Les limites Docker ne sont pas augmentées.
- HTTPS public fonctionne. Neon Auth renvoie toujours HTTP 402 `GENERIC_QUOTA_EXCEEDED`; les fonctions de compte restent indisponibles tant que Neon n'a pas rétabli le service. Cet état ne prouve pas un crash de Node.
- Les tâches cron applicatives restent désactivées. Aucun déploiement, changement DNS, accès Neon ou préflight OVH n'est exécuté par cette PR.
- **Verdict de mise en production : NO-GO fonctionnel tant que Neon Auth répond 402.** L'image actuelle demeure en place. Une sonde Auth anonyme confirme seulement l'accessibilité du endpoint, pas une session authentifiée.

## Images immuables vérifiées

L'image de rollback existe sur GHCR et n'est pas reconstruite par le workflow. Les métadonnées vérifiées sont :

- Révision : `d0f5e1af2cf95dd43eb046069c0d37f0a2add93e`.
- Référence exacte pour le VPS `linux/amd64` : `ghcr.io/teefloo/lunidex@sha256:9ca8f66d0b5f79a984358d12fe1c382319df7364388ec2d5df78fe3c5afc318a`.
- Digest de l'index multi-plateforme du tag SHA : `sha256:8f1645b3cd4f371fef8ac47cc0ee2682b0f94412a4229552069f3c8cf5ffc454`.
- Digest de configuration amd64 : `sha256:97224cef46f56dbc071ddb896d06a61a79785851087f82ac1711a9f520543a7a`.
- Contrat Compose confirmé : `linux/amd64`, utilisateur `nextjs`, dossier `/app`, commande `node server.js`; la configuration garde la limite existante de 2176 Mio et le CPU limité à un cœur.

La candidate de ce futur changement n'a pas encore été construite ou publiée : son digest sera généré au build, testé, puis consigné dans le résumé et les sorties GitHub Actions. Aucun digest candidate n'est inventé dans ce document. Compose, le déploiement et le rollback consomment des références `ghcr.io/teefloo/lunidex@sha256:…`, jamais un tag mutable.

## Préflight isolé et workflow

`.github/workflows/deploy-ovh-production.yml` reste manuel, limité à `master`, au SHA complet actuellement sélectionné, à la confirmation `DEPLOY_OVH_PRODUCTION` et à l'environnement GitHub protégé `ovh-production`.

Le job construit la candidate sur le runner GitHub, publie un tag de traçabilité unique, lit le digest du manifeste Buildx, puis utilise uniquement la référence par digest. Il tire et valide d0f5 par son digest existant; il ne construit jamais l'ancienne image avec `Dockerfile.rollback-baseline`. Les deux images sont contrôlées sans réseau dans des conteneurs jetables. Le contrôle vérifie le label de révision, l'architecture, l'utilisateur, la commande, le rendu Compose et le endpoint local `/api/healthz`.

En mode `preflight`, les étapes autorisées s'arrêtent sur le runner GitHub : aucune clé SSH n'est configurée, aucune commande SSH/SCP n'est lancée, aucun fichier `app.env` n'est créé ou envoyé, aucun conteneur, Caddy, DNS ou service VPS n'est consulté ou modifié. `deploy-production.sh` et l'ancien script `preflight-production.sh` refusent aussi le mode preflight côté VPS.

En mode `deploy`, les étapes distantes sont explicitement conditionnées au choix `deploy`. Le workflow ne rebâtit pas la candidate, utilise son digest Buildx exact, contrôle son label de révision, arrête la préproduction avant le démarrage durable si nécessaire, et conserve l'image d0f5 pour le rollback. La santé Docker et `/api/healthz` mesurent l'application. Le contrôle Neon Auth est séparé et un HTTP 402 donne un verdict de disponibilité fonctionnelle NO-GO sans transformer ce résultat en panne Node ni déclencher un rollback applicatif.

## Procédure future

Après restauration de Neon Auth et revue/approbation de la PR :

1. Relire le SHA exact de `master` et les contrôles CI verts.
2. Vérifier qu'un snapshot Neon exploitable existe selon la procédure de sauvegarde approuvée. Le déploiement ne doit pas exécuter de migration ni écrire dans Neon.
3. Dans Actions → `Deploy OVH production`, sélectionner ce SHA exact, saisir `DEPLOY_OVH_PRODUCTION`, et choisir `deploy`. N'utiliser `preflight` que pour la validation GitHub isolée; elle ne teste pas le VPS.
4. Relire dans le résumé Actions le SHA source, le digest candidate, la plateforme amd64 et le digest d0f5. Refuser le déploiement si la candidate ne passe pas l'image smoke test ou si Neon Auth renvoie encore 402.
5. Laisser le job remplacer l'app sur place sans lancer deux processus Node lourds en parallèle. Le remplacement peut créer une courte interruption. Ne pas démarrer la préproduction ou les cron applicatifs pendant cette fenêtre.
6. Vérifier séparément le conteneur/`/api/healthz`, les pages HTTPS essentielles, les codes HTTP/API, Neon Auth et les ressources mémoire. Un 402 Neon est un incident fonctionnel distinct; il ne doit pas être présenté comme un OOM ou une panne du processus.

Rollback autorisé uniquement en cas de régression applicative ou d'échec de santé :

```bash
bash /opt/lunidex-production/scripts/deployment/rollback-production.sh
```

Le script refuse toute autre référence et restaure `ghcr.io/teefloo/lunidex@sha256:9ca8f66d0b5f79a984358d12fe1c382319df7364388ec2d5df78fe3c5afc318a` (d0f5). Cette image est le dernier état OVH connu stable, mais le rollback n'est pas une correction d'un défaut introduit après d0f5. Les déclencheurs de rollback sont un conteneur unhealthy, un échec répété de `/api/healthz`, une régression grave sur les pages/API ou un nouvel OOM/redémarrage. Une panne Neon/Auth seule ne provoque pas un rollback de Node; elle conserve un NO-GO fonctionnel séparé.

## Surveillance mémoire après le prochain déploiement

Il n'existe plus de schedule temporaire pour ces audits. Déclencher manuellement le workflow `Audit OVH VPS resources` en lecture seule aux échéances suivantes, avec le SHA et le digest déployés dans le rapport :

| Échéance | Contrôles |
| --- | --- |
| T+15 min | Premier démarrage, `RestartCount`, OOM, `memory.events`, `memory.current/max/peak`, RSS Node, heap V8 numérique si diagnostic borné activé, CPU, RAM hôte, disque, endpoint local et HTTPS. |
| T+1 h | Comparaison au relevé T+15 min; vérifier la stabilisation après le démarrage et les erreurs V8/5xx. |
| T+6 h | Tendance de RSS, `anon`, `file`, `inactive_file`, `slab`, `memory.current - inactive_file`, événements cgroup et RAM hôte. Le reste cgroup ne représente pas le heap. |
| T+24 h | Confirmer la pente sur une journée, l'absence d'OOM/redémarrages et la disponibilité HTTPS; consigner Neon Auth séparément. |
| T+48 h | Verdict mémoire final et comparaison au d0f5/T+15 min, sans assimiler une croissance RSS ou le cache fichiers à une fuite JavaScript. |

**Rollback immédiat / NO-GO mémoire** si `RestartCount`, `oom` ou `oom_kill` augmente, si Docker devient unhealthy, si le endpoint local cesse de répondre, ou si la mémoire cgroup reste au-dessus de 90 % de `memory.max` et continue de monter. Une hausse de `memory.events:max` seule indique une pression et appelle une vérification rapprochée; elle ne démontre pas à elle seule un OOM V8. En cas de pression, comparer les pages anonymes et le cache récupérable, préserver les compteurs et journaux, puis diagnostiquer avant tout changement de limites. Ne pas forcer le GC, prendre un heap snapshot ou redémarrer pour un diagnostic sans autorisation.

À chaque point, rapporter séparément : santé conteneur/Node, disponibilité HTTPS, disponibilité Neon Auth, redémarrages et `OOMKilled`, RAM cgroup/hôte, RSS, heap V8 lorsqu'il est mesuré, CPU, stockage et erreurs HTTP 5xx. Une requête Auth anonyme HTTP 200 prouve uniquement la joignabilité du proxy; elle ne valide pas une connexion authentifiée.
