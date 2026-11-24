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

`.github/workflows/deploy-ovh-production.yml` conserve son déclenchement manuel, limité à `master`, au SHA complet sélectionné et à la confirmation `DEPLOY_OVH_PRODUCTION`. Il accepte aussi le résultat `workflow_run` du workflow `CI`, uniquement pour une exécution réussie issue d'un événement `push` sur `master`. Le chemin automatique est ignoré tant que la variable de dépôt `AUTO_DEPLOY_ENABLED` n'a pas exactement la valeur `true`; l'absence de cette variable équivaut à `false`. Cette PR ne crée ni ne modifie cette variable.

Le job construit la candidate sur le runner GitHub, publie un tag de traçabilité unique, lit le digest du manifeste Buildx, puis utilise uniquement la référence par digest. Il tire et valide d0f5 par son digest existant; il ne construit jamais l'ancienne image avec `Dockerfile.rollback-baseline`. Les deux images sont contrôlées sans réseau dans des conteneurs jetables. Le contrôle vérifie le label de révision, l'architecture, l'utilisateur, la commande, le rendu Compose et le endpoint local `/api/healthz`.

En mode `preflight`, les étapes autorisées s'arrêtent sur le runner GitHub : aucune clé SSH n'est configurée, aucune commande SSH/SCP n'est lancée, aucun fichier `app.env` n'est créé ou envoyé, aucun conteneur, Caddy, DNS ou service VPS n'est consulté ou modifié. `deploy-production.sh` et l'ancien script `preflight-production.sh` refusent aussi le mode preflight côté VPS.

En mode manuel `deploy`, les étapes distantes restent conditionnées au choix `deploy` et à la confirmation existante. Le chemin automatique construit une image neuve `linux/amd64` depuis `workflow_run.head_sha`, la publie sur GHCR, puis utilise uniquement son digest. Les deux chemins partagent le même job, les validations d'image, la garde Neon Auth, les protections mémoire et le déploiement OVH. Le SHA source est comparé à `master` avant le build, avant chaque phase distante et juste avant le déploiement; un run devenu obsolète s'arrête sans remplacer la version courante. Les chemins manuel et automatique utilisent le même groupe de concurrence `lunidex-ovh-production`, avec annulation désactivée.

Le déploiement essaie de revenir à l'image immuable précédente uniquement si elle correspond au conteneur qui était sain avant le remplacement; sinon il prend d0f5 comme secours. Si le script de déploiement réussit mais qu'un contrôle de santé ultérieur échoue, le workflow appelle `rollback-production.sh --last-stable`, qui tente cette même image précédente puis d0f5. Le rollback manuel sans argument reste strictement épinglé à d0f5. L'image d0f5 n'est jamais supprimée. Après le healthcheck local, deux sondes anonymes HTTPS vérifient `/api/healthz` et `/en`; elles détectent les pannes de disponibilité de base, mais ne remplacent pas des tests métier authentifiés et ne garantissent pas la détection de toutes les régressions applicatives.

Le contrôle Neon Auth s'exécute avant la première connexion SSH et un HTTP 402 bloque le déploiement. Après le déploiement, l'état Neon reste séparé des verdicts Node/HTTPS; un problème Auth seul ne déclenche pas le rollback applicatif.

### Réglages GitHub requis avant activation

L'automatisation est désactivée par défaut. Après restauration de Neon Auth et validation d'un premier déploiement stable, l'activation se fera séparément dans **Repository → Settings → Secrets and variables → Actions → Variables** : créer `AUTO_DEPLOY_ENABLED` avec la valeur exacte `true`. Pour suspendre les nouveaux runs, supprimer la variable ou remplacer sa valeur par `false`. Cela ne stoppe pas un déploiement déjà en cours; pour une suspension immédiate, désactiver la variable **et annuler explicitement le run actif** dans Actions. Ne pas utiliser un secret pour cette option.

Les runs manuels et automatiques partagent `lunidex-ovh-production`. GitHub n'en exécute qu'un à la fois; sans annulation du run actif, une seule exécution reste en attente et une exécution plus récente remplace l'attente plus ancienne. Les contrôles de SHA courante bloquent aussi un run devenu périmé.

Protéger `master` dans **Settings → Rules → Rulesets** (ou Branch protection rules) avec au minimum :

- exiger une Pull Request et au moins une approbation;
- exiger le contrôle CI complet (`ci`) avant fusion;
- exiger la résolution des conversations et, si disponible, invalider les approbations après nouveaux commits;
- interdire les force-push et la suppression de branche.

Restreindre l'environnement **Settings → Environments → `ovh-production`** aux déploiements depuis `master` et conserver les secrets/variables de production dans cet environnement. Les **Required reviewers** mettent en pause chaque run automatique jusqu'à approbation. Garder cette protection pendant le rétablissement de Neon Auth et le premier déploiement stable; pour un fonctionnement réellement sans intervention humaine, un administrateur devra ensuite retirer ces reviewers requis. Les protections de branche, le contrôle Neon avant SSH, les garde-fous de SHA, l'option désactivée par défaut et le rollback restent en place. Cette PR ne modifie aucune variable, aucun reviewer et aucun secret.

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

Sans argument, le rollback manuel restaure uniquement `ghcr.io/teefloo/lunidex@sha256:9ca8f66d0b5f79a984358d12fe1c382319df7364388ec2d5df78fe3c5afc318a` (d0f5). Le workflow peut appeler `rollback-production.sh --last-stable` après l'échec d'un contrôle HTTPS post-déploiement : cette option interne tente le digest précédent consigné, puis d0f5 si le précédent ne démarre pas ou échoue au healthcheck. Les deux sont des références GHCR immuables. d0f5 est le dernier état OVH connu stable, mais le rollback n'est pas une correction d'un défaut introduit après d0f5. Les déclencheurs de rollback sont un conteneur unhealthy, un échec de `/api/healthz` ou des deux sondes publiques de base, ou un nouvel OOM/redémarrage. Une panne Neon/Auth seule ne provoque pas un rollback de Node; elle conserve un NO-GO fonctionnel séparé.

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
