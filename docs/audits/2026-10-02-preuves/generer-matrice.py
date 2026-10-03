"""Assemble la couverture observée. Ne lance aucun test et ne modifie pas l'application."""
from pathlib import Path
from collections import Counter, defaultdict
import json, csv, re, statistics

P = Path(__file__).resolve().parent
OUT = P.parent
ROOT = OUT.parents[1]
SHA = '575af4390efbe9b658d1b3d9b47f2a9932b1fc03'
ROWS = []
def read(name): return json.loads((P / name).read_text())
def domain(route):
    r = re.sub(r'^/(en|fr|es|de|it|ja|ko|zh)(?=/|$)', '', route)
    if '/api/' in r: return 'API'
    if '/tcg/sealed' in r: return 'Scellés'
    if '/tcg' in r: return 'TCG'
    if any(r.startswith('/'+x) for x in ['pokedex','pokemon','moves','abilities','items','types']): return 'Références Pokémon'
    if any(r.startswith('/'+x) for x in ['team','compare?','battle','quiz','breeding','ev-iv','nuzlocke']) or r == '/compare': return 'Outils et jeux'
    if any(r.startswith('/'+x) for x in ['favorites','dashboard','friends','u/','auth']): return 'Compte et espace personnel'
    return 'Navigation et contenus'
def add(cat, route, scenario, expected, observed, status, proof='', bug='', env='production', lang='fr', fmt='1440 × 900', pre='Visiteur ; session dédiée sans compte', permission=''):
    ROWS.append(dict(identifiant=f'SCN-{len(ROWS)+1:04}',categorie=cat,domaine=domain(route),fonctionnalite=scenario,route=route,preconditions=pre,environnement=env,version=SHA,langue=lang,navigateur='Client HTTP Playwright' if cat in ['API','Système'] else 'Chromium 149',format=fmt,attendu=expected,observe=observed,statut=status,preuve=proof,anomalie=bug,acces_ou_autorisation_manquante=permission))
def manual(route, name, expected, observed, proof, bug='', env='production', status=None, fmt='1440 × 900', cat='Fonctionnel'):
    add(cat,route,name,expected,observed,status or ('échoué' if bug else 'réussi'),proof,bug,env,fmt=fmt)

# Chaque ligne de rendu ne valide que ce qu'elle annonce, jamais le CRUD sous-jacent.
all_routes = []
for f in sorted(P.glob('routes-*.json')):
    for x in read(f.name):
        all_routes.append(x)
        err = bool(x.get('errors'))
        add('Rendu',x['path'],'Accès direct et rendu de la route','Réponse 200 et contenu, ou 404 prévue pour profil inexistant ; pas d’exception JS',f"HTTP {x['status']}; titre: {x['title']}; destination: {x['finalURL']}" + ('; exception React #418' if err else ''),'échoué' if err else 'réussi',f.name,'BUG-006' if err else '',lang=x['lang'])
for f in sorted(P.glob('responsive-*.json')):
    for x in read(f.name):
        add('Responsive',x['path'],'Géométrie du conteneur global','Largeur du document ≤ largeur de la fenêtre','scrollWidth='+str(x['scrollWidth'])+'; overflow='+str(x['overflow']),'échoué' if x['overflow'] else 'réussi',f.name,fmt=f"{x['width']} × {x['height']}")
for x in read('locales-es-de-it-ja-ko-zh.json'):
    add('Langues',x['path'],'Rendu dans une langue supplémentaire','HTTP 200, lang correct et liens de navigation préfixés',f"HTTP {x['status']}; lang={x['lang']}; h1={x['h1']}; overflow={x['overflow']}",'réussi','locales-es-de-it-ja-ko-zh.json',lang=x['lang'])
for x in read('huit-langues-navigation-reload.json'):
    add('Langues',x['after'],'Accueil → Pokédex → rechargement','Préfixe et langue conservés',f"{x['before']} → {x['after']}; lang={x['htmlLang']}",'réussi','huit-langues-navigation-reload.json',lang=x['lang'])
for f in ['accessibilite-01.json','accessibilite-02.json']:
    for x in read(f):
        violations=x['violations']
        bugs=set()
        for v in violations:
            if v['id']=='color-contrast': bugs.add('BUG-009')
            if v['id'] in ['label','select-name']: bugs.add('BUG-010')
            if v['id']=='aria-required-parent': bugs.add('BUG-011')
        add('Accessibilité',x['path'],'axe-core WCAG 2 A/AA et 2.1 AA, écran observé','Aucune violation des règles exécutées', '; '.join(v['id']+': '+str(v['count']) for v in violations) or 'Aucune violation détectée ; contrôles incomplets éventuels exclus de la réussite', 'échoué' if violations else 'réussi',f,','.join(sorted(bugs)))
add('Accessibilité','/fr/tcg','axe-core, filtres avancés en thème sombre','Contraste suffisant','12 éléments de contraste insuffisant','échoué','accessibilite-filtres-tcg.json','BUG-009')

for f in ['api-lecture-local-01.json','api-lecture-local-02.json']:
    for x in read(f):
        add('API',x['path'],'GET local sans cloud : validation ou disponibilité','Réponse explicite (200/400/410/503 selon contrat), pas de faux succès métier',f"HTTP {x['status']}; {x['body'][:180]}",'réussi',f,env='local isolé, build production',lang='n/a',fmt='HTTP',pre='Aucun secret Neon ; aucune session')
for x in read('api-publiques-locales-cas-valides.json'):
    add('API',x['path'],'GET public local : cas valide ou paramètre invalide','200 et données attendues ; 400 pour validation négative',f"HTTP {x['status']}; id={x.get('id')}; count={x.get('count')}; {x['sample']}",'réussi','api-publiques-locales-cas-valides.json',env='local isolé, build production',lang='en/fr',fmt='HTTP',pre='Sans secrets ; données de référence publiques')
