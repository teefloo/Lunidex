import type { LegalDocument } from '../legal-types';

const privacy: LegalDocument = {
  title: 'Privacy Policy',
  intro:
    'This policy describes how we process your personal data when you use Lunidex, in compliance with the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).',
  preamble:
    "Lunidex is a non-commercial, fan-made website not affiliated with Nintendo, Game Freak, The Pokémon Company, or Creatures Inc. We take the protection of your privacy very seriously. This policy explains, in full transparency, what data is collected, why, how it is used, how long it is kept, and what your rights are.",
  lastUpdated: 'June 4, 2026',
  effectiveDate: 'June 4, 2026',
  sections: [
    {
      id: 'controller',
      title: '1. Data Controller',
      intro: 'The data controller for your personal data is:',
      paragraphs: [
        "Lunidex is published by an individual on a personal, non-commercial basis. There is no legal entity, no company registration number, and no separate legal representative.",
        "The publisher acts as the data controller within the meaning of Article 4(7) of the GDPR. They determine the purposes and means of processing your personal data.",
      ],
      table: {
        headers: ['Role', 'Identity', 'Contact'],
        rows: [
          ['Publisher (Data Controller)', 'Individual — Lunidex', 'estdel3012@gmail.com'],
          ['Host (Processor)', 'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA', 'privacy@vercel.com'],
          ['Data Protection Officer', 'Not designated (low-risk processing)', 'estdel3012@gmail.com'],
        ],
      },
      callout: {
        type: 'info',
        text: 'No data is transferred to a third country outside the European Union without adequate safeguards (Standard Contractual Clauses or adequacy decision).',
      },
    },
    {
      id: 'data',
      title: '2. Data Collected',
      intro: 'Lunidex collects only the minimum data necessary to operate the service.',
      subsections: [
        {
          id: 'data-personal',
          title: '2.1. Personal Data',
          paragraphs: [
            "We do not collect any direct identification data (name, surname, email address, phone number, postal address, date of birth) when you use the site. No registration or account creation is required.",
          ],
          list: [
            'No identity data (name, surname, username).',
            'No email address or direct contact (unless you contact us voluntarily).',
            'No password or session identifier managed by us.',
            'No payment, banking, or commercial data.',
            'No precise geolocation data.',
            'No biometric data.',
          ],
        },
        {
          id: 'data-local',
          title: '2.2. Locally Stored Data (IndexedDB)',
          paragraphs: [
            "The following data is stored exclusively in your browser's local database (IndexedDB). It is never transmitted to our servers or to any third party, and we have no access to it:",
          ],
          list: [
            'Your favorite Pokémon (numeric identifiers).',
            'Your team compositions.',
            'Your "caught" Pokémon statuses (personal Pokédex).',
            'Your in-progress Pokémon comparisons.',
            'Your Trading Card Game (TCG) collection: owned, wishlisted, watched cards.',
            'Your personal notes on cards.',
            'Your saved searches and internal browsing history.',
            'Your quiz sessions and scores (WhosThat, type effectiveness, etc.).',
            'Your display preferences: light/dark theme, language, sound, notifications.',
            'Your unlocked badges and achievements.',
          ],
          callout: {
            type: 'success',
            text: 'This data stays on your device. You can delete it at any time via the site settings ("Reset my data" section) or by clearing your browser storage data.',
          },
        },
        {
          id: 'data-technical',
          title: '2.3. Automatically Transmitted Technical Data',
          paragraphs: [
            'Upon any connection to Lunidex, your browser automatically exchanges technical information with our infrastructure and our processors. This data is strictly necessary for the establishment and proper operation of the communication:',
          ],
          table: {
            headers: ['Category', 'Data', 'Purpose', 'Legal basis (GDPR)'],
            rows: [
              ['Technical', 'IP address', 'Network routing, security, anti-abuse, CDN geolocation', 'Legitimate interest (Art. 6.1.f)'],
              ['Technical', 'User-Agent (browser, OS)', 'Display compatibility, debugging', 'Legitimate interest (Art. 6.1.f)'],
              ['Technical', 'HTTP headers (Referer, Accept-Language)', 'Routing, language detection', 'Legitimate interest (Art. 6.1.f)'],
              ['Logs', 'Vercel access logs (timestamp, URL, HTTP code)', 'Security, incident detection, debugging', 'Legitimate interest (Art. 6.1.f)'],
            ],
          },
        },
        {
          id: 'data-cookies',
          title: '2.4. Cookies and Trackers',
          paragraphs: [
            'Lunidex uses strictly necessary storage for the service. With your consent, Vercel Web Analytics and Speed Insights measure audience and performance, while Supabase stores only daily product-measurement counters. See our cookie policy for the separate purposes and choices.',
          ],
          list: [
            'primedex-lang (duration: 1 year): remembers your preferred language.',
            'tcg-user-state (duration: 1 year): preserves your UI state on TCG pages.',
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '3. Purposes and Legal Bases',
      intro: 'In accordance with Article 6 of the GDPR, each data processing activity relies on a specific legal basis:',
      table: {
        headers: ['Purpose', 'Data concerned', 'Legal basis'],
        rows: [
          ['Provision of Pokédex and TCG service', 'Technical data (IP, UA)', 'Service provision / Legitimate interest (Art. 6.1.f)'],
          ['Memorization of language and preferences', 'Functional cookies', 'Legitimate interest (Art. 6.1.f) — CNIL consent exemption'],
          ['Hosting and content delivery', 'All technical data', 'Hosting contract (Art. 6.1.b) with Vercel'],
          ['Security, anti-abuse, debugging', 'Vercel logs, IP', 'Legitimate interest (Art. 6.1.f)'],
          ['Responding to your contact requests', 'Email, message content', 'Pre-contractual measures or consent (Art. 6.1.a/b)'],
          ['Local storage of your preferences', 'IndexedDB data', 'Outside GDPR — local storage on your device'],
        ],
      },
    },
    {
      id: 'recipients',
      title: '4. Recipients and Processors',
      intro: 'Your data is only shared with the processors strictly necessary to operate the service. No commercial transfer is made.',
      paragraphs: [
        'Lunidex does not sell, rent, or transfer any personal data to third parties for commercial or marketing purposes. No profiling or automated decision-making producing legal effects is performed.',
      ],
      table: {
        headers: ['Processor', 'Service', 'Country', 'Transfer safeguards'],
        rows: [
          ['Vercel Inc.', 'CDN hosting, SSR, logs', 'USA', 'EU-US Data Privacy Framework + SCCs'],
          ['PokéAPI (Paul Hallett)', 'Public Pokémon data API', 'USA/EU', 'No personal data transmitted'],
          ['TCGdex', 'Public TCG cards API', 'EU/France', 'No personal data transmitted'],
          ['Scrydex', 'TCG image hosting', 'EU', 'No personal data transmitted'],
          ['GitHub (raw.githubusercontent.com)', 'Sprites hosting', 'USA', 'No personal data transmitted'],
        ],
      },
    },
    {
      id: 'transfers',
      title: '5. International Transfers',
      paragraphs: [
        'The site is hosted by Vercel Inc., a company based in the United States. Data transfers to the United States are governed by the European Commission adequacy decision on the EU-US Data Privacy Framework (DPF) of July 10, 2023, and, subsidiarily, by the Standard Contractual Clauses (SCCs) adopted by the European Commission.',
        'The other third-party services (PokéAPI, TCGdex, Scrydex, GitHub) do not receive any personal data about you: only the technical data necessary to route requests is transmitted to them.',
      ],
      callout: {
        type: 'info',
        text: 'To exercise your rights or obtain a copy of the transfer safeguards, you can contact us at estdel3012@gmail.com.',
      },
    },
    {
      id: 'retention',
      title: '6. Data Retention',
      intro: 'We apply the principle of data minimization for retention periods:',
      table: {
        headers: ['Data category', 'Retention period'],
        rows: [
          ['Local IndexedDB data', 'Until you delete it (via settings or browser)'],
          ['Functional cookies', 'Maximum 1 year'],
          ['Vercel logs', 'Maximum 30 days (Vercel internal rotation policy)'],
          ['Contact emails', '3 years after the last exchange (accounting obligation)'],
        ],
      },
    },
    {
      id: 'security',
      title: '7. Security',
      paragraphs: [
        'Lunidex implements appropriate technical and organizational measures to protect your data against unauthorized access, modification, disclosure, or destruction.',
      ],
      list: [
        'HTTPS/TLS 1.3 encryption across the entire site (HSTS enabled).',
        'Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, restrictive Permissions-Policy.',
        'Strict Content Security Policy (CSP) limiting script execution and image sources.',
        'No sensitive data (password, payment) is stored — the attack surface is therefore reduced.',
        'Regular dependency updates (npm audit and Dependabot alerts).',
        'Open source and auditable code on GitHub (transparency by design).',
      ],
    },
    {
      id: 'rights',
      title: '8. Your Rights',
      intro: 'Under the GDPR (Articles 15 to 22) and the CCPA, you have the following rights regarding your personal data:',
      list: [
        'Right of access (Art. 15 GDPR): obtain a copy of your data.',
        'Right of rectification (Art. 16 GDPR): correct inaccurate data.',
        'Right to erasure (Art. 17 GDPR): request deletion of your data.',
        'Right to restriction (Art. 18 GDPR): temporarily restrict processing.',
        'Right to portability (Art. 20 GDPR): receive your data in a structured format (mainly applies to local data).',
        'Right to object (Art. 21 GDPR): object to processing based on legitimate interest.',
        'Right to withdraw consent (Art. 7.3 GDPR): when processing is based on consent.',
        'Right to lodge a complaint with a supervisory authority (Art. 77 GDPR).',
        'CCPA rights (California residents): right to know, delete, opt out, and non-discrimination.',
      ],
      paragraphs: [
        'To exercise any of these rights, write to us at estdel3012@gmail.com. We will respond within a maximum of 30 days. Proof of identity may be required to verify that the request comes from you.',
        'You may also lodge a complaint with the CNIL (Commission Nationale de l\'Informatique et des Libertés, www.cnil.fr) or, for EU residents, with your national data protection authority. For California residents, you may contact the California Attorney General (oag.ca.gov).',
      ],
    },
    {
      id: 'children',
      title: '9. Protection of Minors',
      paragraphs: [
        'Lunidex is aimed at a family audience and may be consulted by minors. The site does not knowingly collect any personal data from children under 16 (or the applicable age under local law) without parental consent.',
        'The site does not offer any section reserved for children, does not offer messaging, and does not collect information that would directly identify a minor. Parents who believe their child has provided personal information may contact us to request its deletion.',
        'In compliance with the COPPA (Children\'s Online Privacy Protection Act) and the GDPR, no data is knowingly collected from children under 13 (COPPA) or 16 (GDPR, unless a lower age is set by the Member State).',
      ],
    },
    {
      id: 'third-parties',
      title: '10. Third-Party Services and External Links',
      paragraphs: [
        'Lunidex relies on third-party APIs and services to provide the displayed data (PokéAPI, TCGdex, Scrydex, GitHub). These services have their own privacy policies, which we encourage you to consult.',
        'The site may also offer links to external sites (e.g., the official Pokémon page, YouTube videos, shops). We are not responsible for the content or privacy practices of these third-party sites.',
      ],
    },
    {
      id: 'changes',
      title: '11. Changes to This Policy',
      paragraphs: [
        'This privacy policy may be updated to reflect changes in the service, regulation, or our practices. The date of the last update is indicated at the top of this page.',
        'In case of a material change, a notification will be displayed in a visible manner on the site (e.g., via a temporary banner). We encourage you to consult this page regularly.',
      ],
    },
    {
      id: 'contact',
      title: '12. Contact',
      intro: 'For any question regarding this privacy policy or the exercise of your rights:',
      table: {
        headers: ['Channel', 'Detail'],
        rows: [
          ['Email', 'estdel3012@gmail.com'],
          ['Response time', 'Maximum 30 days (Art. 12.3 GDPR)'],
          ['Languages', 'French or English'],
          ['Source code', 'github.com/Teeflo/Poke (public issues)'],
        ],
      },
    },
  ],
};

const terms: LegalDocument = {
  title: 'Terms of Service',
  intro:
    "These terms of service (TOS) govern your access to and use of Lunidex. By accessing the site, you agree to be bound by these terms.",
  preamble:
    'Lunidex is a personal, free, ad-free, non-monetized fan project. It is provided "as is", for entertainment and information purposes about the Pokémon universe. Any use of the site constitutes acceptance of these TOS.',
  lastUpdated: 'June 4, 2026',
  effectiveDate: 'June 4, 2026',
  sections: [
    {
      id: 'object',
      title: '1. Purpose',
      paragraphs: [
        'Lunidex is a non-commercial website cataloging data related to Pokémon (numbers, types, statistics, descriptions, evolutions, abilities, sprites) and to the Trading Card Game (TCG) cards of the same universe. It is a fan project for purely informational and recreational purposes.',
        'The site is provided free of charge and without advertising. No purchase, subscription, or registration is required to use the service.',
      ],
    },
    {
      id: 'affiliation',
      title: '2. Non-Affiliation and Intellectual Property',
      intro: 'Lunidex is in no way affiliated with, sponsored by, supported by, or approved by:',
      list: [
        'Nintendo Co., Ltd.',
        'Game Freak Inc.',
        'Creatures Inc.',
        'The Pokémon Company (TPC) and its subsidiaries.',
        'Pokémon Center, Wizards of the Coast (Hasbro), or any other rights holder related to the Pokémon trademark.',
      ],
      paragraphs: [
        'Trademarks, names, sprites, illustrations, sounds, videos, and any other content related to the Pokémon universe remain the exclusive property of their respective rights holders. Lunidex claims no ownership of them.',
        'The use of Pokémon trademarks and content is made for non-commercial fan project purposes, which, in most jurisdictions, constitutes descriptive and informational use that is inherently permitted. If a rights holder believes that any content infringes their rights, we undertake to remove it promptly after notification at estdel3012@gmail.com.',
        "The site's source code is released under the MIT License (open source). This does not grant any rights over the Pokémon trademarks: the MIT License applies only to the code written by the Lunidex author.",
      ],
    },
    {
      id: 'sources',
      title: '3. Data Sources',
      paragraphs: [
        'The data displayed by Lunidex comes exclusively from public, community-driven third-party sources: PokéAPI (pokeapi.co, maintained by Paul Hallett) and TCGdex (api.tcgdex.net). Images are hosted by Scrydex and GitHub (raw.githubusercontent.com).',
        'We strive to display accurate and up-to-date data, but we do not guarantee the absence of errors, omissions, or sync delays with the sources. Data is provided for informational purposes and is not a substitute for official sources.',
      ],
    },
    {
      id: 'usage',
      title: '4. Authorized and Prohibited Uses',
      intro: 'You are authorized to use Lunidex for personal, non-commercial, and informational purposes. The following are notably prohibited:',
      list: [
        'Any commercial, advertising, or resale use of site access.',
        'Any attempt at massive or automated scraping beyond normal use (e.g., more than 60 requests per minute, or wholesale copying of the database).',
        'Any attempt to circumvent security measures, rate limits, or CSP headers.',
        'Any injection of malicious content (script, iframe, upload) through user fields (search, comparison, etc.).',
        "Any use of the site to harass, threaten, defame, or otherwise infringe the rights of others.",
        "Any attempt to identify or profile other users.",
        'Any resale, redistribution, or republication of site content without prior written authorization.',
      ],
    },
    {
      id: 'availability',
      title: '5. Service Availability',
      paragraphs: [
        'Lunidex is provided "as is" and "as available". The publisher strives to keep the site accessible 24/7, but does not guarantee uninterrupted availability.',
        'The service may be temporarily interrupted for maintenance, updates, technical issues, or force majeure. No compensation may be claimed on this basis.',
      ],
    },
    {
      id: 'responsibility',
      title: '6. Liability',
      intro: 'Within the limits authorized by applicable law:',
      list: [
        'Lunidex cannot be held liable for indirect, incidental, special, or consequential damages resulting from the use of or inability to use the site.',
        'The publisher does not guarantee the accuracy, completeness, or timeliness of the displayed data.',
        'The publisher cannot be held liable for the content of third-party sites accessible via links from Lunidex.',
        'The user is solely responsible for the use they make of the information provided by the site.',
      ],
      paragraphs: [
        'If any provision of these TOS is found to be invalid or unenforceable by a competent court, the other provisions shall remain in full force and effect.',
      ],
    },
    {
      id: 'accountability',
      title: '7. Reporting Illegal Content',
      paragraphs: [
        'If you believe that any content displayed on Lunidex infringes your rights (intellectual property, defamation, etc.), you can contact us at estdel3012@gmail.com specifying: the nature of the content at issue, its exact URL, your status (rights holder or representative), and any supporting evidence.',
        'We undertake to review any notification within a reasonable timeframe and, where appropriate, to remove or modify the content concerned.',
      ],
    },
    {
      id: 'modifications',
      title: '8. Changes to the TOS',
      paragraphs: [
        'These TOS may be modified at any time. The date of the last update is indicated at the top of this page. In case of a material change, a notification will be displayed on the site.',
        'Continued use of the site after publication of the modifications constitutes acceptance of the new TOS.',
      ],
    },
    {
      id: 'law',
      title: '9. Applicable Law and Jurisdiction',
      paragraphs: [
        "These TOS are governed by French law, without prejudice to the mandatory provisions applicable in your country of residence (in particular EU consumer law).",
        "In the absence of an amicable settlement, any dispute relating to the interpretation or execution of these TOS shall fall under the jurisdiction of the French courts, unless otherwise provided by law applicable to consumers.",
      ],
    },
    {
      id: 'contact',
      title: '10. Contact',
      paragraphs: [
        'For any question relating to these TOS, you can contact us at estdel3012@gmail.com.',
      ],
    },
  ],
};

const legalNotice: LegalDocument = {
  title: 'Legal Notice',
  intro:
    'These legal notices are published in accordance with Article 6 of the French Law for Confidence in the Digital Economy (LCEN) of June 21, 2004.',
  preamble:
    "Lunidex is published by an individual on a personal, non-commercial basis. No legal entity stands behind this project: it is a fan project.",
  lastUpdated: 'June 4, 2026',
  effectiveDate: 'June 4, 2026',
  sections: [
    {
      id: 'editor',
      title: '1. Site Publisher',
      intro: 'Lunidex is published by:',
      table: {
        headers: ['Field', 'Value'],
        rows: [
          ['Name', 'Lunidex (personal project name)'],
          ['Status', 'Individual — personal non-commercial project'],
          ['Publication Director', 'The individual publisher'],
          ['Contact', 'estdel3012@gmail.com'],
          ['SIRET', 'Not applicable (no legal entity)'],
          ['VAT number', 'Not applicable'],
          ['Address', 'Not published (individual)'],
          ['Publication Director', 'The site publisher'],
        ],
      },
      callout: {
        type: 'warning',
        text: "In the absence of a legal entity, Lunidex is not registered with the Trade and Companies Register (RCS) or the Crafts Register (RM). The publisher acts under their personal civil liability.",
      },
    },
    {
      id: 'host',
      title: '2. Hosting Provider',
      intro: 'The site is hosted by:',
      table: {
        headers: ['Field', 'Value'],
        rows: [
          ['Company', 'Vercel Inc.'],
          ['Legal form', 'US (Delaware) corporation'],
          ['Address', '340 S Lemon Ave #4133, Walnut, CA 91789, USA'],
          ['Website', 'vercel.com'],
          ['Contact', 'privacy@vercel.com'],
        ],
      },
    },
    {
      id: 'activity',
      title: '3. Activity and Nature of the Service',
      paragraphs: [
        'Lunidex is an online Pokédex and TCG card catalog, free, ad-free, and unmonetized. The site displays public data related to the Pokémon universe (numbers, types, statistics, sprites, cards) for strictly informational and recreational purposes.',
        'The service is provided free of charge, without registration, without collection of personal data, and without commercial transaction.',
      ],
    },
    {
      id: 'affiliation-notice',
      title: '4. Non-Affiliation',
      paragraphs: [
        "Lunidex is a non-commercial, independent, unaffiliated fan project. Trademarks, names, sprites, illustrations, and all other elements related to the Pokémon universe remain the exclusive property of Nintendo, Game Freak, Creatures Inc., and The Pokémon Company.",
        'No affiliation, partnership, sponsorship, or official endorsement from the aforementioned rights holders is to be inferred from the site. For more information, see our TOS.',
      ],
    },
    {
      id: 'contact',
      title: '5. Contact',
      paragraphs: [
        'For any request relating to the site (questions, reporting, exercise of GDPR rights), you can contact us at: estdel3012@gmail.com.',
      ],
    },
    {
      id: 'authority',
      title: '6. Supervisory Authority',
      paragraphs: [
        'For any complaint regarding the protection of your personal data, you may contact the Commission Nationale de l\'Informatique et des Libertés (CNIL): www.cnil.fr.',
      ],
    },
  ],
};

const cookies: LegalDocument = {
  title: 'Cookie Policy',
  intro:
    'This policy details the cookies and trackers placed on your device when you browse Lunidex, in accordance with CNIL guidelines and the GDPR.',
  preamble:
    'A cookie is a small text file placed on your device by a website\'s server. Some cookies are strictly necessary for the site to function; others require your prior consent.',
  lastUpdated: 'June 4, 2026',
  effectiveDate: 'June 4, 2026',
  sections: [
    {
      id: 'inventory',
      title: '1. Inventory of Cookies Used',
      intro: 'Lunidex uses strictly necessary storage for the service. Vercel audience and performance measurement and Supabase product measurement remain disabled until you grant the corresponding consent.',
      table: {
        headers: ['Cookie', 'Purpose', 'Type', 'Duration', 'Publisher'],
        rows: [
          ['primedex-lang', 'Remembers your preferred language', 'Strictly necessary (Art. 82 French Data Protection Act)', '1 year', 'Lunidex'],
          ['tcg-user-state', 'Preserves your UI state on TCG pages (filters, sorts)', 'Strictly necessary', '1 year', 'Lunidex'],
        ],
      },
      callout: {
        type: 'info',
        text: 'Strictly necessary cookies are exempt from prior consent under Article 82 of the French Data Protection Act and CNIL recommendations.',
      },
    },
    {
      id: 'details',
      title: '2. Details of Each Cookie',
      subsections: [
        {
          id: 'lang',
          title: '2.1. primedex-lang',
          paragraphs: [
            'This cookie remembers the language in which you have chosen to display the site. Without it, you would see Lunidex in the default language (English) on every visit. It contains no personal data: only an alphabetic value ("en", "fr", "de", etc.) is stored.',
          ],
          list: [
            'Publisher: Lunidex.',
            'Lifetime: maximum 1 year.',
            'Type: server-side HTTP cookie (set via the Set-Cookie header).',
            'Legal basis: legitimate interest (Art. 6.1.f GDPR) — CNIL consent exemption.',
          ],
        },
        {
          id: 'tcg',
          title: '2.2. tcg-user-state',
          paragraphs: [
            'This cookie preserves the UI state on the TCG catalog pages (active filters, display mode, last sorts) so that you can find your preferences from one visit to the next.',
          ],
          list: [
            'Publisher: Lunidex.',
            'Lifetime: maximum 1 year.',
            'Type: client-side cookie (localStorage, managed browser-side).',
            'Legal basis: legitimate interest (Art. 6.1.f GDPR) — CNIL consent exemption.',
          ],
        },
      ],
    },
    {
      id: 'no-third-party',
      title: '3. Absence of Third-Party Cookies',
      paragraphs: [
        'Lunidex does not set any third-party cookies. In particular:',
        'This policy may be updated if we decide to add a third-party service. In that case, your consent will be requested via the cookie banner before any non-strictly-necessary cookie is placed.',
      ],
      list: [
        'Vercel Web Analytics and Speed Insights are loaded only after audience and performance consent; Supabase receives only daily aggregated product counters after separate product-measurement consent.',
        'No advertising cookie (Meta Pixel, Google Ads, TikTok Pixel, etc.) is installed.',
        'No social network cookie (Facebook, Twitter share buttons, etc.) is installed.',
        'No retargeting or profiling script is loaded.',
      ],
    },
    {
      id: 'localstorage',
      title: '4. Local Storage (IndexedDB and localStorage)',
      paragraphs: [
        "In addition to cookies, Lunidex uses local storage technologies (IndexedDB, localStorage) to preserve your preferences and usage data. This data remains on your device and is never transmitted to a server.",
        'For more information on this data (favorites, teams, TCG collection, quiz scores, display preferences), see our privacy policy (section 2.2 "Locally Stored Data").',
      ],
    },
    {
      id: 'manage',
      title: '5. Manage Your Cookies',
      intro: 'You can control and delete cookies at any time:',
      list: [
        'Via your browser settings (see below).',
        'By clearing browsing data for the site primedex.vercel.app.',
        'By clicking the "Manage my preferences" button on the cookie banner, if displayed.',
        'By disabling JavaScript in your browser (at the cost of major service degradation).',
      ],
      paragraphs: ['Links to help pages for the most common browsers:'],
      table: {
        headers: ['Browser', 'Help link'],
        rows: [
          ['Google Chrome', 'support.google.com/chrome/answer/95647'],
          ['Mozilla Firefox', 'support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox'],
          ['Apple Safari', 'support.apple.com/guide/safari/sfri11471'],
          ['Microsoft Edge', 'support.microsoft.com/en-us/microsoft-edge/delete-cookies'],
        ],
      },
    },
    {
      id: 'changes',
      title: '6. Changes to This Policy',
      paragraphs: [
        'This cookie policy may be updated to reflect the addition or removal of cookies, or changes in regulation. The date of the last update is indicated at the top of this page.',
      ],
    },
    {
      id: 'contact',
      title: '7. Contact',
      paragraphs: [
        'For any question relating to this policy, you can contact us at: estdel3012@gmail.com.',
      ],
    },
  ],
};

export const enLegal = { privacy, terms, legalNotice, cookies };
