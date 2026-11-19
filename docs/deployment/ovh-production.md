# Préparation de la production OVH

## État et garde-fous

- **État opérationnel du 18 novembre 2026 :** la production Lunidex tourne sur OVHcloud; les DNS de `lunidex.app` et `www.lunidex.app` pointent vers le VPS et Caddy sert le HTTPS public. Le runtime production, son image et son rollback sont distincts de la préproduction. Les timers cron restent désactivés; la branche Neon `ovh-preproduction` est conservée.
- Le rollback OVH a été exercé en préflight privé avec la baseline `ace4b8e`; l'image précédente a été rétablie sans changement DNS public ni écriture de données applicatives Neon.
- Le workflow .github/workflows/deploy-ovh-production.yml est uniquement manuel et ne démarre que depuis master avec le SHA complet courant, la confirmation explicite et l'approbation de l'environnement ovh-production.
- Une première exécution en preflight, le 18 novembre 2026 sur le SHA 693d7f196c5cb6259c01c7a9d47453e203020441, a construit et publié les images candidate et baseline ace4b8e, puis s'est arrêtée avant le transfert : lunidex-deploy ne pouvait pas créer directement /opt/lunidex-production. Aucun conteneur de production n'a été lancé et aucune connexion à Neon ni modification DNS/Caddy/cron n'a eu lieu. Le workflow prépare maintenant uniquement les répertoires attendus via Docker, avec /opt comme seul volume monté, sans écraser les chemins existants ni changement récursif de propriétaire; il échoue si un chemin existe avec un propriétaire inattendu.
- Le preflight #44212986434 a ensuite réussi le bootstrap et les transferts des fichiers de déploiement, puis échoué sur le transfert du fichier d'environnement (`app.env`) : ce `scp` omettait la clé SSH dédiée, provoquant `Too many authentication failures`. Le fichier d'environnement n'a donc pas été transféré, le script de déploiement n'a pas été lancé, aucune application de production n'a démarré et aucune connexion ou écriture Neon n'a eu lieu. Aucun changement DNS, Caddy ou cron n'a été effectué. La commande `scp` utilise maintenant les mêmes options SSH explicites que les autres transferts.
- Le preflight #44216008854 a démarré le candidat, dont le healthcheck Docker était `healthy`; la lecture du JWKS Neon Auth a réussi. Le contrôle SQL a ensuite échoué avant toute requête, car `node -e` ne résolvait pas `@neondatabase/serverless` depuis la racine de l'image standalone. Le script a automatiquement restauré l'image `ace4b8e` puis arrêté l'application en mode preflight. Les contrôles HTTP/Caddy et la répétition du rollback n'ont pas été atteints; aucune instruction SQL n'a été exécutée et aucune donnée Neon n'a été écrite. Le Dockerfile copie maintenant le seul point d'entrée ESM du paquet dans `node_modules` à la racine de l'image pour le contrôle Node autonome. Le contrôle utilise `SELECT 1 as ok` dans une transaction explicitement `READ ONLY`, avec une limite de 10 secondes; il ne lit aucune table et n'écrit aucune donnée.
- Il est limité à master, exige le SHA complet actuellement sélectionné et la phrase DEPLOY_OVH_PRODUCTION, puis attend l'approbation de l'environnement GitHub protégé ovh-production.
- Le workflow produit deux images immuables : le candidat sélectionné et une image de rollback basée sur le commit de référence ace4b8eb76e5992c935cfc01120377d17297733d.
- Le premier fichier .env du VPS est initialisé sur ce tag de rollback. Si le candidat échoue, le script tente de restaurer cette image. Ce filet de sécurité n'existe qu'après que le workflow a réussi à construire et publier l'image baseline.
- La baseline reprend le code de ce commit et ajoute dans l'image un endpoint /api/healthz sans données, requis par le healthcheck Compose actuel. Son Dockerfile de secours utilise next start, car ce commit ne produit pas la sortie standalone attendue par le Dockerfile courant.
- Le mode preflight journalise uptime/load, free -h, df -h / /opt et docker stats sans lire l'environnement du conteneur, d'abord avec le candidat en marche puis après les sondes. Il vérifie les contrôles à travers le Caddy local en TLS interne, puis arrête le candidat et restaure le tag antérieur. Après ce succès, le workflow capture APP_IMAGE_TAG, démarre le candidat sans route Caddy ni port hôte, uniquement pour le healthcheck privé, puis appelle rollback-production.sh avec la baseline ace4b8eb76e5992c935cfc01120377d17297733d et vérifie la baseline. Les deux images passent le healthcheck du conteneur, la lecture du JWKS Neon Auth et SELECT 1. Le trap arrête toujours l'application et restaure atomiquement le tag capturé, y compris en cas d'échec ou de signal. Aucune route publique, DNS, tâche cron ou donnée applicative n'est modifiée par cette répétition.
- Le mode deploy garde l'application candidate en exécution, toujours sans port public. Il refuse le démarrage si le conteneur de préproduction tourne encore.
- compose.production.yaml est un projet distinct, son cache et son conteneur sont isolés, et son seul service app n'expose aucun port à l'hôte. Après les OOM V8 observés le 19 novembre, son heap V8 est porté à 1 408 Mio et sa limite mémoire à 2 176 Mio; le plafond CPU reste à 1 cœur. Avec Caddy plafonné à 256 Mio, les plafonds combinés app+Caddy sont de 2 432 Mio, ce qui laisse environ 1,3 Gio des 3,7 Gio utilisables au système et aux autres processus. Cette marge est une mitigation de capacité, pas une correction de la cause des OOM; ne pas faire tourner l'app de préproduction ou les cron en parallèle.
- Le script de préparation Caddy préserve le fichier de préproduction dans /opt/lunidex-production/Caddyfile.before-production; le routage public n'est installé qu'après une invocation manuelle avec le texte de confirmation prévu par le script.
- Les timers de production ne sont ni installés ni activés par le workflow. Persistent=false évite le rattrapage après un arrêt; les deux jobs partagent /run/lunidex-cron/shared.lock, et un conflit fait ignorer le démarrage plutôt que lancer une seconde exécution.