api_cases=read('api-cases.json')
for x in api_cases:
    if x['method']!='GET' or '/cron/' in x['path']:
        add('API',x['path'],x['method']+' : contrat de mutation / cron','Validation, permissions, résultat et absence d’effets secondaires non autorisés','Requête non exécutée','bloqué','api-local-01.json' if '/cron/' not in x['path'] else 'api-cases.json',env='aucun',lang='n/a',fmt='HTTP',pre='Base jetable et fixtures nécessaires',permission='Campagne ciblée autorisée dans un bac à sable ; fixtures de comptes/clé ; aucune exécution en production. Balayage de mutations refusé par revue automatique.')
for x in read('systeme-et-api-lecture-production.json'):
    is_api=x['path'].startswith('/api/')
    add('API' if is_api else 'Système',x['path'],'Lecture HTTP anonyme' if is_api else 'Document système ou redirection','401 pour ressource personnelle / clé absente, 200 pour documentation publique ; 200/308 pour documents et redirections',f"HTTP {x['status']}; destination={x.get('location','')}; {x['excerpt'][:130]}",'réussi','systeme-et-api-lecture-production.json',lang='n/a',fmt='HTTP',pre='Sans authentification ; GET sans effet métier')
for f in ['sitemaps-01.json','sitemaps-02.json','sitemaps-03.json']:
    for x in read(f):
        good=x.get('status')==200 and x.get('urlCount',0)>0
        add('Système',x['url'],'Sitemap annoncé : disponibilité et XML non vide','HTTP 200, XML et au moins une URL',f"HTTP {x.get('status')}; {x.get('urlCount')} URL; {x.get('bytes')} caractères",'réussi' if good else 'échoué',f,lang='n/a',fmt='HTTP')
for f in ['performances-01.json','performances-02.json','performances-03.json']:
    for x in read(f):
        add('Performance',x['path'],f"Mesure {x['run']} {x['mode']} du cache navigateur",'Mesure reproductible sur réponse 200 ; aucun seuil terrain prétendu',f"HTTP {x['status']}; DOM={x['domMs']}ms; LCP observé={x['metrics']['lcp']}ms; ressources={x['metrics']['resources']}",'réussi',f,env='production' if x['base'].startswith('https') else 'local isolé, build production',pre='Contexte neuf à froid, rechargement à chaud ; worker bloqué ; télémétrie bloquée ; fenêtre d’observation 2,5s')

