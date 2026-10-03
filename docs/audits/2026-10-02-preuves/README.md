# Preuves de l’audit Lunidex du 2 octobre 2026

Les JSON et captures contiennent des observations dans une session Chromium dédiée. Les logs CLI concernent la copie temporaire sans secrets. Les horodatages inclus sont en UTC ; le rapport utilise Europe/Paris.

Le rapport et la matrice désignent les preuves utilisées pour leurs conclusions. Le manifeste recense taille, SHA-256, date de fichier et références. La date de fichier est celle de l’artefact ; elle ne remplace pas un horodatage d’observation contenu dans le JSON.

## Lecture des statuts

- Un fichier JSON comportant seulement `raw` avec une erreur, un timeout ou un refus est une tentative inconclusive ou bloquée. Il ne valide pas une fonctionnalité.
- Un fichier non cité par la matrice peut contenir une reconnaissance, un état intermédiaire, une erreur de sélecteur ou une expérience remplacée. Il n’est pas une preuve suffisante de bug.
- Les résultats de code sont séparés des interactions réelles. Les 474 tests Vitest ne valident pas les comptes cloud.
- Les valeurs de prix, noms de catalogues et totaux distants sont datées ; elles peuvent changer.

## Conditions de test importantes

Les POST/PUT/PATCH/DELETE vers l’API de production ont été bloqués. Les POST GraphQL publics de PokéAPI sont des lectures et ont été autorisés. Les premières expériences où toutes les requêtes POST étaient bloquées ont été remplacées par comparaison-reseau-corrige.json ; elles ne fondent aucune anomalie de recherche.

Les fichiers panne-tcg-locale-simulee.json et erreur-tcg-simulee.png appartiennent à une première interception qui ne ciblait pas les lectures TCGdex réelles. Utiliser tcgdex-503-simulation-reelle.json et tcg-panne-reprise-confirmee.json pour la panne et la reprise.

Une fermeture prématurée de contexte et des sélecteurs incorrects ont produit des erreurs de pilotage. Elles sont conservées pour expliquer les reprises, sans les attribuer au produit.

Les refus automatiques sont dans api-local-01.json, gardes-carte-contact-auth.json et quiz-quotidien-anonyme-complet.json. Les opérations refusées n’ont pas été exécutées.

Le réseau lent a été simulé en retardant certaines requêtes publiques dans le navigateur local. Le contact a reçu une réponse503 simulée sans requête au service réel et sans envoi de message. La PWA a été testée dans la copie locale ; aucune installation ou notification réelle.

Les fichiers de sauvegarde sont des fixtures synthétiques et un export d’une session de test. Ils ne proviennent d’aucune collection personnelle. Les cookies, secrets et paramètres de connexion Vercel ne sont pas livrés. Les e-mails présents dans les textes sont des exemples de formulaire, données de test ou coordonnées publiques.

## Reproduction des livrables

`generer-matrice.py` assemble les observations existantes, l’inventaire et les totaux. Il ne relance aucun test. `audit-runner.py` décrit l’environnement isolé utilisé pour les contrôles de code. Aucun de ces fichiers ne modifie le code de l’application.

