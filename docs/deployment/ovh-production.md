# Préparation de la production OVH

## État et garde-fous

- Le workflow .github/workflows/deploy-ovh-production.yml est uniquement manuel et n'a pas été lancé.
- Il est limité à master, exige le SHA complet actuellement sélectionné et la phrase DEPLOY_OVH_PRODUCTION, puis attend l'approbation de l'environnement GitHub protégé ovh-production.
- Le workflow produit deux images immuables : le candidat sélectionné et une image de rollback basée sur le dernier commit connu de production Vercel, ace4b8eb76e5992c935cfc01120377d17297733d.
- Le premier fichier .env du VPS est initialisé sur ce tag de rollback. Si le candidat échoue, le script tente de restaurer cette image. Ce filet de sécurité n'existe qu'après que le workflow a réussi à construire et publier l'image baseline.
- La baseline reprend le code de ce commit et ajoute dans l'image un endpoint /api/healthz sans données, requis par le healthcheck Compose actuel. Son Dockerfile de secours utilise next start, car ce commit ne produit pas la sortie standalone attendue par le Dockerfile courant.
- Le mode preflight lance brièvement l'image candidate, vérifie les contrôles ci-dessous à travers le Caddy local en TLS interne, puis arrête le conteneur et restaure le tag d'image précédent. Il ne change ni Caddy de façon persistante ni le DNS.
- Le mode deploy garde l'application candidate en exécution, toujours sans port public. Il refuse le démarrage si le conteneur de préproduction tourne encore.
- compose.production.yaml est un projet distinct, son cache et son conteneur sont isolés, et son seul service app n'expose aucun port à l'hôte. La limite est de 1 280 Mio et 1 CPU. Le Caddy existant reste plafonné à 256 Mio.
- Le script de préparation Caddy préserve le fichier de préproduction dans /opt/lunidex-production/Caddyfile.before-production; le routage public n'est installé qu'après une invocation manuelle avec le texte de confirmation prévu par le script.
- Les timers de production ne sont ni installés ni activés par le workflow. Persistent=false évite le rattrapage après un arrêt; les deux jobs partagent /run/lunidex-cron/shared.lock, et un conflit fait ignorer le démarrage plutôt que lancer une seconde exécution.

Le premier rollback applicatif sur OVH est donc défini, mais il n'a pas encore été exercé et dépend de la publication préalable de l'image baseline. Revenir aux DNS Vercel ne constitue pas un rollback fonctionnel tant que le déploiement Vercel reste désactivé.

## Configuration GitHub requise

L'environnement ovh-production doit contenir les éléments suivants avant tout lancement. Ne recopier que les valeurs de production vérifiées; aucune valeur de préproduction ne doit y être placée.

Variables d'environnement GitHub :

- NEXT_PUBLIC_NEON_AUTH_URL
- NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, NEXT_PUBLIC_POSTHOG_HOST, NEXT_PUBLIC_POSTHOG_ENABLED, NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE (selon les services activés)
- NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_GOOGLE_VERIFICATION, NEXT_PUBLIC_VAPID_PUBLIC_KEY (facultatifs)
- OVH_PRODUCTION_DEPLOY_HOST, OVH_PRODUCTION_DEPLOY_USER, OVH_PRODUCTION_DEPLOY_KNOWN_HOSTS
- OVH_PRODUCTION_DEPLOY_PUBLIC_KEY dans ovh-preproduction pour le bootstrap; conserver également la valeur publique dans ovh-production
- LUNIDEX_VAPID_SUBJECT, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL (facultatifs)

Secrets de l'environnement GitHub :

- NEON_DATABASE_URL — connexion de production Neon main, jamais une URL de préproduction.
- NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL, NEON_AUTH_COOKIE_SECRET.
- LUNIDEX_CRON_SECRET.
- OVH_PRODUCTION_DEPLOY_SSH_KEY — clé privée distincte, correspondant à la variable publique et autorisée sur le VPS.
- SENTRY_AUTH_TOKEN, LUNIDEX_VAPID_PRIVATE_KEY, RESEND_API_KEY (facultatifs).

Le dépôt n'a pas de clé privée SSH de production configurée. Le workflow de production ne réutilise pas le secret OVH_DEPLOY_SSH_KEY de l'environnement ovh-preproduction. Un job manuel séparé dans le workflow de préproduction peut ajouter la variable publique à /home/lunidex-deploy/.ssh/authorized_keys sur le VPS attendu, sans redémarrer l'application. Il ne s'exécute que sur la branche de migration avec son entrée booléenne dédiée et vérifie l'hôte, le compte, le type Ed25519 et le chemin avant l'ajout idempotent. Il faudra ensuite ajouter la clé privée correspondante dans le secret OVH_PRODUCTION_DEPLOY_SSH_KEY.