# Résultats fonctionnels revus, avec conséquences réellement observées.
cases = [
('/fr/pokedex','Recherche par ID partiel','Correspondances d’ID','La recherche 25 trouve plusieurs IDs contenant 25','parcours-pokedex.json'),
('/fr/pokedex','Recherche française avec accent','Évoli et ses formes','3 correspondances pour évoli','parcours-pokedex.json'),
('/fr/pokedex','Recherche impossible et remise à zéro','État vide explicite, puis liste','État vide et bouton de réinitialisation disponibles','parcours-pokedex.json'),
('/fr/pokedex','Chargement supplémentaire','20 → 40 cartes','40 cartes après Voir plus','parcours-pokedex.json'),
('/fr/pokedex?types=fire&gen=1','Filtres génération + type','Espèces de Kanto de type Feu, avec formes','20 résultats cohérents ; formes régionales incluses par espèce','pokedex-filtres-resultats.json'),
('/fr/pokedex?types=fire&gen=1','Persistance du filtre par URL','Filtres conservés au rechargement','Même URL, mêmes résultats','pokedex-filtres-resultats.json'),
('/fr/pokedex','Trois types contradictoires','Aucun résultat, reset accessible','État vide puis retour à la liste','pokedex-filtres-resultats.json'),
('/fr/pokedex','Retour navigateur après reset','Ancien filtre restauré','Retour vers la combinaison de trois types et état vide','references-recherche-retour.json'),
('/fr/pokedex','Tri nom décroissant','Ordre Z→A et URL de tri','Zygarde avant Zorua ; sort=name-desc','pokedex-tri-et-statut.json'),
('/fr/pokedex','Vues Capturés et Manquants, visiteur','Capturés vide ; manquants présents','Capturés vide, Manquants 20 cartes ; paramètres view conservés','pokedex-tri-et-statut.json'),
('/fr/pokedex','Statut légendaire','Liste filtrée stabilisée','118 résultats après stabilisation','filtres-legendaire-taille-verifies.json'),
('/fr/pokedex','Statut fabuleux','Liste de Pokémon fabuleux','34 résultats dont Mew et Celebi','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Groupe d’œufs','Monstre : résultats compatibles','107 résultats dont Bulbizarre','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Couleur','Bleu : résultats cohérents','206 résultats dont Carapuce','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Forme','Balle : résultats cohérents','78 résultats dont Voltorbe','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Borne BST au clavier','BST ≥ 800','Éthernatos forme spéciale seul résultat','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Borne PV au clavier','PV ≥ 255','Leuphorie et Éthernatos forme spéciale','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Borne poids au clavier','Poids ≥ 1200 kg : état vide','Aucun Pokémon trouvé','pokedex-toutes-familles-filtres.json'),
('/fr/pokedex','Action personnelle avant initialisation','Restriction explicite, pas d’écriture','Message de collection encore en chargement ; pas d’ajout','actions-anonymes-reproduction.json'),
('/fr/pokedex','Action équipe après initialisation, anonyme','Connexion demandée','Modale de connexion après 8,5 secondes ; équipe non modifiée','auth-idle-et-partage-reproduction.json'),
('/fr/pokemon/pikachu','Onglets principaux','Contenu correspondant, URL et sélection','Stats, évolution, capacités et cartes accessibles','pokemon-onglets-complets.json'),
('/fr/pokemon/pikachu','Onglets secondaires','Contenu correspondant et URL','Talents, reproduction, builds, lieux, sprites et compétitif examinés','pokemon-onglets-complets.json'),
('/fr/pokemon/pikachu','Chromatique','Sprite shiny affiché','URL official-artwork/shiny/25.png chargée, naturalWidth243, aria-pressed=true','shiny-maze-preuve-stable.json'),
('/fr/pokemon/pikachu','Cri actuel','Lecture média native démarrée','Promise native play résolue, latest/25.ogg ; audition physique non vérifiée','cris-et-evolution-pokemon.json'),
('/fr/pokemon/pikachu','Cri historique','Lecture média native démarrée','Promise native play résolue, legacy/25.ogg','cri-historique-forme-retour.json'),
('/fr/pokemon/pikachu','Évolution → forme → retour','Bonne forme et retour à l’onglet','Raichu Alola, types Électrik/Psy ; retour tab=evolution sélectionné','cri-historique-forme-retour.json'),
('/fr/moves','Recherche impossible','État vide et reset','Aucune capacité trouvée','references-recherche-retour.json'),
('/fr/abilities','Recherche nom et effet','Statik retrouvé, recherche impossible vide','Static retourne Statik ; zzz vide','references-recherche-retour.json'),
('/fr/items','Recherche potion','Toutes les potions du sous-catalogue','4 potions retrouvées','references-recherche-retour.json'),
('/fr/items','Recherche impossible','État vide et reset','No items found','references-recherche-retour.json'),
('/fr/items','Catégorie soin et tri par coût','Coût décroissant','Guérison 3000, Potion Max 2500, etc.','capacites-objets-filtres-apercu.json'),
('/fr/compare?ids=25,6','Lien partagé de comparaison','Deux Pokémon et statistiques','Pikachu et Dracaufeu ; total Dracaufeu 534','faq-comparaison-execute.json'),
('/fr/compare?ids=25,6','Recherche française/anglaise/ID','Correspondances et état vide','Évoli, Eevee, Bulbizarre, ID 1 trouvés ; zzz vide','comparaison-reseau-corrige.json'),
('/fr/compare?ids=25,6','Ajout et retrait sur lien partagé','URL de trois IDs, puis deux ; pas de sauvegarde distante','Évoli ajouté à l’URL, 3 cartes après reload, retrait ramène deux IDs','comparaison-types-mobile-execute.json'),
('/fr/types','Sélection du type Électrik','Relations et Pokémon correspondants','Fort contre Eau/Vol, faible face à Sol ; cellule Électrik/Sol=0×','comparaison-types-mobile-execute.json'),
('/fr/types','Clavier dans le tableau','Enter sélectionne, flèche déplace le focus','Électrik/Sol sélectionnée ; ArrowRight vers Électrik/Vol=2×','tcg-date-reset-et-matrice-clavier.json'),
('/fr/ev-iv','Calcul IV connu','Pikachu niveau50, nature neutre : plage IV','Stats entrées produisent IV 30–31','iv-normal-limites.json'),
('/fr/ev-iv','Niveau invalide','Borne minimale 1','0 ramené à 1','iv-normal-limites.json'),
('/fr/ev-iv','Plan EV et limites','252 par stat, 510 au total, IV ≤31','252 PV +252 attaque +6 défense =510 ; IV99 ramené31','ev-plafonds.json'),
('/fr/ev-iv','Changement de niveau','Statistiques recalculées','Résultats observés à niveaux50/100','ev-plafonds.json'),
('/fr/battle','Calcul des dégâts','Résultat numérique cohérent avec conditions','Tonnerre81–96 ; critique/pluie120–144 ; OHKO/2HKO actualisés','degats-et-reproduction-selection.json'),
('/fr/battle','Simulation de duel','Vainqueur et journal, PV non négatifs','Pikachu gagne contre Carapuce en2 tours ; PV final0','combat-duel.json'),
('/fr/breeding','Parents et objets','Compatibilité et paramètres appliqués','Pikachu♀+Métamorph compatibles, Nœud Destin et Pierre Stase','reproduction-configuration.json'),
('/fr/breeding','Probabilité d’héritage','5 IV hérités ; nature fixée ; probabilité calculée','0,52%, 192 œufs moyens pour la configuration testée','reproduction-resultats-quiz.json'),
('/fr/quiz','Marathon complet','Fin à cinq erreurs ; résultat cohérent','2/7, 2 bonnes réponses et5 erreurs','quiz-marathon-parcours.json'),
('/fr/quiz','Protection contre réponses répétées','Réponses désactivées durant transition','4 boutons désactivés après réponse','quiz-marathon-parcours.json'),
('/fr/quiz','Survie complète','Fin après trois erreurs','Résultat0/3 après3 erreurs','quiz-survie-complete.json'),
('/fr/quiz','Contre la montre, expiration réelle','Fin à30 secondes','Minuteur30s puis résultat final après attente réelle','quiz-minuteur-fin.json'),
('/fr/quiz','Stats, données et révélation','Barres visibles avant réponse ; chiffres ensuite','Chiffres ??? voulus, puis statistiques numériques révélées','quiz-stats-attente.json'),
('/fr/tcg','Recherche connue stabilisée','Cartes Pikachu','Résultats Pikachu après attente','tcg-recherches-stabilisees.json'),
('/fr/tcg','Recherche impossible stabilisée','État vide, aucune ancienne carte','0 carte, aides de relance','tcg-recherches-stabilisees.json'),
('/fr/tcg','Extension151','Cartes de l’extension choisie','24 cartes, set=sv03.5','tcg-extension-tri-langue.json'),
('/fr/tcg','Tri numéro décroissant','207,206,205…','Premiers liens207,206,205,204,203','tcg-extension-tri-langue.json'),
('/fr/tcg','Charger plus','24 →48 cartes','48 liens de cartes','tcg-extension-tri-langue.json'),
('/fr/tcg','Langue des cartes FR et rechargement','Cartes françaises, set et tri conservés','24 cartes françaises après stabilisation ; URL tcgLang=fr','tcg-langue-fr-et-fiche.json'),
('/fr/tcg','Vue liste et grille2','Changement de présentation','24 cartes conservées ; radio Grille2 cochée','tcg-vues-filtres-avances.json'),
('/fr/tcg','Type + PV','Charizard de type Feu avec PV≥300','3 cartes, toutes PV330','tcg-types-pv-rarete.json'),
('/fr/tcg','Rareté combinée','Illustration spéciale rare de Charizard','Seule sv03.5-199','tcg-rarete-dresseur-energie.json'),
('/fr/tcg','Dresseur Supporter','Cartes Supporter de151','10 cartes après stabilisation','tcg-dresseur-illustrateur-prix.json'),
('/fr/tcg','Énergie de base','Carte énergie correspondante','Énergie Psy de base207','tcg-rarete-dresseur-energie.json'),
('/fr/tcg','Illustrateur','Correspondance miki kudo','Seule carte199 dans la recherche Charizard','tcg-dresseur-illustrateur-prix.json'),
('/fr/tcg','Prix minimal excluant','Aucun résultat au-dessus de1000','État vide avec minPrice1000','tcg-dresseur-illustrateur-prix.json'),
('/fr/tcg','Date future et reset','État vide puis dernière extension','Date2035 :0 carte ; Dernières cartes rétablit24','tcg-date-reset-et-matrice-clavier.json'),
('/fr/tcg','Stade2','Cartes stade2 de la recherche','3 Charizard','tcg-legalite-et-devise-verifiees.json'),
('/fr/tcg','Filtre légalité','Exclure une carte dont legal.standard=false','0 résultat ; source carte199 standard=false','tcg-legalite-et-devise-verifiees.json'),
('/fr/tcg/cards/sv03.5-199','Fiche → modale → Échap','Détails complémentaires puis fermeture','Attaques, illustrateur, faiblesse, liens ; modale fermée','marche-filtres-et-carte-modale.json'),
('/fr/tcg/cards/sv03.5-199','Devise USD et rechargement','Source/prix USD persistants','351,69$US viaTCGplayer, conservé après reload','tcg-legalite-et-devise-verifiees.json'),
('/fr/tcg/sealed/market','Recherche151','Produits correspondants','63 produits','marche-filtres-et-carte-modale.json'),
('/fr/tcg/sealed/market','Pagination de recherche','Page suivante, q conservé','q=151&page=1 ; nouveaux produits','marche-filtres-et-carte-modale.json'),
('/fr/tcg/sealed/market','Recherche impossible','Zéro produit et message','Aucun produit scellé trouvé','marche-filtres-et-carte-modale.json'),
('/fr/tcg/sealed/market','Catégorie Display','Produits Display','619 produits ; category=53','marche-filtres-et-carte-modale.json'),
('/fr/tcg/sealed/market/611877','Fiche et alias de fiche','Fiche produit publique lisible','Fiche et /market/products/611877 répondent200','routes-fr-04.json'),
('/fr/faq','Recherche de question','Une question hors ligne','1 question correspondante','faq-comparaison-execute.json'),
('/fr/faq','Ouverture de réponse','Réponse lisible','Texte du fonctionnement hors ligne visible','faq-comparaison-execute.json'),
('/fr/faq','Recherche impossible','État vide clair','Aucune question trouvée','faq-comparaison-execute.json'),
('/fr','Lien d’évitement au clavier','Premier Tab puis Enter vers main','Aller au contenu principal → MAIN#home-main','clavier-recherche-types.json'),
('/fr','Palette globale et focus','Recherche Pikachu, focus contenu dans la modale','Résultats Pokémon/capacités/objets et focus interne','clavier-recherche-types.json'),
('/fr','Échap après stabilisation de la palette','Fermeture et focus restitué','Dialogue0, focusBUTTON','echap-survie-execute.json'),
('/fr/types','Menu mobile','Destinations secondaires accessibles','Collection, scellés, outils, compte et ressources listés','comparaison-types-mobile-execute.json'),
('/fr','Consentement : refus et rechargement','Bannière fermée, choix conservé','Tout refuser disparaît et ne revient pas après reload','preferences-prod-consent-zoom.json'),
('/fr/pokedex','Thème sombre','Thème appliqué et persisté','Classe dark après rechargement','preferences-production-resultat-stable.json'),
('/fr/pokedex','Réduction du mouvement, émulation','Préférence de média transmise','matchMedia reduced-motion=true ; pas de validation de toutes les animations','preferences-prod-consent-zoom.json'),
('/fr/pokedex','Zoom CSS200% (simulation)','Pas de débordement global dans cette simulation','scroll1424/client1424 ; ne valide pas le zoom natif','preferences-prod-consent-zoom.json'),
('/fr/tcg/start','Ouverture de connexion','Modale claire et champs requis','E-mail et mot de passe min6, connexion proposée','auth-email-password-invalides.json'),
('/fr/tcg/start','E-mail et mot de passe invalides','Invalidité client détectée','E-mail sans@ et mot de passe3 caractères invalides','auth-email-password-invalides.json'),
('/fr/tcg/start','Mode inscription, sans soumission','Nom, e-mail, mot de passe requis','3 champs requis présents','contact-erreurs-et-compte-sans-envoi.json'),
('/fr/tcg/start','Échap de connexion','Fermeture sans soumission','Dialogue0','auth-email-password-invalides.json'),
('/fr/tcg/start','Récupération avec e-mail vide','Erreur explicite avant requête','Saisissez d’abord votre adresse e-mail ; aucune requête non-GET','recuperation-email-vide-validee.json'),
('/fr/auth/reset-password','Lien sans jeton','Lien invalide présenté explicitement','Lien invalide/expiré affiché','contact-validation-reset.json'),
('/fr/pokedex','Paramètres d’URL invalides','Fallback utilisable','types/gen/sort inconnus ignorés, liste de20','parametres-liens-limites.json'),
('/fr/go/audit-test','Campagne valide','307 vers démarrage interne','307 vers tcg/start avec source/campaign','outils-secondaires-controles.json'),
('/fr/go/INVALID___','Campagne invalide','404 sans redirection externe','HTTP404','outils-secondaires-controles.json'),
]
for r,n,e,o,p in cases: manual(r,n,e,o,p)