Le rollback applicatif OVH est vérifié : il restaure l’image précédente sur le même VPS. Garder les DNS sur OVH pendant le diagnostic; la restauration DNS vers un ancien hébergement n’est pas un rollback fonctionnel.

## Configuration GitHub et état actuel

Les réglages suivants sont déjà présents dans l'environnement GitHub ovh-production. Aucune valeur de préproduction n'est utilisée.

Variables d'environnement GitHub :

- NEXT_PUBLIC_NEON_AUTH_URL
- OVH_PRODUCTION_DEPLOY_HOST, OVH_PRODUCTION_DEPLOY_USER, OVH_PRODUCTION_DEPLOY_KNOWN_HOSTS

Secrets de l'environnement GitHub déjà configurés :

- NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL, NEON_AUTH_COOKIE_SECRET.
- LUNIDEX_CRON_SECRET.
- OVH_PRODUCTION_DEPLOY_SSH_KEY — clé dédiée configurée dans ovh-production; sa clé publique est installée dans /home/lunidex-deploy/.ssh/authorized_keys.

NEON_DATABASE_URL est configuré dans l'environnement GitHub ovh-production avec la connexion Neon main. Le rôle runtime est créé; le GRANT EXECUTE sur analytics.increment_daily_metric a réussi et has_function_privilege confirme l'accès à cette fonction. Une vérification SELECT 1 en lecture seule a réussi. Aucun enregistrement de données applicatives de Neon main n'a été lu ou écrit.

