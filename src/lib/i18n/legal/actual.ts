import type { SupportedLanguage } from '@/lib/languages';
import type { LegalDocument } from '../legal-types';

type LegalDocuments = {
  privacy: LegalDocument;
  terms: LegalDocument;
  legalNotice: LegalDocument;
  cookies: LegalDocument;
};

const updated = '17 août 2026';
const updatedEn = 'August 17, 2026';
const contact = 'contact@lunidex.app';
const editor = 'Esteban Deloge';
const vercelAddressFr = 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis';
const vercelAddressEn = 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States';
const vercelContact = 'privacy@vercel.com';

const fr: LegalDocuments = {
  privacy: {
    title: 'Politique de confidentialité',
    intro: 'Cette page décrit les données traitées par Lunidex selon les fonctionnalités réellement activées. Elle ne constitue pas un avis juridique personnalisé.',
    preamble: 'La consultation du Pokédex et du catalogue TCG reste possible sans compte. Les fonctions qui enregistrent un espace personnel utilisent une session de compte et la synchronisation Neon lorsqu’elle est configurée.',
    lastUpdated: updated,
    effectiveDate: updated,
    sections: [
      { id: 'account-data', title: '1. Compte et données personnelles', paragraphs: [
        `Responsable du traitement : ${editor}, éditeur non professionnel de Lunidex. Pour toute question relative aux données personnelles, utilisez ${contact}.`,
        'La création d’un compte est facultative pour consulter les pages publiques. Lorsqu’un compte est créé, Neon Auth traite l’adresse e-mail, les identifiants de session et, si vous le fournissez, le nom ou pseudo. La connexion par Google ou GitHub peut être proposée selon la configuration du service ; le fournisseur choisi participe alors au parcours d’authentification.',
        'Une fois connecté, votre espace personnel peut synchroniser avec Neon les données que vous choisissez d’utiliser : favoris, Pokémon capturés, équipes, comparaisons, progression, quiz, collection et listes TCG, recherches sauvegardées, réglages et autres fonctions associées. Les profils publics, amis, alertes de prix, salons de combat et notifications ne sont traités que si vous utilisez ces fonctions.',
        'Si vous activez un profil public, votre pseudo, nom affiché, avatar, date d’inscription et statistiques de progression sélectionnées peuvent apparaître dans l’annuaire public. Les amis acceptés peuvent voir uniquement les éléments de collection ou de decks que vous autorisez dans vos réglages de partage.',
        'Lunidex ne vend pas ces données et ne les utilise pas pour de la publicité personnalisée. Les mots de passe sont gérés par le service d’authentification et ne sont pas enregistrés dans le code de Lunidex.',
      ] },
      { id: 'bases', title: '2. Finalités et bases légales', table: { headers: ['Traitement', 'Base légale'], rows: [
        ['Compte, authentification et synchronisation', 'Exécution du service demandé et mesures précontractuelles lorsque vous créez un compte (article 6.1.b du RGPD).'],
        ['Réponse aux messages de contact', 'Intérêt légitime à répondre à votre demande ; obligation légale lorsque vous exercez un droit (article 6.1.f ou 6.1.c du RGPD).'],
        ['Mesure d’audience et mesure produit Neon', 'Consentement préalable et distinct, retirable à tout moment (article 6.1.a du RGPD).'],
        ['Sécurité, anti-abus et disponibilité', 'Intérêt légitime à sécuriser et maintenir le service (article 6.1.f du RGPD).'],
        ['Notifications push', 'Consentement donné lors de l’activation de la fonctionnalité et permission du navigateur ou de l’appareil.'],
      ] } },
      { id: 'local-storage', title: '3. Stockage dans le navigateur', paragraphs: [
        'Le navigateur conserve des éléments nécessaires à l’expérience : la langue choisie (cookie primedex-lang), le choix de consentement (localStorage primedex-consent-v2), des marqueurs de session de mesure et un cache local de réponses publiques PokéAPI/TCGdex. Ces caches ne constituent pas votre espace personnel synchronisé.',
        'Le shell de l’application utilise aussi un stockage local technique. Les données personnelles synchronisables ont pour source le compte et l’API user-state lorsque vous êtes connecté ; elles ne sont pas présentées comme une collection anonyme durable sur cet appareil.',
      ] },
      { id: 'measurement', title: '4. Mesure, logs et données techniques', paragraphs: [
        'Vercel Web Analytics et Speed Insights ne sont montés qu’après votre consentement distinct « audience et performance ». La mesure produit Neon est également facultative : si vous l’autorisez, Lunidex envoie uniquement des événements TCG prédéfinis et des propriétés limitées afin de produire des compteurs journaliers agrégés. Ces événements ne sont pas reliés à user_state ni à votre compte.',
        'L’infrastructure et les protections anti-abus peuvent traiter des informations techniques de requête, comme l’adresse IP, les en-têtes, l’URL, l’horodatage et le code de réponse. Le code de la route de contact valide et limite les requêtes mais ne stocke ni ne journalise le contenu du message.',
      ] },
      { id: 'recipients', title: '5. Services, destinataires et transferts', paragraphs: [
        'Neon fournit l’authentification et les données applicatives lorsque ces variables sont configurées. Vercel héberge et distribue l’application. Resend reçoit les informations nécessaires à l’envoi des messages du formulaire (adresse e-mail, nom, sujet et contenu). PokéAPI, TCGdex et les hébergeurs d’images fournissent des données publiques demandées par l’application. Chaque fournisseur peut traiter des données techniques selon ses propres conditions.',
        'Resend et Vercel peuvent traiter des données aux États-Unis ou dans d’autres pays selon leur configuration. Les transferts sont encadrés par les garanties publiées par les prestataires, notamment leurs accords de traitement et mécanismes de transfert applicables. Consultez leurs politiques et accords : https://resend.com/legal/dpa et https://vercel.com/legal/dpa.',
        'Lunidex ne met en place aucun pixel publicitaire, aucune revente de données et aucun profilage publicitaire. Les cookies d’authentification sont gérés par Neon Auth ; leur nom et leur durée peuvent dépendre de la configuration du fournisseur.',
      ] },
      { id: 'retention', title: '6. Durées de conservation', table: { headers: ['Catégorie', 'Durée'], rows: [
        ['Données de compte, profil et espace synchronisé', 'Jusqu’à la suppression du compte ou à la fin de la relation, puis suppression des données applicatives dans le cadre de la procédure de compte.'],
        ['Mesure produit Neon', 'Compteurs journaliers agrégés conservés pendant 90 jours ; les données plus anciennes sont purgées avant chaque nouvelle écriture de mesure.'],
        ['Messages de contact', 'Non conservés dans la base Lunidex ; Resend peut traiter et conserver le message selon ses conditions et sa politique de conservation.'],
        ['Journaux techniques et sécurité', 'Selon les durées configurées par Vercel, Neon et les autres prestataires d’infrastructure, limitées à ce qui est nécessaire à la sécurité et au fonctionnement.'],
      ] } },
      { id: 'rights', title: '7. Vos droits et contact', paragraphs: [
        'Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation du traitement, la portabilité lorsque celle-ci est applicable, ou vous opposer à un traitement fondé sur l’intérêt légitime. Vous pouvez retirer votre consentement à tout moment, sans effet rétroactif sur les traitements déjà réalisés.',
        'Vous pouvez refuser ou retirer séparément les mesures Vercel et Neon depuis le bandeau de consentement ou le bouton « Gérer mes préférences » du pied de page. Le retrait empêche les intégrations concernées de se charger et supprime les marqueurs de mesure locaux prévus par l’application.',
        `Pour exercer un droit, écrivez à ${contact} ou utilisez la procédure de compte prévue par l’application. Une vérification raisonnable peut être nécessaire avant de modifier ou supprimer des données liées à un compte.`,
        'Vous pouvez également introduire une réclamation auprès de la CNIL : https://www.cnil.fr/.',
      ] },
    ],
  },
  terms: {
    title: 'Conditions générales d’utilisation',
    intro: 'Ces conditions encadrent l’utilisation de Lunidex, un projet indépendant et non affilié aux titulaires des marques Pokémon.',
    preamble: 'La consultation des contenus publics est gratuite. Certaines fonctions personnelles nécessitent un compte et dépendent de la disponibilité de l’authentification et de la synchronisation.',
    lastUpdated: updated,
    effectiveDate: updated,
    sections: [
      { id: 'service', title: '1. Service', paragraphs: ['Lunidex propose un Pokédex, des outils d’équipe, un quiz et un catalogue Pokémon TCG à titre informatif et ludique. Les données provenant de PokéAPI, TCGdex et d’autres sources peuvent changer, être incomplètes ou devenir indisponibles.', 'Aucun achat, abonnement ou paiement n’est proposé par le code actuel du site.'] },
      { id: 'account', title: '2. Compte et espace personnel', paragraphs: ['Vous pouvez parcourir le site sans compte. La sauvegarde et la synchronisation de votre espace personnel nécessitent une session authentifiée lorsque le service Neon est disponible. Vous êtes responsable de l’adresse e-mail utilisée et de la confidentialité de votre session.', 'N’utilisez pas le service pour tenter d’accéder aux données d’un autre utilisateur, contourner les limites anti-abus, automatiser un scraping massif ou publier un contenu illicite.'] },
      { id: 'property', title: '3. Sources et propriété intellectuelle', paragraphs: ['Lunidex est un projet de fan indépendant. Pokémon et les éléments associés restent la propriété de Nintendo, Game Freak, Creatures Inc. et The Pokémon Company. Le code original de Lunidex est publié sous sa licence indiquée dans le dépôt ; cette licence ne couvre pas les marques ni les contenus tiers.'] },
      { id: 'availability', title: '4. Disponibilité', paragraphs: ['Le service est fourni selon disponibilité. Une API tierce, l’authentification, la synchronisation, une route ou une fonctionnalité peuvent être temporairement indisponibles. Nous ne promettons pas de conservation permanente des données ni une disponibilité ininterrompue.'] },
      { id: 'contact', title: '5. Contact', paragraphs: [`Pour toute question relative à ces conditions, contactez-nous à ${contact}.`] },
    ],
  },
  legalNotice: {
    title: 'Mentions légales',
    intro: 'Ces informations identifient l’éditeur du projet et ses principaux prestataires techniques. Elles sont présentées sous réserve des informations contractuelles et administratives à jour.',
    preamble: 'Lunidex est un projet personnel, indépendant et non commercial.',
    lastUpdated: updated,
    effectiveDate: updated,
    sections: [
      { id: 'editor', title: '1. Éditeur', table: { headers: ['Champ', 'Valeur'], rows: [['Nom du projet', 'Lunidex'], ['Éditeur / responsable de la publication', `${editor} (particulier non professionnel)`], ['Statut', 'Projet personnel indépendant et non commercial'], ['Contact', contact]] } },
      { id: 'host', title: '2. Hébergement et services', paragraphs: [`L’application est déployée avec Vercel. Hébergeur : ${vercelAddressFr} — ${vercelContact}. L’authentification et la base applicative peuvent être fournies par Neon lorsque la configuration de production les active. Resend peut être utilisé pour acheminer les messages de contact. Les données Pokémon et TCG sont demandées à des services tiers identifiés dans la politique de confidentialité.`] },
      { id: 'activity', title: '3. Activité', paragraphs: ['Lunidex est un Pokédex, un espace d’outils Pokémon et un catalogue TCG gratuits, sans publicité et sans transaction commerciale dans le code actuel. Les fonctions de compte et de synchronisation sont facultatives pour la consultation publique.'] },
      { id: 'contact', title: '4. Contact', paragraphs: [`Pour toute question, signalement ou demande relative aux données, écrivez à ${contact}.`] },
      { id: 'affiliation', title: '5. Non-affiliation', paragraphs: ['Lunidex n’est pas affilié, sponsorisé ni approuvé par Nintendo, Game Freak, Creatures Inc. ou The Pokémon Company.'] },
    ],
  },
  cookies: {
    title: 'Politique de cookies et de stockage local',
    intro: 'Cette page décrit les cookies, stockages locaux et intégrations de mesure réellement utilisés par Lunidex.',
    preamble: 'Les mesures facultatives ne sont pas chargées avant votre choix. Vous pouvez modifier ou retirer ce choix à tout moment.',
    lastUpdated: updated,
    effectiveDate: updated,
    sections: [
      { id: 'inventory', title: '1. Éléments nécessaires et facultatifs', table: { headers: ['Élément', 'Finalité', 'Durée indicative'], rows: [['primedex-lang', 'Mémoriser la langue choisie', '1 an'], ['primedex-consent-v2', 'Mémoriser les choix de mesure', 'Jusqu’à modification ou suppression'], ['Cookies Neon Auth', 'Maintenir la session de compte', 'Selon la configuration Neon Auth'], ['Vercel Web Analytics et Speed Insights', 'Mesure d’audience et de performance', 'Après consentement, selon la configuration Vercel'], ['Mesure produit Neon', 'Compteurs TCG agrégés', '90 jours']] } },
      { id: 'local', title: '2. Stockage local', paragraphs: ['localStorage et sessionStorage servent notamment au consentement, aux marqueurs de session et à l’état technique de l’application. IndexedDB peut contenir un cache de réponses publiques Pokémon et TCG. Le stockage local n’est pas décrit comme le lieu de conservation durable de votre espace personnel synchronisé.'] },
      { id: 'measurement', title: '3. Mesure facultative', paragraphs: ['Vercel Web Analytics et Speed Insights sont chargés uniquement si vous accordez le choix « audience et performance ». Neon reçoit uniquement la mesure produit TCG limitée et agrégée si vous accordez le choix distinct « mesure produit ». Aucun de ces choix n’est nécessaire pour consulter les pages publiques.'] },
      { id: 'manage', title: '4. Gérer vos choix', paragraphs: ['Utilisez le bouton « Gérer mes préférences » dans le pied de page, ou effacez les données du site dans votre navigateur. Effacer le stockage peut supprimer des préférences locales et fermer votre session ; les données synchronisées restent rattachées au compte selon la configuration du service.'] },
      { id: 'contact', title: '5. Contact', paragraphs: [`Pour toute question concernant cette politique, écrivez à ${contact}.`] },
    ],
  },
};