for challenge in ['Classique','Silhouette','Stats']:
    for mode in ['Marathon','Survie','Contre la montre']:
        manual('/fr/quiz',challenge+' / '+mode+' : début et réponse','Partie lancée, proposition et retour de réponse','Une question et sa réponse exercées ; partie entière non validée par cette seule ligne','quiz-neuf-combinaisons.json' if challenge=='Classique' else 'quiz-six-combinaisons-reprise.json')
for path in ['/fr/pokemon/audit-inexistant','/fr/moves/audit-inexistant','/fr/abilities/audit-inexistant','/fr/items/audit-inexistant','/fr/tcg/cards/audit-inexistant','/fr/tcg/sets/audit-inexistant','/fr/guides/audit-inexistant','/fr/compare/audit-inexistant','/fr/tcg/sealed/market/-1']:
    manual(path,'Identifiant/slug inexistant','404 et écran de récupération','404, écran lisible avec liens de retour ; texte anglais traité séparément','invalides-et-partage.json')

bugs=[
('/fr/moves','Recherche Tonnerre','Tonnerre doit être présent','Aucune capacité, alors que /moves/thunderbolt existe','references-catalogues-tronques.json','BUG-001','production'),
('/fr/abilities','Recherche Technicien','Talent présent','0 résultat, fiche technician existante','catalogues-reproduction-et-tcg-controles.json','BUG-001','production'),
('/fr/items','Recherche Restes','Objet présent','0 résultat, fiche leftovers existante','references-catalogues-tronques.json','BUG-001','production'),
('/en/moves','Recherche Thunderbolt en anglais','Capacité présente','0 résultat avec catalogue48','catalogues-reproduction-et-tcg-controles.json','BUG-001','production'),
('/fr/moves','Filtres Feu + Spécial','Capacités Feu spéciales du catalogue entier','Aucun résultat, limité aux48 premières entrées','capacites-objets-filtres-apercu.json','BUG-001','production'),
('/fr/team/share?code=25-6-9&lang=fr','Ouverture équipe partagée','Trois Pokémon consultables et lien conservé','Redirection team, URL vidée, équipe0/6','auth-idle-et-partage-reproduction.json','BUG-002','production'),
('/fr/pokedex → /fr/favorites','Import sauvegarde puis navigation/reload','Import réellement conservé ou refus explicite','Succès annoncé, favori1 en navigation,0 après reload','import-consequences.json','BUG-003','local isolé'),
('/fr/team','Showdown valide sans cloud','Ajout réel ou refus sans confirmation de succès','Added1 et invitation à connexion simultanées ; équipe0/6','showdown-import-et-comparaison.json','BUG-004','local isolé'),
('/fr/pokedex','Son/sprites après rechargement','Préférences conservées','Revenus à true/false au lieu de false/true','preferences-verification.json','BUG-005','local isolé'),
('/fr/pokedex','Son/sprites production après rechargement','Préférences conservées','Valeurs true/false restaurées après changementfalse/true','preferences-production-resultat-stable.json','BUG-005','production'),
('/fr/tcg/cards/sv03.5-199','Hydratation FR/EN, contexte dédié','Pas d’exception React','Erreur418 dans les deux langues','hydration-carte-reproduction-dediee.json','BUG-006','production'),
('/fr/items, /fr/battle, /fr/ev-iv, /fr/types','Langue des commandes de l’interface','Commandes traduites en français','Sections et messages anglais ; tokens stats.offensive, quiz.time-attack','localisation-constats.json','BUG-007','production'),
('/fr/tcg?set=sv03.5&q=charizard','Nom d’extension pendant chargement des métadonnées','151 ou libellé de chargement neutre','3 cartes151 annoncées dans30th Classic Collection, puis libellé151 rétabli','tcg-nom-extension-retarde-reproduction.json','BUG-015','local isolé / réseau simulé'),
('/fr/pokedex','Filtre taille25–25m','Respecter le maximum affiché ou annoncer25+','Dracaufeu Gigamax28m inclus ; borne supérieure ignorée au plafond','filtres-legendaire-taille-verifies.json','BUG-014','production'),
('/fr/compare?ids=25,25,6,133','Doublons du lien partagé','IDs uniques avant limite de3','Pikachu en double, Évoli omis, analyses de faiblesse faussées','comparaison-liens-invalides-reproduits.json','BUG-012','production'),
('/fr/compare?ids=9999999','Erreur référence inexistante','Signaler le Pokémon invalide','404 amont, puis état vide générique sans erreur','comparaison-liens-invalides-reproduits.json','BUG-013','production'),
]
for r,n,e,o,p,b,en in bugs: manual(r,n,e,o,p,b,en)
for width in [360,390]: manual('/fr/pokedex','Bouton favori intégralement visible','Cible44px visible','Découpe à droite du bouton par article overflow:hidden','actions-pokedex-geometrie-quatre-formats.json','BUG-008',fmt=f'{width} × '+('800' if width==360 else '844'))