Les noms runtime suivent .env.example : l'application utilise NEON_DATABASE_URL, même si la console Vercel peut afficher une variable gérée DATABASE_URL. Vérifier la valeur de connexion de main avant de la saisir dans le secret portant le nom runtime attendu.

NEON_AUTH_JWT_ISSUER et NEON_AUTH_JWT_AUDIENCE restent facultatifs et ne sont pas requis ni inventés dans ce workflow. Sans valeurs exactes vérifiées par Neon, l'authentification par Bearer token demeure désactivée; les sessions cookie sont revalidées auprès de NEON_AUTH_BASE_URL.

## Préflight privé

Le préflight valide :

- le healthcheck HTTP local et la disponibilité de l'endpoint JWKS;
- la connectivité Neon avec uniquement SELECT 1 (lecture sans écriture de test);
- les routes de contenu, SEO et PWA, dont robots.txt, sitemap.xml, manifest.webmanifest et sw.js;
- les réponses non authentifiées des routes de profil et des deux API cron;
- /api/auth/get-session sans cookie fourni, qui doit répondre avec session: null et user: null;
- les en-têtes de sécurité.

Ce test Auth vérifie uniquement l'état anonyme et le proxy de session. Il ne simule pas une connexion utilisateur ni un cookie de production, car cela créerait ou modifierait une session sur Neon main. Le test utilise une connexion TLS interne avec curl --insecure; il valide le routage HTTPS et le handshake, pas encore la chaîne de confiance publique. Le certificat public Let's Encrypt ne peut être validé qu'après que le DNS du domaine pointe vers OVH et que Caddy l'a obtenu.

Le workflow construit le client avec les variables publiques de l'environnement de production. Les secrets serveur sont transférés dans app.env en mode 0600; ils ne sont pas inscrits dans l'image.

## Audit mémoire et ordre d'activation

Avant le mode deploy, lancer le workflow .github/workflows/deploy-ovh.yml depuis la branche de migration avec l'entrée inspect_read_only_resources activée et confirm_deployment désactivée. Son job séparé affiche RAM, swap, espace disque, charge hôte, statistiques de conteneurs et état des timers sans lire app.env ni modifier les services. Le workflow autonome .github/workflows/audit-ovh-resources.yml fournit aussi cette inspection.

Le VPS n'a que 4 Gio. Le mode préflight vérifie qu'il reste au moins 1,5 Gio de RAM disponible et 2 Gio de disque, puis arrête son conteneur. Pour garder l'application de production durablement, arrêter explicitement l'application de préproduction après avoir terminé ses tests; le script bloque le mode deploy si lunidex-app fonctionne encore. Caddy et le routage préproduction peuvent rester en service.

Les timers ne peuvent être activés que séparément, après coupure vérifiée des tâches Vercel et désactivation des timers préproduction :

1. vérifier que les deux planifications Vercel sont désactivées et créer /opt/lunidex-production/VERCEL_CRONS_DISABLED;
2. lancer bash /opt/lunidex-production/scripts/deployment/enable-production-crons.sh ENABLE_PRODUCTION_CRONS;
3. vérifier l'état des timers avec systemctl list-timers --all.

Le workflow ne crée pas le marqueur et n'appelle jamais ce script. Pour arrêter les timers : bash /opt/lunidex-production/scripts/deployment/disable-production-crons.sh.

## Bascule Caddy et rollback DNS

Le fichier de production Caddy est préparé mais non actif. activate-production-route.sh demande une confirmation explicite, puis vérifie que lunidex.app et www.lunidex.app résolvent vers l'IPv4 du VPS et qu'aucun AAAA contradictoire n'est présent avant de charger le routage production.

Ordre proposé une fois le rapport de préparation approuvé :

1. vérifier la disponibilité de la baseline, du candidat et de la capacité VPS; confirmer que la préproduction peut être arrêtée;
2. exécuter le préflight privé;
3. déployer l'image candidate en mode deploy, avec production et préproduction jamais toutes deux actives durablement;
4. modifier uniquement les enregistrements web apex et www chez Namecheap, après revue de leurs valeurs actuelles; laisser MX, SPF, DKIM et DMARC inchangés;
5. attendre que les deux noms résolvent vers l'IPv4 du VPS; charger ensuite le Caddy de production avec le script et confirmer les certificats HTTPS publics;
6. vérifier la page d'accueil, les API, l'Auth, SEO et PWA depuis l'extérieur;
7. n'activer les timers de production qu'après avoir arrêté les planifications Vercel et vérifié celles de préproduction.

Pour un défaut applicatif, garder les DNS sur OVH et exécuter bash /opt/lunidex-production/scripts/deployment/rollback-production.sh; il remet le tag image précédent, initialisé sur le commit Vercel ace4b8eb76e5992c935cfc01120377d17297733d. Ne pas remettre les DNS sur Vercel tant qu'un déploiement Vercel fonctionnel n'a pas été rétabli et testé. Aucune bascule DNS principale ou activation Caddy n'a été effectuée dans le cadre de cette préparation.