const en: LegalDocuments = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This page describes the data Lunidex processes according to the features actually enabled. It is not personalized legal advice.',
    preamble: 'You can browse the Pokédex and TCG catalog without an account. Features that save a personal workspace use an account session and Neon synchronization when configured.',
    lastUpdated: updatedEn,
    effectiveDate: updatedEn,
    sections: [
      { id: 'account-data', title: '1. Account and personal data', paragraphs: [`Data controller: ${editor}, a non-professional publisher of Lunidex. For data questions, use ${contact}.`, 'Creating an account is optional for public pages. When an account is created, Neon Auth processes the email address, session identifiers and, if provided, a name or username. Google or GitHub sign-in may be available depending on the service configuration; the selected provider participates in that authentication flow.', 'When signed in, your personal workspace may synchronize with Neon the data you choose to use: favorites, caught Pokémon, teams, comparisons, progress, quiz data, TCG collection and lists, saved searches, settings and related features. Public profiles, friends, price alerts, battle rooms and notifications are processed only if you use those features.', 'If you enable a public profile, your handle, display name, avatar, membership date and selected progress counters may appear in the public directory. Accepted friends can see only the collection or deck information enabled in your sharing settings.', 'Lunidex does not sell this data or use it for personalized advertising. Passwords are managed by the authentication service and are not stored in Lunidex code.'] },
      { id: 'bases', title: '2. Purposes and legal bases', table: { headers: ['Processing', 'Legal basis'], rows: [['Account, authentication and synchronization', 'Performance of the requested service and pre-contractual steps when you create an account (GDPR Article 6(1)(b)).'], ['Contact requests', 'Legitimate interest in answering your request; legal obligation when you exercise a right (GDPR Article 6(1)(f) or 6(1)(c)).'], ['Vercel audience measurement and Neon product measurement', 'Separate prior consent, which can be withdrawn at any time (GDPR Article 6(1)(a)).'], ['Security, abuse prevention and availability', 'Legitimate interest in securing and maintaining the service (GDPR Article 6(1)(f)).'], ['Push notifications', 'Consent given when enabling the feature and permission from your browser or device.']] } },
      { id: 'local-storage', title: '3. Browser storage', paragraphs: ['Your browser keeps elements needed for the experience: the selected language (primedex-lang cookie), consent choices (primedex-consent-v2 localStorage), measurement session markers, and a local cache of public PokéAPI/TCGdex responses. These caches are not your synchronized personal workspace.', 'The application shell also uses technical local storage. Syncable personal data is sourced from the account and the user-state API when you are signed in; it is not presented as a durable anonymous collection on this device.'] },
      { id: 'measurement', title: '4. Measurement, logs and technical data', paragraphs: ['Vercel Web Analytics and Speed Insights are mounted only after your separate audience and performance consent. Neon product measurement is also optional: when allowed, Lunidex sends only predefined TCG events and limited properties to produce aggregated daily counters retained for 90 days. These events are not joined to user_state or your account.', 'Infrastructure and abuse protection may process technical request information such as IP address, headers, URL, timestamp and response code. The contact route validates, rate-limits and forwards messages through Resend but does not store or log message content in Lunidex.'] },
      { id: 'recipients', title: '5. Services, recipients and transfers', paragraphs: ['Neon provides authentication and application data when those variables are configured. Vercel hosts and distributes the application. Resend receives the information required to send contact messages (email address, name, subject and content). PokéAPI, TCGdex and image hosts provide public data requested by the application. Each provider may process technical data under its own terms.', 'Resend and Vercel may process data in the United States or other countries according to their configuration. Transfers rely on the safeguards published by the providers, including applicable data processing agreements and transfer mechanisms. See https://resend.com/legal/dpa and https://vercel.com/legal/dpa.', 'Lunidex does not deploy advertising pixels, sell data or create advertising profiles. Authentication cookies are managed by Neon Auth; their name and lifetime may depend on the provider configuration.'] },
      { id: 'retention', title: '6. Retention periods', table: { headers: ['Category', 'Period'], rows: [['Account, profile and synchronized workspace data', 'Until account deletion or the end of the relationship, followed by deletion of application data through the account procedure.'], ['Neon product measurement', 'Aggregated daily counters are retained for 90 days; older rows are purged before each new measurement write.'], ['Contact messages', 'Not stored in the Lunidex database; Resend may process and retain the message according to its terms and retention policy.'], ['Technical and security logs', 'According to the periods configured by Vercel, Neon and other infrastructure providers, limited to what is needed for security and operation.']] } },
      { id: 'rights', title: '7. Your rights and contact', paragraphs: ['You may request access to your data, rectification, erasure, restriction of processing, portability where applicable, or object to processing based on legitimate interests. You may withdraw consent at any time, without affecting processing already carried out.', 'You can refuse or withdraw Vercel and Neon measurement separately through the consent banner or the Manage preferences button in the footer. Withdrawal prevents the affected integrations from loading and clears the local measurement markers handled by the application.', `To exercise a right, email ${contact} or use the account procedure provided by the application. A reasonable verification may be needed before changing or deleting account-linked data.`, 'You may also lodge a complaint with the CNIL: https://www.cnil.fr/.'] },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'These terms govern use of Lunidex, an independent project not affiliated with Pokémon rights holders.',
    preamble: 'Public content is free to browse. Some personal features require an account and depend on authentication and synchronization availability.',
    lastUpdated: updatedEn,
    effectiveDate: updatedEn,
    sections: [
      { id: 'service', title: '1. Service', paragraphs: ['Lunidex provides a Pokédex, team tools, a quiz and a Pokémon TCG catalog for informational and entertainment purposes. Data from PokéAPI, TCGdex and other sources may change, be incomplete or become unavailable.', 'The current site code offers no purchase, subscription or payment flow.'] },
      { id: 'account', title: '2. Account and personal workspace', paragraphs: ['You can browse the site without an account. Saving and synchronizing a personal workspace requires an authenticated session when Neon is available. You are responsible for the email address you use and for keeping your session secure.', 'Do not attempt to access another user’s data, bypass abuse limits, automate mass scraping or publish unlawful content.'] },
      { id: 'property', title: '3. Sources and intellectual property', paragraphs: ['Lunidex is an independent fan project. Pokémon and related elements remain the property of Nintendo, Game Freak, Creatures Inc. and The Pokémon Company. Lunidex’s original code is released under the license stated in the repository; that license does not cover Pokémon marks or third-party content.'] },
      { id: 'availability', title: '4. Availability', paragraphs: ['The service is provided as available. A third-party API, authentication, synchronization, route or feature may be temporarily unavailable. We do not promise permanent data retention or uninterrupted availability.'] },
      { id: 'contact', title: '5. Contact', paragraphs: [`For questions about these terms, contact ${contact}.`] },
    ],
  },
  legalNotice: {
    title: 'Legal Notice',
    intro: 'This page identifies the project publisher and its main technical providers, subject to current contractual and administrative information.',
    preamble: 'Lunidex is an independent, personal, non-commercial project.',
    lastUpdated: updatedEn,
    effectiveDate: updatedEn,
    sections: [
      { id: 'editor', title: '1. Publisher', table: { headers: ['Field', 'Value'], rows: [['Project name', 'Lunidex'], ['Publisher / publication manager', `${editor} (non-professional individual)`], ['Status', 'Independent personal, non-commercial project'], ['Contact', contact]] } },
      { id: 'host', title: '2. Hosting and services', paragraphs: [`The application is deployed with Vercel. Hosting provider: ${vercelAddressEn} — ${vercelContact}. Authentication and application data may be provided by Neon when production configuration enables them. Resend may be used to deliver contact messages. Pokémon and TCG data is requested from third-party services identified in the privacy policy.`] },
      { id: 'activity', title: '3. Activity', paragraphs: ['Lunidex is a free Pokédex, Pokémon tools and TCG catalog with no advertising or commercial transaction in the current code. Account and synchronization features are optional for public browsing.'] },
      { id: 'contact', title: '4. Contact', paragraphs: [`For questions, reports or data requests, email ${contact}.`] },
      { id: 'affiliation', title: '5. No affiliation', paragraphs: ['Lunidex is not affiliated with, sponsored by or approved by Nintendo, Game Freak, Creatures Inc. or The Pokémon Company.'] },
    ],
  },
  cookies: {
    title: 'Cookie and Local Storage Policy',
    intro: 'This page describes the cookies, local storage and measurement integrations actually used by Lunidex.',
    preamble: 'Optional measurement is not loaded before you choose. You can change or withdraw your choice at any time.',
    lastUpdated: updatedEn,
    effectiveDate: updatedEn,
    sections: [
      { id: 'inventory', title: '1. Necessary and optional elements', table: { headers: ['Element', 'Purpose', 'Indicative lifetime'], rows: [['primedex-lang', 'Remember the selected language', '1 year'], ['primedex-consent-v2', 'Remember measurement choices', 'Until changed or deleted'], ['Neon Auth cookies', 'Maintain the account session', 'According to Neon Auth configuration'], ['Vercel Web Analytics and Speed Insights', 'Audience and performance measurement', 'After consent, according to Vercel configuration'], ['Neon product measurement', 'Aggregated TCG counters', '90 days']] } },
      { id: 'local', title: '2. Local storage', paragraphs: ['localStorage and sessionStorage are used for consent, session markers and technical application state. IndexedDB may contain a cache of public Pokémon and TCG responses. Local storage is not described as the durable location for your synchronized personal workspace.'] },
      { id: 'measurement', title: '3. Optional measurement', paragraphs: ['Vercel Web Analytics and Speed Insights load only if you grant the audience and performance choice. Neon receives only limited, aggregated TCG product measurement if you grant the separate product measurement choice. Neither choice is required for public pages.'] },
      { id: 'manage', title: '4. Managing choices', paragraphs: ['Use the Manage preferences button in the footer, or clear site data in your browser. Clearing storage may remove local preferences and close your session; synchronized data remains associated with the account according to the configured service.'] },
      { id: 'contact', title: '5. Contact', paragraphs: [`For questions about this policy, email ${contact}.`] },
    ],
  },
};

/** French and English are the maintained legal copies; other locales use the same verified English facts until translated. */
export function getActualLegalDocuments(language: SupportedLanguage): LegalDocuments {
  return language === 'fr' ? fr : language === 'en' ? en : en;
}