local_cases=[
('/fr/contact','Champs vides et e-mail invalide','Erreurs françaises et focus au premier champ','4 erreurs de champs, focusnom ; e-mail invalide identifié','contact-erreurs-et-compte-sans-envoi.json'),
('/fr/contact','Panne503 interceptée : chargement','Bouton désactivé et formulaire occupé','disabled=true, aria-busy=true','contact-panne-simulee-sans-envoi.json'),
('/fr/contact','Panne503 interceptée : récupération','Message clair et valeurs conservées','Message indisponible français, champs conservés, bouton réactivé ; aucun envoi réel','contact-panne-simulee-sans-envoi.json'),
('/fr/pokedex','Export de données locales','Téléchargement JSON exploitable','Sauvegardev3 téléchargée, préférences de session présentes','preferences-verification.json'),
('/fr/pokedex','Import JSON syntaxiquement invalide','Refus, aucune sauvegarde changée','Échec analyse JSON','imports-local-validation.json'),
('/fr/pokedex','Import version inconnue','Refus explicite','Unsupported backup version présenté','imports-local-validation.json'),
('/fr/pokedex','Prévisualisation import valide','Compteurs corrects avant confirmation','1 favori et autres compteurs0','imports-local-validation.json'),
('/fr/team','Showdown inconnu','Espèce inconnue et ajout désactivé','SPECIES NOT RECOGNIZED ; Add to Team disabled','showdown-import-et-comparaison.json'),
('/fr/team','Showdown valide, prévisualisation','Espèce, objet, talent, nature, attaques reconnus','Pikachu, Light Ball, Static, Timid, deux attaques','showdown-import-et-comparaison.json'),
('/fr/nuzlocke','Création vide/valide sans compte','Pas de partie persistante, connexion demandée','Aucune partie créée, invitation à connexion','nuzlocke-showdown-observes.json'),
('/fr/tcg','TCGdex503 ciblé','Message de panne, pas de faux état vide','Unable to load cards ; GET503 interceptés','tcgdex-503-simulation-reelle.json'),
('/fr/tcg','Reprise après panne TCGdex','Résultats reviennent au changement de recherche','24 cartes Pikachu après levée de l’interception','tcg-panne-reprise-confirmee.json'),
('/fr/pokedex','PWA : worker, cache et hors ligne revisité','Page contrôlée mise en cache accessible hors ligne','Cachepages-v3 puis Pokédex complet hors ligne','pwa-revisite-cache.json'),
('/fr/pokedex','PWA : document non encore mis en cache hors ligne','Fallback explicite','Premier chargement avant contrôle du worker ; reload hors ligne affiche le fallback','pwa-hors-ligne.json'),
('/fr/pokedex','Chunk Sentry facultatif en404','Interface anonyme reste utilisable','Invitation à connexion à9s et18s ; aucune validation sync cloud','panne-un-chunk-differe-isole.json'),
('/fr/pokedex','Choix langue FR→DE','Navigation et cookie de langue','URL/de/pokedex et cookie langueDE après stabilisation','changement-langue-attente.json'),
]
for r,n,e,o,p in local_cases:
    manual(r,n,e,o,p,env='local isolé / simulation navigateur' if n.startswith(('Panne','TCGdex','Reprise','Chunk')) else 'local isolé')

