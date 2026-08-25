# Migration PostgreSQL Supabase vers Neon

## État de la migration

La cible Vercel/Neon dédiée `lunidex-neon` est créée en région Frankfurt
(PostgreSQL 17, plan Free). Le schéma et les données applicatives observées
ont été copiés et validés par volumes, identifiants et empreintes de contenu le
4 août 2026. Les routes de données web, le proxy Neon Auth et la synchronisation
mobile sont déployés dans la version production du 4 août 2026. Supabase n'a
pas été supprimé.

Les anciennes variables Supabase ont été supprimées du projet Vercel après
validation explicite : la recherche Vercel ne retourne plus aucune variable
`SUPABASE_*`. Le runtime déployé ne les lit plus.

Neon Auth a aussi été provisionné sur la branche de production. Les 14 comptes
ont été recréés avec leurs identifiants et adresses, sans copier de mot de passe
(Supabase utilisait des empreintes bcrypt ; Neon Auth attend son propre flux de
réinitialisation). Les utilisateurs doivent donc définir un nouveau mot de
passe via le lien de reset avant leur première connexion.

Le runtime applicatif n'appelle plus Supabase :

- Neon PostgreSQL porte user_state, profils, amis, quiz, combats, historique et
  alertes/prix TCG, abonnements push et métriques produit ;
- Neon Auth porte les comptes, sessions, reset de mot de passe et les futurs
  fournisseurs OAuth ;
- les salles de combat utilisent Neon PostgreSQL avec polling API contrôlé au
  lieu de Supabase Realtime Broadcast/Presence ;
- aucun bucket Storage ni objet Storage n'a été détecté dans le projet actif ;
- l'ancienne Edge Function `poll-tcg-prices` n'est pas déployée et les alertes
  de prix restent désactivées ; elle est conservée comme archive à remplacer
  par un job Vercel/Neon avant toute réactivation ;
- les anciennes migrations et le projet Supabase sont conservés uniquement pour
  sauvegarde, comparaison et retour arrière.

Le schéma Neon ne rejoue pas les schémas internes Supabase `auth`, `storage`,
`realtime`, `graphql_public` ou `vault`, ni les politiques RLS qui dépendaient
de `auth.uid()` et `auth.jwt()`. L'autorisation équivalente est appliquée dans
les routes serveur après vérification du JWT Neon via JWKS.

Extensions observées : pgcrypto est requis par le schéma cible ; plpgsql est
fourni nativement par PostgreSQL ; uuid-ossp n'est pas utilisé par les
migrations applicatives ; pg_stat_statements relève de l'observabilité Neon ;
pg_cron et supabase_vault sont des dépendances Supabase à remplacer ou à
laisser sur Supabase.

## Fichiers préparés

- neon/migrations/0001_lunidex_app.sql crée le schéma applicatif Neon, les
  tables, types, contraintes, clés étrangères vers app.users, index, séquence,
  vues et fonctions de projection nécessaires, ainsi que le compteur analytique
  exécutable côté serveur.
- neon/migrations/0002_battle_rooms_cascade.sql durcit les clés étrangères des
  salles de combat, les valeurs acceptées du leaderboard et les index de
  rétention. Le script d'import applique les fichiers SQL dans l'ordre lexical.
- scripts/neon/export-supabase.sh exporte le dump applicatif et les seuls
  identifiants Auth stables requis pour les clés étrangères.
- scripts/neon/import-to-neon.sh applique le schéma, importe les données et
  reconstruit les projections amis. Il ne touche jamais Supabase.
- scripts/neon/verify-migration.sh compare les volumes et vérifie les objets
  essentiels de la cible.
- `.env.example` documente les endpoints Neon/Auth et conserve
  `SUPABASE_DB_URL` uniquement pour les scripts d'export de l'ancienne source.
  En production Vercel, l'intégration Neon fournit la variable sensible
  `DATABASE_URL`; les variables d'Auth sont configurées séparément. `.neon-migration/`
  est ignoré par Git.

Le web n'utilise pas d'ORM : ses routes serveur utilisent
`@neondatabase/serverless` avec `DATABASE_URL` et `@neondatabase/auth` pour le
proxy Auth. Le mobile utilise le client Neon Auth natif et appelle les mêmes
routes API Neon avec un JWT court. Les noms historiques `src/lib/supabase/*`
restent uniquement pour la compatibilité des chemins et des tests de l'état
persisté ; ils ne contiennent plus de client Supabase.

## Procédure contrôlée

Prérequis : un projet Neon dédié, une base cible vide, une chaîne de connexion
Neon non poolée pour le dump/restauration, et les clients PostgreSQL pg_dump,
pg_restore et psql compatibles avec PostgreSQL 17.