Les paramètres Resend du formulaire de contact (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL` et `CONTACT_TO_EMAIL`) sont configurés dans l’environnement protégé `ovh-production`. Le formulaire peut envoyer les messages via Resend. Les secrets Sentry côté serveur et VAPID restent facultatifs; leurs fonctionnalités ne sont disponibles que si les secrets correspondants sont configurés. Aucune valeur secrète n’est documentée ici.

Les noms runtime suivent `.env.example` : utiliser `NEON_DATABASE_URL` avec Neon `main` en production, jamais une URL de préproduction.

NEON_AUTH_JWT_ISSUER et NEON_AUTH_JWT_AUDIENCE restent facultatifs et ne sont pas requis ni inventés dans ce workflow. Sans valeurs exactes vérifiées par Neon, l'authentification par Bearer token demeure désactivée; les sessions cookie sont revalidées auprès de NEON_AUTH_BASE_URL.

## Préflight privé

Le préflight valide :

- le healthcheck HTTP local et la disponibilité de l'endpoint JWKS;
- la connectivité Neon avec uniquement SELECT 1 (lecture sans écriture de test); cette vérification a déjà réussi pour le rôle runtime configuré, sans lecture ni écriture de données applicatives;
- les routes de contenu, SEO et PWA, dont robots.txt, sitemap.xml, manifest.webmanifest et sw.js;
- les réponses non authentifiées des routes de profil et des deux API cron;
- /api/auth/get-session sans cookie fourni, qui doit répondre HTTP 200, avec le type application/json et le corps JSON null;
- les en-têtes de sécurité.

Ce contrôle vérifie uniquement l’état anonyme et le proxy de session; il ne simule pas une connexion utilisateur. Le test utilise une connexion TLS interne avec curl --insecure; il valide le routage HTTPS et le handshake, pas encore la chaîne de confiance publique. Le certificat public Let's Encrypt ne peut être validé qu'après que le DNS du domaine pointe vers OVH et que Caddy l'a obtenu.

Le workflow construit le client avec les variables publiques de l'environnement de production. Les secrets serveur sont transférés dans app.env en mode 0600; ils ne sont pas inscrits dans l'image.

## Audit mémoire et ordre d'activation

Avant le mode deploy, lancer le workflow .github/workflows/deploy-ovh.yml depuis la branche de migration avec l'entrée inspect_read_only_resources activée et confirm_deployment désactivée. Son job séparé affiche RAM, swap, espace disque, charge hôte, statistiques de conteneurs et état des timers sans lire app.env ni modifier les services. Le workflow autonome .github/workflows/audit-ovh-resources.yml fournit aussi cette inspection.

Le VPS n'a que 4 Gio. Le mode préflight vérifie qu'il reste au moins 1,5 Gio de RAM disponible et 2 Gio de disque, puis arrête son conteneur. Le mode deploy conserve aussi le seuil de 1,5 Gio lorsque le conteneur de production ne tourne pas encore. Si une application de production est déjà en cours, il saute uniquement ce contrôle de RAM : Docker Compose arrête puis remplace l'instance par le candidat avec `up -d --no-deps app`, sans garder durablement deux applications de production en mémoire. Ce remplacement séquentiel peut créer une courte interruption. Si le candidat échoue au contrôle de santé, le trap de déploiement restaure le tag précédent et relance l'ancienne image avec le même remplacement séquentiel. Le contrôle de 2 Gio d'espace disque reste requis dans les deux modes. L'application de préproduction doit toujours être arrêtée avant tout déploiement durable de production; le script bloque deploy si `lunidex-app` fonctionne encore. La branche Neon ovh-preproduction reste intacte. Après le remplacement du Caddyfile par le routage production, `vps-test.lunidex.app` ne sera plus desservi par la préproduction. Il pourra être rétabli plus tard en redémarrant séparément l'application préproduction et en restaurant son routage, uniquement pendant une fenêtre où les ressources permettent cette instance supplémentaire.

Les timers ne peuvent être activés que séparément, par l'administrateur OVH connecté comme ubuntu avec sudo, après vérification qu’aucun scheduler externe n’appelle les mêmes tâches et désactivation des timers préproduction. Le compte lunidex-deploy n'a pas de privilège sudo. Depuis une session administrateur :

1. vérifier qu’aucun autre scheduler n’appelle les routes, puis créer le marqueur avec `sudo touch /opt/lunidex-production/LEGACY_SCHEDULES_DISABLED`;
2. lancer sudo bash /opt/lunidex-production/scripts/deployment/enable-production-crons.sh ENABLE_PRODUCTION_CRONS;
3. vérifier l'état des timers avec sudo systemctl list-timers --all.

Le script crée ENABLE_PRODUCTION_CRONS avec le propriétaire lunidex-deploy et le mode 0600, afin que les unités systemd puissent le lire. Le workflow ne crée aucun marqueur et n'appelle jamais ces scripts. Pour arrêter les timers et retirer le marqueur : sudo bash /opt/lunidex-production/scripts/deployment/disable-production-crons.sh.

## Contrôles post-bascule et retour arrière

La bascule est effectuée : les DNS de `lunidex.app` et `www.lunidex.app` pointent vers le VPS OVH, et Caddy sert le HTTPS public. Pour le contrôle post-bascule, vérifier la résolution des deux noms, les certificats, `/api/healthz`, les routes localisées, les API, l’Auth, les fichiers SEO/PWA, le formulaire de contact et les ressources du VPS. Les timers cron de production restent désactivés jusqu’à une validation opérationnelle distincte.

Le script `activate-production-route.sh` sert uniquement à réparer ou rétablir le routage Caddy. Il exige une confirmation explicite et vérifie la résolution DNS avant de charger la configuration.

Pour un défaut applicatif, garder les DNS sur OVH et exécuter `bash /opt/lunidex-production/scripts/deployment/rollback-production.sh`. Il restaure le tag image précédent, initialisé sur la baseline `ace4b8eb76e5992c935cfc01120377d17297733d`. Le rollback concerne l’image de production et ne redémarre pas la préproduction. Une restauration DNS vers un autre hébergement n’est pas un rollback fonctionnel.