for name,expected,observed,proof in [
 ('404 : collision clavier','Mur infranchissable, compteur inchangé','Steps0 et message de collision','maze-mouvement-reset-portail.json'),
 ('404 : pad directionnel','Déplacement réel et compteur','Down : Steps1','maze-mouvement-reset-portail.json'),
 ('404 : remise à zéro avec R','Nouvelle partie, compteurs remis à zéro','Fragments0/3, Steps0 ; nouvelle grille','maze-mouvement-reset-portail.json'),
 ('404 : portail incomplet','Sortie verrouillée avant collecte','0/3, portail refusé ; Steps79','maze-mouvement-reset-portail.json'),
 ('404 : fragments, victoire et retour','3 fragments ouvrent le portail puis retour accueil','1/3 →2/3 →3/3 ; victoire246 pas puis /fr','maze-parcours-complet.json'),
 ('Capacités œuf : espèce sans capacités','État vide explicite','Pikachu, 0 capacité, explication','capacites-oeuf-chargees.json'),
 ('Capacités œuf : espèce et filtre positif','Liste puis filtrage cohérent','Bulbasaur19 capacités, curse seul résultat','capacites-oeuf-execution-validee.json'),
 ('Capacités œuf : panneau Sources','Conseil et lien disponibles','Conseil groupes monster/plant et lien Bulbapedia Curse','capacites-oeuf-execution-validee.json'),
 ('Capacités œuf : filtre impossible','État vide de recherche','0 capacité correspondante à zz zaudit, saisi sans espaces','capacites-oeuf-execution-validee.json'),
 ('Capacités œuf : espèce inexistante','Erreur explicite distincte du vide','Erreur de chargement ; sources404 reproduites','capacites-oeuf-invalide-valide.json'),
]:
    manual('/fr/pokemon/audit-inexistant' if name.startswith('404') else '/fr/breeding',name,expected,observed,proof,env='local isolé')
manual('/fr/tcg?set=sv03.5&q=charizard','Latence artificielle TCGdex et reload','Chargement explicite puis cartes attendues, URL conservée','+700ms par GET ; 0→3 cartes Charizard de151,3 après reload ; incohérence de libellé couverte séparément par BUG-015','tcg-latence-simulation-validee.json',env='local isolé / réseau simulé')