Définir localement les variables sans les écrire dans un fichier suivi par Git :

~~~bash
export SUPABASE_DB_URL='…'
export NEON_DATABASE_URL='…'
~~~

Puis exécuter :

~~~bash
npm run db:neon:export
npm run db:neon:import
npm run db:neon:verify
~~~

Ne pas utiliser la connexion poolée pour pg_dump/pg_restore. Ne pas ajouter
ces variables à NEXT_PUBLIC_*, EXPO_PUBLIC_*, au bundle mobile ou à des logs
CI. L'import est destiné à une cible vide ; il ne contient aucune commande
DROP, TRUNCATE ou suppression de données.

## Validation effectuée après bascule

1. build Vercel de production terminé avec succès sur la version Neon/Auth ;
2. connexion publique à la page localisée de production ;
3. route d'historique TCG exécutée sur Neon et retournant un JSON valide ;
4. route profil refusant une requête sans authentification ;
5. schéma Neon vérifié : tables, volumes, clés étrangères, index, triggers,
   fonctions, vues, extension `pgcrypto` et séquence ;
6. 14 identités `app.users`/`profiles` et 14 identités Neon Auth concordantes ;
7. contrôles de type web, mobile et package core passants ;
8. build local de la version Neon Auth terminé avec succès après autorisation
   réseau pour les polices.

Les contrôles automatisés réalisés localement sont `npm run lint`,
`npm run typecheck` et `npm run test -- --run` (392 tests passants). Le build
`npm run build` local et le build Vercel de la version déployée sont passants.
La validation authentifiée complète reste à faire avec un compte de test, sans
exposer de jeton dans les logs.

## Validation canary encore requise

Le fournisseur email partagé Neon Auth est déjà configuré sur la branche de
production. Il reste à :

1. envoyer un reset à un compte migré puis vérifier reset, connexion, session et
   émission du JWT ;
2. vérifier lecture/écriture de user_state, profil public, quiz, leaderboard,
   demandes d'amis et projections collection/decks avec un compte de test ;
3. vérifier création/lecture d'une salle de combat et le polling ;
4. vérifier les contraintes FK, l'unicité des handles, les transitions d'amitié,
   les index et la séquence `tcg_price_history_id_seq` ;
5. remplacer la rétention `pg_cron` et le polling TCG par un scheduler Vercel/Neon
   avant de réactiver les alertes.

Pour limiter l'interruption, conserver Supabase comme source, faire un export
final après gel court des écritures ou mettre en place une réplication logique,
puis effectuer une bascule canary. Une dual-write temporaire n'est sûre qu'après
implémentation et observation des routes concernées ; elle n'est pas activée
par ces scripts.

## Services à conserver ou remplacer

| Fonctionnalité | Décision |
| --- | --- |
| PostgreSQL applicatif web | Neon, via routes serveur et `DATABASE_URL` |
| PostgreSQL applicatif mobile | Neon, via les mêmes routes API serveur |
| Authentification | Neon Auth ; reset obligatoire pour les comptes migrés |
| Realtime Broadcast/Presence | Remplacé par polling API/Neon PostgreSQL pour les salles |
| Storage | Rien à migrer dans l'état observé |
| Edge Function TCG | Non déployée ; remplacer par un job Vercel/Neon avant réactivation |
| pg_cron | À remplacer par un scheduler Vercel/Neon avant réactivation d'un job |
| RLS Supabase | Non copié ; autorisation équivalente dans l'API serveur Neon |
| RLS/Data API Neon | Non utilisé directement : la base reste derrière les API serveur |

Les mots de passe et sessions Auth ne sont pas copiés dans Neon. Les 14 comptes
peuvent être conservés, mais chacun doit passer par un reset Neon Auth. Tant
qu'un reset et une connexion canary n'ont pas réussi, Supabase doit rester
disponible pour le retour arrière ; sa suppression est une étape séparée.

## Retour arrière

Ne supprimer ni le projet Supabase ni ses données. Si le canary Neon échoue :

1. utiliser Vercel pour promouvoir le précédent déploiement production validé
   (`vercel rollback` ou promotion depuis le tableau de bord) ;
2. conserver Supabase disponible et ne supprimer aucune donnée ;
3. si des écritures ont atteint Neon après la bascule, geler les écritures et
   les réconcilier explicitement avant de remettre une version Supabase ;
4. conserver l'export et les métriques de validation pour l'analyse.

Le retour arrière applicatif est réversible ; le retour arrière des données
nécessite une décision de réconciliation pour éviter d'écraser une écriture
valide.
