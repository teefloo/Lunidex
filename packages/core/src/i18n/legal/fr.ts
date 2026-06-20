import type { LegalDocument } from '../legal-types';

const privacy: LegalDocument = {
  title: 'Politique de confidentialité',
  intro:
    "Cette politique décrit comment nous traitons vos données personnelles lorsque vous utilisez PrimeDex, en conformité avec le Règlement Général sur la Protection des Données (RGPD) et le California Consumer Privacy Act (CCPA).",
  preamble:
    "PrimeDex est un site web non commercial et non affilié à Nintendo, Game Freak, The Pokémon Company ou Creatures Inc. Nous prenons la protection de votre vie privée très au sérieux. Cette politique explique, en toute transparence, quelles données sont collectées, pourquoi, comment elles sont utilisées, combien de temps elles sont conservées, et quels sont vos droits.",
  lastUpdated: '4 juin 2026',
  effectiveDate: '4 juin 2026',
  sections: [
    {
      id: 'controller',
      title: '1. Responsable du traitement',
      intro: "Le responsable du traitement de vos données personnelles est :",
      paragraphs: [
        "PrimeDex est édité par un particulier à titre personnel et non commercial, sans création de personne morale. Il n'existe pas de SIRET, de numéro d'entreprise, ni de représentant légal distinct.",
        "L'éditeur agit en tant que responsable de traitement au sens de l'article 4.7 du RGPD. Il détermine les finalités et les moyens du traitement de vos données personnelles.",
      ],
      table: {
        headers: ['Rôle', 'Identité', 'Contact'],
        rows: [
          ['Éditeur (responsable du traitement)', 'Particulier — PrimeDex', 'estdel3012@gmail.com'],
          ['Hébergeur (sous-traitant)', 'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA', 'privacy@vercel.com'],
          ['Délégué à la protection des données', 'Non désigné (traitement à faible risque)', 'estdel3012@gmail.com'],
        ],
      },
      callout: {
        type: 'info',
        text: "Aucun transfert de données n'est effectué vers un pays tiers hors Union européenne sans garantie adéquate (clauses contractuelles types ou décision d'adéquation).",
      },
    },
    {
      id: 'data',
      title: '2. Données collectées',
      intro: "PrimeDex collecte uniquement le strict minimum de données nécessaires au fonctionnement du service.",
      subsections: [
        {
          id: 'data-personal',
          title: '2.1. Données à caractère personnel',
          paragraphs: [
            "Nous ne collectons aucune donnée d'identification directe (nom, prénom, adresse e-mail, numéro de téléphone, adresse postale, date de naissance) lors de votre utilisation du site. Aucune inscription ni création de compte n'est requise.",
          ],
          list: [
            "Aucune donnée d'identité (nom, prénom, pseudonyme).",
            "Aucune adresse e-mail ou moyen de contact direct (sauf si vous nous écrivez volontairement).",
            "Aucun mot de passe ni identifiant de session géré par nos soins.",
            "Aucune donnée de paiement, bancaire ou commerciale.",
            "Aucune donnée de géolocalisation précise.",
            "Aucune donnée biométrique.",
          ],
        },
        {
          id: 'data-local',
          title: '2.2. Données stockées localement (IndexedDB)',
          paragraphs: [
            "Les données suivantes sont stockées exclusivement dans le navigateur de votre appareil, dans une base de données locale (IndexedDB). Elles ne sont jamais transmises à nos serveurs ni à aucun tiers, et nous n'y avons pas accès :",
          ],
          list: [
            "Vos Pokémon favoris (identifiants numériques).",
            "La composition de vos équipes.",
            "Vos statuts de Pokémon « capturés » (Pokédex personnel).",
            "Vos comparaisons de Pokémon en cours.",
            "Votre collection de cartes du Jeu de Cartes à Collectionner (TCG) : cartes possédées, souhaitées, surveillées.",
            "Vos notes personnelles sur les cartes.",
            "Vos recherches sauvegardées et votre historique de navigation interne.",
            "Vos sessions et scores de quiz (WhosThat, type effectiveness, etc.).",
            "Vos préférences d'affichage : thème clair/sombre, langue, son, notifications.",
            "Vos badges et succès débloqués.",
          ],
          callout: {
            type: 'success',
            text: "Ces données restent sur votre appareil. Vous pouvez les supprimer à tout moment via les paramètres du site (section « Réinitialiser mes données ») ou en effaçant les données de navigation de votre navigateur.",
          },
        },
        {
          id: 'data-technical',
          title: '2.3. Données techniques transmises automatiquement',
          paragraphs: [
            "Lors de toute connexion à PrimeDex, votre navigateur échange automatiquement des informations techniques avec notre infrastructure et nos sous-traitants. Ces données sont strictement nécessaires à l'établissement et au bon fonctionnement de la communication :",
          ],
          table: {
            headers: ['Catégorie', 'Donnée', 'Finalité', 'Base légale (RGPD)'],
            rows: [
              ['Technique', 'Adresse IP', 'Routage réseau, sécurité, anti-abus, géolocalisation CDN', 'Intérêt légitime (Art. 6.1.f)'],
              ['Technique', 'User-Agent (navigateur, OS)', 'Compatibilité d\'affichage, débogage', 'Intérêt légitime (Art. 6.1.f)'],
              ['Technique', 'En-têtes HTTP (Referer, Accept-Language)', 'Acheminement, détection de langue', 'Intérêt légitime (Art. 6.1.f)'],
              ['Logs', 'Journaux d\'accès Vercel (horodatage, URL, code HTTP)', 'Sécurité, détection d\'incidents, débogage', 'Intérêt légitime (Art. 6.1.f)'],
            ],
          },
        },
        {
          id: 'data-cookies',
          title: '2.4. Cookies et traceurs',
          paragraphs: [
            "PrimeDex dépose uniquement deux cookies strictement nécessaires au fonctionnement du service. Aucun cookie de mesure d'audience, publicitaire ou de profilage n'est actuellement déposé. Pour plus d'informations, consultez notre politique cookies.",
          ],
          list: [
            "primedex-lang (durée : 1 an) : mémorise votre langue préférée.",
            "tcg-user-state (durée : 1 an) : conserve votre état d'interface sur les pages TCG.",
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '3. Finalités et bases légales',
      intro: "Conformément à l'article 6 du RGPD, chaque traitement de données repose sur une base légale précise :",
      table: {
        headers: ['Finalité', 'Données concernées', 'Base légale'],
        rows: [
          ['Fourniture du service Pokédex et TCG', 'Données techniques (IP, UA)', 'Exécution du service / intérêt légitime (Art. 6.1.f)'],
          ['Mémorisation de la langue et préférences', 'Cookies fonctionnels', 'Intérêt légitime (Art. 6.1.f) — exemptés de consentement CNIL'],
          ['Hébergement et diffusion du contenu', 'Toutes données techniques', 'Contrat d\'hébergement (Art. 6.1.b) avec Vercel'],
          ['Sécurité, anti-abus, débogage', 'Logs Vercel, IP', 'Intérêt légitime (Art. 6.1.f)'],
          ['Réponse à vos demandes de contact', 'E-mail, contenu du message', 'Mesures précontractuelles ou consentement (Art. 6.1.a/b)'],
          ['Stockage local de vos préférences', 'Données IndexedDB', 'Hors RGPD — stockage local sur votre appareil'],
        ],
      },
    },
    {
      id: 'recipients',
      title: '4. Destinataires et sous-traitants',
      intro: "Vos données sont uniquement communiquées aux sous-traitants strictement nécessaires au fonctionnement du service. Aucun transfert commercial n'est effectué.",
      paragraphs: [
        "PrimeDex ne vend, ne loue, et ne cède aucune donnée personnelle à des tiers à des fins commerciales ou marketing. Aucun profilage ni décision automatisée produisant des effets juridiques n'est effectué.",
      ],
      table: {
        headers: ['Sous-traitant', 'Service', 'Pays', 'Garanties de transfert'],
        rows: [
          ['Vercel Inc.', 'Hébergement CDN, SSR, logs', 'USA', 'EU-US Data Privacy Framework + SCC'],
          ['PokéAPI (Paul Hallett)', 'API publique de données Pokémon', 'USA/UE', 'Aucune donnée personnelle transmise'],
          ['TCGdex', 'API publique de cartes TCG', 'UE/France', 'Aucune donnée personnelle transmise'],
          ['Scrydex', 'Hébergement d\'images TCG', 'UE', 'Aucune donnée personnelle transmise'],
          ['GitHub (raw.githubusercontent.com)', 'Hébergement de sprites', 'USA', 'Aucune donnée personnelle transmise'],
        ],
      },
    },
    {
      id: 'transfers',
      title: '5. Transferts hors Union européenne',
      paragraphs: [
        "Le site est hébergé par Vercel Inc., société établie aux États-Unis. Les transferts de données vers les États-Unis sont encadrés par la décision d'adéquation de la Commission européenne relative au EU-US Data Privacy Framework (DPF) du 10 juillet 2023, ainsi que, à titre subsidiaire, par les Clauses Contractuelles Types (SCC) adoptées par la Commission européenne.",
        "Les autres services tiers (PokéAPI, TCGdex, Scrydex, GitHub) ne reçoivent aucune donnée à caractère personnel vous concernant : seules les données techniques nécessaires à l'acheminement des requêtes leur sont transmises.",
      ],
      callout: {
        type: 'info',
        text: "Pour exercer vos droits ou obtenir une copie des garanties de transfert, vous pouvez nous contacter à l'adresse estdel3012@gmail.com.",
      },
    },
    {
      id: 'retention',
      title: '6. Durée de conservation',
      intro: "Nous appliquons le principe de minimisation des durées de conservation :",
      table: {
        headers: ['Catégorie de données', 'Durée de conservation'],
        rows: [
          ['Données locales IndexedDB', 'Tant que vous ne les supprimez pas (via les paramètres ou le navigateur)'],
          ['Cookies fonctionnels', '1 an maximum'],
          ['Logs Vercel', '30 jours maximum (politique de rérotation interne Vercel)'],
          ['E-mails de contact', '3 ans après le dernier échange (obligation comptable)'],
        ],
      },
    },
    {
      id: 'security',
      title: '7. Sécurité',
      paragraphs: [
        "PrimeDex met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction.",
      ],
      list: [
        "Chiffrement HTTPS/TLS 1.3 sur l'ensemble du site (HSTS activé).",
        "En-têtes de sécurité : X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrictive.",
        "Content Security Policy (CSP) stricte limitant l'exécution de scripts et les sources d'images.",
        "Aucune donnée sensible (mot de passe, paiement) n'est stockée — la surface d'attaque est donc réduite.",
        "Mises à jour régulières des dépendances (audit npm et alertes Dependabot).",
        "Code source ouvert et auditable sur GitHub (transparence par conception).",
      ],
    },
    {
      id: 'rights',
      title: '8. Vos droits',
      intro:
        "Conformément au RGPD (articles 15 à 22) et au CCPA, vous disposez des droits suivants concernant vos données personnelles :",
      list: [
        "Droit d'accès (Art. 15 RGPD) : obtenir une copie de vos données.",
        "Droit de rectification (Art. 16 RGPD) : corriger des données inexactes.",
        "Droit à l'effacement (Art. 17 RGPD) : demander la suppression de vos données.",
        "Droit à la limitation (Art. 18 RGPD) : restreindre temporairement un traitement.",
        "Droit à la portabilité (Art. 20 RGPD) : recevoir vos données dans un format structuré (s'applique surtout à vos données locales).",
        "Droit d'opposition (Art. 21 RGPD) : vous opposer à un traitement fondé sur l'intérêt légitime.",
        "Droit de retrait du consentement (Art. 7.3 RGPD) : lorsqu'un traitement repose sur le consentement.",
        "Droit d'introduire une réclamation auprès d'une autorité de contrôle (Art. 77 RGPD).",
        "Droits CCPA (résidents californiens) : droit de savoir, de suppression, de retrait, de non-discrimination.",
      ],
      paragraphs: [
        "Pour exercer l'un de ces droits, écrivez-nous à estdel3012@gmail.com. Nous vous répondrons dans un délai maximum de 30 jours. Une pièce d'identité pourra être demandée pour vérifier que la demande émane bien de vous.",
        "Vous pouvez également introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés, www.cnil.fr) ou, pour les résidents de l'UE, auprès de votre autorité nationale de protection des données. Pour les résidents californiens, vous pouvez contacter le California Attorney General (oag.ca.gov).",
      ],
    },
    {
      id: 'children',
      title: '9. Protection des mineurs',
      paragraphs: [
        "PrimeDex s'adresse à un public familial et peut être consulté par des mineurs. Le site ne collecte sciemment aucune donnée à caractère personnel auprès d'enfants de moins de 16 ans (ou l'âge applicable selon la juridiction) sans le consentement parental.",
        "Le site ne propose pas de section réservée aux enfants, ne propose pas de messagerie, et ne recueille pas d'informations permettant d'identifier directement un mineur. Les parents qui estimeraient que leur enfant a fourni des informations personnelles peuvent nous écrire pour en demander la suppression.",
        "Conformément au COPPA (Children's Online Privacy Protection Act) et au RGPD, aucune donnée n'est sciemment collectée auprès d'enfants de moins de 13 ans (COPPA) ou 16 ans (RGPD, sauf âge inférieur fixé par l'État membre).",
      ],
    },
    {
      id: 'third-parties',
      title: '10. Services tiers et liens externes',
      paragraphs: [
        "PrimeDex s'appuie sur des API et services tiers pour fournir les données affichées (PokéAPI, TCGdex, Scrydex, GitHub). Ces services ont leurs propres politiques de confidentialité, que nous vous invitons à consulter.",
        "Le site peut également proposer des liens vers des sites externes (par exemple, la page officielle Pokémon, des vidéos YouTube, des boutiques). Nous ne sommes pas responsables du contenu ni des pratiques de confidentialité de ces sites tiers.",
      ],
    },
    {
      id: 'changes',
      title: '11. Modifications de cette politique',
      paragraphs: [
        "Cette politique de confidentialité peut être mise à jour pour refléter les évolutions du service, de la réglementation ou de nos pratiques. La date de dernière mise à jour est indiquée en haut de cette page.",
        "En cas de changement substantiel, une notification sera affichée de manière visible sur le site (par exemple, par un bandeau temporaire). Nous vous encourageons à consulter régulièrement cette page.",
      ],
    },
    {
      id: 'contact',
      title: '12. Contact',
      intro: "Pour toute question relative à cette politique de confidentialité ou à l'exercice de vos droits :",
      table: {
        headers: ['Canal', 'Détail'],
        rows: [
          ['E-mail', 'estdel3012@gmail.com'],
          ['Délai de réponse', '30 jours maximum (Art. 12.3 RGPD)'],
          ['Langue', 'Français ou anglais'],
          ['Code source', 'github.com/Teeflo/Poke (issues publiques)'],
        ],
      },
    },
  ],
};

const terms: LegalDocument = {
  title: "Conditions générales d'utilisation",
  intro:
    "Ces conditions générales d'utilisation (CGU) régissent votre accès et votre utilisation de PrimeDex. En accédant au site, vous acceptez d'être lié par ces conditions.",
  preamble:
    "PrimeDex est un projet fan-made personnel, gratuit, sans publicité, sans monétisation. Il est fourni « en l'état », à des fins de divertissement et d'information sur l'univers Pokémon. Toute utilisation du site vaut acceptation des présentes CGU.",
  lastUpdated: '4 juin 2026',
  effectiveDate: '4 juin 2026',
  sections: [
    {
      id: 'object',
      title: '1. Objet',
      paragraphs: [
        "PrimeDex est un site web non commercial répertoriant les données relatives aux Pokémon (numéros, types, statistiques, descriptions, évolutions, talents, sprites) ainsi qu'aux cartes du Jeu de Cartes à Collectionner (TCG) du même univers. Il s'agit d'un projet de fan à but purement informatif et ludique.",
        "Le site est édité à titre gratuit et sans publicité. Aucun achat, aucun abonnement, aucune inscription n'est nécessaire pour utiliser le service.",
      ],
    },
    {
      id: 'affiliation',
      title: '2. Non-affiliation et propriété intellectuelle',
      intro: "PrimeDex n'est en aucun cas affilié, sponsorisé, soutenu ou approuvé par :",
      list: [
        "Nintendo Co., Ltd.",
        "Game Freak Inc.",
        "Creatures Inc.",
        "The Pokémon Company (TPC) et ses filiales.",
        "Pokémon Center, Wizards of the Coast (Hasbro), ou tout autre titulaire de droits lié à la marque Pokémon.",
      ],
      paragraphs: [
        "Les marques, noms, sprites, illustrations, sons, vidéos, et tout autre contenu lié à l'univers Pokémon restent la propriété exclusive de leurs titulaires respectifs. PrimeDex n'en revendique aucune propriété.",
        "L'utilisation des marques et contenus Pokémon est faite à des fins de fan project non commercial, ce qui, dans la plupart des juridictions, relève d'un usage descriptif et informatif nativement autorisé. Si un titulaire de droits estime qu'un contenu porte atteinte à ses droits, nous nous engageons à le retirer promptement après notification à l'adresse estdel3012@gmail.com.",
        "Le code source du site est publié sous licence MIT (open source). Cela ne confère aucun droit sur les marques Pokémon : la licence MIT s'applique uniquement au code écrit par l'auteur de PrimeDex.",
      ],
    },
    {
      id: 'sources',
      title: '3. Sources des données',
      paragraphs: [
        "Les données affichées par PrimeDex proviennent exclusivement de sources publiques et communautaires tierces : PokéAPI (pokeapi.co, maintenu par Paul Hallett) et TCGdex (api.tcgdex.net). Les images sont hébergées par Scrydex et GitHub (raw.githubusercontent.com).",
        "Nous nous efforçons d'afficher des données exactes et à jour, mais nous ne garantissons pas l'absence d'erreurs, d'omissions ou de retard de synchronisation avec les sources. Les données sont fournies à titre indicatif et ne sauraient se substituer aux sources officielles.",
      ],
    },
    {
      id: 'usage',
      title: '4. Usages autorisés et interdits',
      intro: "Vous êtes autorisé à utiliser PrimeDex à des fins personnelles, non commerciales et informatives. Sont notamment interdits :",
      list: [
        "Toute utilisation commerciale, publicitaire ou de revente de l'accès au site.",
        "Toute tentative de scraping massif ou automatisé dépassant l'usage normal (par exemple, plus de 60 requêtes par minute, ou la copie intégrale de la base de données).",
        "Toute tentative de contournement des mesures de sécurité, des limites de taux, ou des en-têtes CSP.",
        "Toute injection de contenu malveillant (script, iframe, upload) via les champs utilisateur (recherche, comparaison, etc.).",
        "Toute utilisation du site pour harceler, menacer, diffamer ou porter atteinte aux droits d'autrui.",
        "Toute tentative d'identification ou de profilage d'autres utilisateurs.",
        "Toute revente, redistribution ou republication du contenu du site sans autorisation écrite préalable.",
      ],
    },
    {
      id: 'availability',
      title: '5. Disponibilité du service',
      paragraphs: [
        "PrimeDex est fourni « en l'état » et « selon disponibilité ». L'éditeur s'efforce de maintenir le site accessible 24h/24 et 7j/7, mais ne garantit pas une disponibilité ininterrompue.",
        "Le service peut être interrompu temporairement pour maintenance, mise à jour, problème technique, ou cas de force majeure. Aucune indemnité ne pourra être réclamée à ce titre.",
      ],
    },
    {
      id: 'responsibility',
      title: '6. Responsabilité',
      intro: "Dans les limites autorisées par la loi applicable :",
      list: [
        "PrimeDex ne pourra être tenu responsable des dommages indirects, accessoires, spéciaux ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser le site.",
        "L'éditeur ne garantit pas l'exactitude, l'exhaustivité ou l'actualité des données affichées.",
        "L'éditeur ne pourra être tenu responsable du contenu de sites tiers accessibles via des liens depuis PrimeDex.",
        "L'utilisateur est seul responsable de l'usage qu'il fait des informations fournies par le site.",
      ],
      paragraphs: [
        "Si une disposition des présentes CGU est jugée invalide ou inapplicable par une juridiction compétente, les autres dispositions resteront pleinement en vigueur.",
      ],
    },
    {
      id: 'accountability',
      title: '7. Signalement de contenu illicite',
      paragraphs: [
        "Si vous estimez qu'un contenu affiché sur PrimeDex porte atteinte à vos droits (propriété intellectuelle, diffamation, etc.), vous pouvez nous contacter à l'adresse estdel3012@gmail.com en précisant : la nature du contenu en cause, son URL exacte, votre qualité (titulaire des droits ou représentant), et tout élément justificatif.",
        "Nous nous engageons à examiner toute notification dans un délai raisonnable et, le cas échéant, à retirer ou modifier le contenu concerné.",
      ],
    },
    {
      id: 'modifications',
      title: '8. Modifications des CGU',
      paragraphs: [
        "Les présentes CGU peuvent être modifiées à tout moment. La date de dernière mise à jour est indiquée en haut de cette page. En cas de changement substantiel, une notification sera affichée sur le site.",
        "La poursuite de l'utilisation du site après publication des modifications vaut acceptation des nouvelles CGU.",
      ],
    },
    {
      id: 'law',
      title: '9. Droit applicable et juridiction',
      paragraphs: [
        "Les présentes CGU sont régies par le droit français, sans préjudice des dispositions impératives applicables dans votre pays de résidence (notamment le droit de la consommation de l'UE).",
        "À défaut de règlement amiable, tout litige relatif à l'interprétation ou à l'exécution des présentes CGU relèvera de la compétence des tribunaux français, sauf disposition légale contraire applicable aux consommateurs.",
      ],
    },
    {
      id: 'contact',
      title: '10. Contact',
      paragraphs: [
        "Pour toute question relative à ces CGU, vous pouvez nous contacter à l'adresse estdel3012@gmail.com.",
      ],
    },
  ],
};

const legalNotice: LegalDocument = {
  title: 'Mentions légales',
  intro:
    "Les présentes mentions légales sont éditées conformément à l'article 6 de la Loi pour la Confiance dans l'Économie Numérique (LCEN) du 21 juin 2004.",
  preamble:
    "PrimeDex est édité par un particulier à titre personnel et non commercial. Aucune personne morale n'est derrière ce projet : il s'agit d'un fan project.",
  lastUpdated: '4 juin 2026',
  effectiveDate: '4 juin 2026',
  sections: [
    {
      id: 'editor',
      title: '1. Éditeur du site',
      intro: "Le site PrimeDex est édité par :",
      table: {
        headers: ['Champ', 'Valeur'],
        rows: [
          ['Dénomination', 'PrimeDex (nom de projet personnel)'],
          ['Statut', 'Particulier — projet personnel non commercial'],
          ['Responsable de la publication', 'Particulier éditeur'],
          ['Contact', 'estdel3012@gmail.com'],
          ['SIRET', 'Non applicable (absence de personne morale)'],
          ['Numéro de TVA', 'Non applicable'],
          ['Adresse', 'Non publiée (particulier)'],
          ['Directeur de la publication', 'L\'éditeur du site'],
        ],
      },
      callout: {
        type: 'warning',
        text: "En l'absence de personne morale, PrimeDex n'est pas inscrit au registre du commerce et des sociétés (RCS) ni au répertoire des métiers (RM). L'éditeur agit sous sa responsabilité civile personnelle.",
      },
    },
    {
      id: 'host',
      title: '2. Hébergeur',
      intro: "Le site est hébergé par :",
      table: {
        headers: ['Champ', 'Valeur'],
        rows: [
          ['Société', 'Vercel Inc.'],
          ['Forme juridique', 'Société de droit américain (Delaware)'],
          ['Adresse', '340 S Lemon Ave #4133, Walnut, CA 91789, USA'],
          ['Site web', 'vercel.com'],
          ['Contact', 'privacy@vercel.com'],
        ],
      },
    },
    {
      id: 'activity',
      title: '3. Activité et nature du service',
      paragraphs: [
        "PrimeDex est un Pokédex et catalogue de cartes TCG en ligne, gratuit, sans publicité, sans monétisation. Le site affiche des données publiques relatives à l'univers Pokémon (numéros, types, statistiques, sprites, cartes) à des fins strictement informatives et ludiques.",
        "Le service est fourni gratuitement, sans inscription, sans collecte de données à caractère personnel, et sans transaction commerciale.",
      ],
    },
    {
      id: 'affiliation-notice',
      title: '4. Non-affiliation',
      paragraphs: [
        "PrimeDex est un projet de fan non commercial, indépendant et non affilié. Les marques, noms, sprites, illustrations et tous autres éléments liés à l'univers Pokémon restent la propriété exclusive de Nintendo, Game Freak, Creatures Inc. et The Pokémon Company.",
        "Aucune affiliation, aucun partenariat, aucun sponsoring ou soutien officiel de la part des titulaires de droits mentionnés n'est à déduire du site. Pour plus d'informations, consultez nos CGU.",
      ],
    },
    {
      id: 'contact',
      title: '5. Contact',
      paragraphs: [
        "Pour toute demande relative au site (questions, signalement, exercice de droits RGPD), vous pouvez nous contacter à : estdel3012@gmail.com.",
      ],
    },
    {
      id: 'authority',
      title: '6. Autorité de contrôle',
      paragraphs: [
        "Pour toute réclamation relative à la protection de vos données personnelles, vous pouvez saisir la Commission Nationale de l'Informatique et des Libertés (CNIL) : www.cnil.fr.",
      ],
    },
  ],
};

const cookies: LegalDocument = {
  title: 'Politique de cookies',
  intro:
    "Cette politique détaille les cookies et traceurs déposés sur votre appareil lors de votre navigation sur PrimeDex, conformément aux lignes directrices de la CNIL et au RGPD.",
  preamble:
    "Un cookie est un petit fichier texte déposé sur votre appareil par le serveur d'un site web. Certains cookies sont strictement nécessaires au fonctionnement du site ; d'autres nécessitent votre consentement préalable.",
  lastUpdated: '4 juin 2026',
  effectiveDate: '4 juin 2026',
  sections: [
    {
      id: 'inventory',
      title: '1. Inventaire des cookies utilisés',
      intro: "PrimeDex dépose uniquement deux cookies, tous deux strictement nécessaires au fonctionnement du service. Aucun cookie de mesure d'audience, publicitaire ou de profilage n'est déposé.",
      table: {
        headers: ['Cookie', 'Finalité', 'Type', 'Durée', 'Éditeur'],
        rows: [
          ['primedex-lang', 'Mémorise votre langue préférée', 'Strictement nécessaire (Art. 82 Loi Informatique et Libertés)', '1 an', 'PrimeDex'],
          ['tcg-user-state', 'Conserve votre état d\'interface sur les pages TCG (filtres, tris)', 'Strictement nécessaire', '1 an', 'PrimeDex'],
        ],
      },
      callout: {
        type: 'info',
        text: "Les cookies strictement nécessaires sont exemptés de consentement préalable selon l'article 82 de la Loi Informatique et Libertés et les recommandations CNIL.",
      },
    },
    {
      id: 'details',
      title: '2. Détail de chaque cookie',
      subsections: [
        {
          id: 'lang',
          title: '2.1. primedex-lang',
          paragraphs: [
            "Ce cookie mémorise la langue dans laquelle vous avez choisi d'afficher le site. Sans lui, vous verriez PrimeDex dans la langue par défaut (anglais) à chaque visite. Il ne contient aucune donnée personnelle : seule une valeur alphabétique ('en', 'fr', 'de', etc.) est stockée.",
          ],
          list: [
            "Éditeur : PrimeDex.",
            "Durée de vie : 1 an maximum.",
            "Type : cookie HTTP côté serveur (déposé via l'en-tête Set-Cookie).",
            "Base légale : intérêt légitime (Art. 6.1.f RGPD) — exempté de consentement CNIL.",
          ],
        },
        {
          id: 'tcg',
          title: '2.2. tcg-user-state',
          paragraphs: [
            "Ce cookie préserve l'état de l'interface sur les pages du catalogue TCG (filtres actifs, mode d'affichage, derniers tris) afin que vous retrouviez vos préférences d'une visite à l'autre.",
          ],
          list: [
            "Éditeur : PrimeDex.",
            "Durée de vie : 1 an maximum.",
            "Type : cookie HTTP côté client (localStorage, géré côté navigateur).",
            "Base légale : intérêt légitime (Art. 6.1.f RGPD) — exempté de consentement CNIL.",
          ],
        },
      ],
    },
    {
      id: 'no-third-party',
      title: '3. Absence de cookies tiers',
      paragraphs: [
        "PrimeDex ne dépose aucun cookie tiers. En particulier :",
        "Cette politique pourra être mise à jour si nous décidons d'ajouter un service tiers. Le cas échéant, votre consentement sera demandé via le bandeau cookies avant tout dépôt de cookie non strictement nécessaire.",
      ],
      list: [
        "Aucun cookie de mesure d'audience (Google Analytics, Matomo, Plausible, etc.) n'est installé.",
        "Aucun cookie publicitaire (Meta Pixel, Google Ads, TikTok Pixel, etc.) n'est installé.",
        "Aucun cookie de réseaux sociaux (boutons de partage Facebook, Twitter, etc.) n'est installé.",
        "Aucun script de retargeting ou de profilage n'est chargé.",
      ],
    },
    {
      id: 'localstorage',
      title: '4. Stockage local (IndexedDB et localStorage)',
      paragraphs: [
        "En complément des cookies, PrimeDex utilise des technologies de stockage local (IndexedDB, localStorage) pour conserver vos préférences et données d'utilisation. Ces données restent sur votre appareil et ne sont jamais transmises à un serveur.",
        "Pour en savoir plus sur ces données (favoris, équipes, collection TCG, scores de quiz, préférences d'affichage), consultez notre politique de confidentialité (section 2.2 « Données stockées localement »).",
      ],
    },
    {
      id: 'manage',
      title: '5. Gérer vos cookies',
      intro: "Vous pouvez à tout moment contrôler et supprimer les cookies :",
      list: [
        "Via les paramètres de votre navigateur (voir ci-dessous).",
        "En effaçant les données de navigation pour le site primedex.vercel.app.",
        "En cliquant sur le bouton « Gérer mes préférences » du bandeau cookies, s'il est affiché.",
        "En désactivant JavaScript dans votre navigateur (au prix d'une dégradation majeure du service).",
      ],
      paragraphs: [
        "Liens vers les pages d'aide des navigateurs les plus courants :",
      ],
      table: {
        headers: ['Navigateur', 'Lien d\'aide'],
        rows: [
          ['Google Chrome', 'support.google.com/chrome/answer/95647'],
          ['Mozilla Firefox', 'support.mozilla.org/fr/kb/effacer-cookies-donnees-site-firefox'],
          ['Apple Safari', 'support.apple.com/guide/safari/sfri11471'],
          ['Microsoft Edge', 'support.microsoft.com/fr-fr/microsoft-edge/supprimer-cookies'],
        ],
      },
    },
    {
      id: 'changes',
      title: '6. Modifications de cette politique',
      paragraphs: [
        "Cette politique de cookies peut être mise à jour pour refléter l'ajout ou la suppression de cookies, ou l'évolution de la réglementation. La date de dernière mise à jour est indiquée en haut de cette page.",
      ],
    },
    {
      id: 'contact',
      title: '7. Contact',
      paragraphs: [
        "Pour toute question relative à cette politique, vous pouvez nous contacter à : estdel3012@gmail.com.",
      ],
    },
  ],
};

export const frLegal = { privacy, terms, legalNotice, cookies };