# Opérations métier explicitement impossibles dans les accès actuels.
blocked={
 '/fr/auth':['Connexion avec compte valide','Inscription réelle et vérification e-mail','Récupération par e-mail réelle','Réinitialisation valide et changement de mot de passe','Déconnexion d’un compte connecté','Session expirée, renouvellement et persistance entre appareils'],
 '/fr/dashboard':['Favoris et captures synchronisés','Progression, badges et historique','Préférences synchronisées entre appareils','Export serveur du compte','Suppression réelle du compte et reprise de suppression'],
 '/fr/team':['Équipe propriétaire : ajouter6, doublon et septième membre','Retrait et réorganisation de l’équipe','Import sur équipe existante et données persistantes','Export Showdown / image d’une équipe sauvegardée'],
 '/fr/nuzlocke':['Partie persistante : création et rechargement','Rencontre unique par route et doublon','Statuts vivant/mort/boîte et statistiques','Modification et suppression d’une partie'],
 '/fr/friends':['Profil personnel, pseudo, visibilité','Recherche de profil authentifiée','Envoi et acceptation de demande','Refus, retrait et permissions ami/non-ami'],
 '/fr/friends/[friendId]':['Lecture propriétaire et autre utilisateur ; données réellement partagées'],
 '/fr/u/[handle]':['Profil existant public et confidentialité'],
 '/fr/tcg/collection':['Création d’album et activation de collection','Possession, quantités, variantes et doublons','Progression entre album/extension/carte','Notes, transactions personnelles et refresh','Collection multi-onglets et synchronisation'],
 '/fr/tcg/wishlist':['Ajouter/retirer, doublons et persistance'],
 '/fr/tcg':['Ajouter depuis catalogue ou fiche','Comparaison TCG via liste personnelle','Recherche enregistrée : créer/modifier/supprimer','Filtres possédées/wishlist alimentés par de vraies données'],
 '/fr/tcg/deck-builder':['Créer, éditer, dupliquer et supprimer un deck','Limites de cartes, comptage et validation','Import/export d’un deck personnel'],
 '/fr/tcg/sealed/collection':['Créer une position, quantité et coût','Achat/vente et portefeuille','Modification et archivage d’une position'],
 '/fr/tcg/sealed/journal':['Créer/modifier/annuler transaction','Historique et cohérence de soldes'],
 '/fr/tcg/sealed/analytics':['Calculs personnels de valeur et performance'],
 '/fr/tcg/sealed/cashflow':['Flux de trésorerie et exports personnels'],
 '/fr/tcg/sealed/sources':['Ajouter, modifier et supprimer source/alias'],
 '/fr/battle':['Créer et rejoindre salle multijoueur','Échanger messages et mises à jour entre deux joueurs','Permissions adversaire, spectateur et autre utilisateur'],
 '/fr/quiz':['Défi quotidien : lancement et réponses','Soumission réelle, anti-rejeu et classement','Sauvegarde records, badges et sessions'],
 '/fr/contact':['Envoi réel de message et réception'],
 '/fr/docs/api':['Création/révocation d’une clé API','Clé read : lecture propriétaire et refus de mutation','Clé read_write : écriture et lecture après mutation','Autre propriétaire et isolation des données','Clé expirée/révoquée ; erreurs401/403/429 sous identité réelle'],
 '/fr/offline':['Installation PWA native','Permission et notification push réelle','Session connectée hors ligne puis resynchronisation'],
}
for route,names in blocked.items():
    for name in names:
        reason='Compte de test, fixtures propriétaires A/B et service cloud de test nécessaires ; autorisation ciblée des écritures, envois ou suppressions. Aucun compte créé ni session personnelle utilisée.'
        if 'Installation' in name: reason='Navigateur interactif installable nécessaire ; applications natives inaccessibles (Mac verrouillé).'
        if 'Défi quotidien' in name or name=='Ajouter depuis catalogue ou fiche': reason+=' Action refusée par la revue automatique d’approbation.'
        add('Métier',route,name,'Résultat et conséquences persistantes à vérifier','Aucune exécution métier réelle','bloqué','limites-outillage.json',env='aucun',pre='Compte/fixtures de test autorisés',permission=reason)
for x in read('previews-accessibilite.json'):
    add('Environnement',x['requested'],'Accès à la preview','Version de l’application observable','Page Login Vercel ; HTTP200 ne valide pas Lunidex','bloqué','previews-accessibilite.json',env='preview protégée',pre='Accès sans session personnelle',permission='Accès autorisé à la protection Vercel ou preview publique ; versions recensées dans environnement.json.')
    candidate = next((v for v in read('environnement.json')['previews'] if v['url'] in x['requested']), None)
    ROWS[-1]['version'] = 'Non observable dans l’application ; commit recensé : ' + (candidate['commit'] if candidate else 'voir environnement.json')
add('Environnement','toutes','Second moteur de navigateur','Test réel WebKit ou Firefox','Chromium seul ; module Playwright local absent ; applications natives inaccessibles','bloqué','limites-outillage.json',env='aucun',permission='Moteur alternatif opérationnel et session dédiée sans données personnelles.')
add('Accessibilité','toutes','Zoom natif200%','Reflow et interactions avec zoom réel','Seule simulation CSS exécutée','bloqué','limites-outillage.json',env='aucun',permission='Navigateur interactif isolé avec zoom natif contrôlable.')
add('Accessibilité','toutes','Lecteur d’écran réel','Annonce et navigation VoiceOver/NVDA','axe et clavier exécutés ; aucune audition de lecteur d’écran','bloqué','limites-outillage.json',env='aucun',permission='Session native isolée, applications natives accessibles et lecteur d’écran pilotable.')
add('Variantes','routes dynamiques','Toutes les entités distantes et toutes les combinaisons','Données de chaque Pokémon/carte/produit et toutes les combinaisons vérifiées','Variantes représentatives et identifiants invalides testés ; autres entités et produit cartésien non exécutés','non exécuté','environnement.json',pre='Périmètre combinatoire non borné ; inventaires externes évolutifs',permission='Définir un corpus fini, données figées et campagne dédiée ; pas un test de charge de production.')

# Contrôles de code : séparés de la couverture navigateur et du taux métier.
for name,cmd in [('vitest','npm test'),('lint','npm run lint'),('types','npm run typecheck'),('seo','npm run seo:check'),('build','npm run build'),('core','npx tsc --project packages/core/tsconfig.json --noEmit')]:
    x=read(name+'-result.json')
    add('Automatisé code','dépôt',cmd,'Code de sortie0',f"exit={x['exit']}; {x['seconds']}s"+('; 100 fichiers,474 tests' if name=='vitest' else ''),'réussi' if x['exit']==0 else 'échoué',name+'.log',env='copie isolée, dépendances existantes partagées',lang='n/a',fmt='CLI',pre='Node22.22.3 ; aucun .env ; aucun npm ci neuf revendiqué')

headers=list(ROWS[0])
csvpath=OUT/'2026-10-02-matrice-couverture.csv'
with csvpath.open('w',newline='',encoding='utf-8-sig') as f:
    writer=csv.DictWriter(f,fieldnames=headers);writer.writeheader();writer.writerows(ROWS)
def escape(s):return str(s).replace('|','\\|').replace('\n',' ')
md=['# Matrice de couverture — Lunidex, 2 octobre 2026','',
    'Une ligne valide uniquement le scénario nommé. Un rendu de page ou une réponse503 sans Neon ne valide pas ses opérations métier. Les simulations sont identifiées ; les474 tests unitaires sont hors du taux navigateur. La ligne Variantes documente les entités/combinations restantes, sans prétendre les dénombrer. Les préconditions, version, langue, format et autorisations figurent dans le CSV complet.','',
    f'[CSV complet](<{csvpath}>)','',
    '| ID | Catégorie | Fonctionnalité / scénario | Route | Attendu | Observé | Statut | Preuve | Anomalie |',
    '|---|---|---|---|---|---|---|---|---|']
for x in ROWS:
    proof=f"[{x['preuve']}](<{P/x['preuve']}>)" if x['preuve'] else ''
    md.append('| '+' | '.join(escape(x[k]) for k in ['identifiant','categorie','fonctionnalite','route','attendu','observe','statut'])+' | '+proof+' | '+x['anomalie']+' |')
(OUT/'2026-10-02-matrice-couverture.md').write_text('\n'.join(md)+'\n')
functional=[x for x in ROWS if x['categorie'] in ['Fonctionnel','Métier']]
runtime=[x for x in ROWS if x['categorie']!='Automatisé code']
stats={'total':len(ROWS),'statuts':dict(Counter(x['statut'] for x in ROWS)),'hors_code':dict(Counter(x['statut'] for x in runtime)),'fonctionnel_metier':dict(Counter(x['statut'] for x in functional)),'categories':{},'domaines':{}}
for key in ['categorie','domaine']:
    target='categories' if key=='categorie' else 'domaines'
    for value in sorted({x[key] for x in ROWS}): stats[target][value]=dict(Counter(x['statut'] for x in ROWS if x[key]==value))
(P/'couverture-totaux.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')

# Tous les fichiers de pages, tous les handlers et les sources interactives sont recensés.
pages=[]
for f in sorted((ROOT/'src/app').rglob('page.tsx')):
    pattern='/'+str(f.parent.relative_to(ROOT/'src/app'))
    if pattern=='/.':pattern='/'
    regex=re.escape(pattern)
    regex=re.sub(r'\\\[\\\[\.\.\.[^]]+\\\]\\\]',r'.*',regex)
    regex=re.sub(r'\\\[[^]]+\\\]',r'[^/]+',regex)
    representative=[]
    for x in all_routes:
        route=re.sub(r'^/(en|fr)(?=/|$)','',x['path']).split('?')[0] or '/'
        matches = re.fullmatch(regex,route)
        if pattern == '/tcg/sealed/[[...view]]':
            matches = route == '/tcg/sealed' or (route.startswith('/tcg/sealed/') and not route.startswith(('/tcg/sealed/market','/tcg/sealed/buy-safely','/tcg/sealed/releases')))
        if matches:representative.append(x['path'])
    pages.append({'source':str(f.relative_to(ROOT)),'route':pattern,'representants':sorted(set(representative)),'validation':'Rendu observé et tests spécifiques dans matrice ; parcours authentifiés bloqués le cas échéant'})
handlers=[str(f.relative_to(ROOT)) for f in sorted((ROOT/'src/app').rglob('route.ts'))]
interactive=[]
for f in sorted((ROOT/'src').rglob('*.tsx')):
    if 'graphify-out' in f.parts:continue
    matches=[{'ligne':i,'evenements':re.findall(r'on(?:Click|Submit|Change|ValueChange|CheckedChange|KeyDown|OpenChange|Select)=',line)} for i,line in enumerate(f.read_text().splitlines(),1) if re.search(r'on(?:Click|Submit|Change|ValueChange|CheckedChange|KeyDown|OpenChange|Select)=',line)]
    if matches: interactive.append({'source':str(f.relative_to(ROOT)),'interactions':matches})
testfiles=[str(f.relative_to(ROOT)) for folder in [ROOT/'src',ROOT/'packages/core/src'] for f in folder.rglob('*.test.ts')]
inventory={'pages':pages,'handlers':handlers,'api_methodes':api_cases,'sources_interactives':interactive,'tests':sorted(testfiles),'note':'Inventaire source, pas résultats de tests. Les états internes/helpers ne constituent pas des parcours utilisateurs autonomes.'}
(P/'inventaire-projet.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
invmd=['# Inventaire des routes — Lunidex','',f'{len(pages)} fichiers de pages ; {len(handlers)} handlers, dont52 sous/api ; {len(api_cases)} couples méthode/route API ; {len(testfiles)} fichiers Vitest.','',
    '| Source | Route | Représentants visités FR/EN |','|---|---|---|']
for x in pages:invmd.append('| ['+x['source']+'](<'+str(ROOT/x['source'])+'>) | '+escape(x['route'])+' | '+escape(', '.join(x['representants']))+' |')
invmd+=['','## Handlers et interfaces spéciales','']
for h in handlers:invmd.append('- ['+h+'](<'+str(ROOT/h)+'>)')
invmd+=['','Les conventions robots/manifest et fichiers publics OpenSearch, llms, ai sont également testés dans la matrice. Les sources interactives et lignes d’événements sont disponibles dans inventaire-projet.json.','']
(OUT/'2026-10-02-inventaire-routes.md').write_text('\n'.join(invmd))

perf=[]
for f in ['performances-01.json','performances-02.json','performances-03.json']:perf+=read(f)
groups=defaultdict(list)
for x in perf:groups[(x['base'],x['path'],x['mode'])].append(x)
summaries=[]
for (base,path,mode),xs in groups.items():summaries.append({'base':base,'path':path,'mode':mode,'n':len(xs),'dom_ms_mediane':statistics.median(x['domMs'] for x in xs),'lcp_ms_mediane':statistics.median(x['metrics']['lcp'] for x in xs),'ressources_mediane':statistics.median(x['metrics']['resources'] for x in xs)})
(P/'performances-synthese.json').write_text(json.dumps(summaries,indent=2)+'\n')
print(json.dumps(stats,ensure_ascii=False,indent=2))
print('Pages sans représentant:',[x['route'] for x in pages if not x['representants']])
