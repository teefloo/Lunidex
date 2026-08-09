import type { LegalDocument } from '../legal-types';

const privacy: LegalDocument = {
  title: 'Datenschutzerklärung',
  intro:
    'Diese Richtlinie beschreibt, wie wir Ihre personenbezogenen Daten bei der Nutzung von Lunidex verarbeiten, im Einklang mit der Datenschutz-Grundverordnung (DSGVO) und dem California Consumer Privacy Act (CCPA).',
  preamble:
    'Lunidex ist eine nicht-kommerzielle Fan-Website, die nicht mit Nintendo, Game Freak, The Pokémon Company oder Creatures Inc. verbunden ist. Wir nehmen den Schutz Ihrer Privatsphäre sehr ernst. Diese Richtlinie erklärt in voller Transparenz, welche Daten erhoben werden, warum, wie sie verwendet werden, wie lange sie gespeichert werden und welche Rechte Sie haben.',
  lastUpdated: '4. Juni 2026',
  effectiveDate: '4. Juni 2026',
  sections: [
    {
      id: 'controller',
      title: '1. Verantwortlicher',
      intro: 'Der für Ihre personenbezogenen Daten Verantwortliche ist:',
      paragraphs: [
        'Lunidex wird von einer Einzelperson auf persönlicher, nicht-kommerzieller Basis veröffentlicht. Es gibt keine juristische Person, keine Handelsregisternummer und keinen separaten gesetzlichen Vertreter.',
        'Der Herausgeber handelt als Verantwortlicher im Sinne von Art. 4 Abs. 7 DSGVO. Er legt die Zwecke und Mittel der Verarbeitung Ihrer personenbezogenen Daten fest.',
      ],
      table: {
        headers: ['Rolle', 'Identität', 'Kontakt'],
        rows: [
          ['Herausgeber (Verantwortlicher)', 'Einzelperson — Lunidex', 'estdel3012@gmail.com'],
          ['Hosting (Auftragsverarbeiter)', 'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA', 'privacy@vercel.com'],
          ['Datenschutzbeauftragter', 'Nicht benannt (risikoarme Verarbeitung)', 'estdel3012@gmail.com'],
        ],
      },
      callout: {
        type: 'info',
        text: 'Es werden keine Daten ohne angemessene Garantien (Standardvertragsklauseln oder Angemessenheitsbeschluss) in ein Drittland außerhalb der Europäischen Union übertragen.',
      },
    },
    {
      id: 'data',
      title: '2. Erhobene Daten',
      intro: 'Lunidex erhebt nur das für den Betrieb des Dienstes notwendige Minimum an Daten.',
      subsections: [
        {
          id: 'data-personal',
          title: '2.1. Personenbezogene Daten',
          paragraphs: [
            'Wir erheben keine direkten Identifikationsdaten (Name, Vorname, E-Mail-Adresse, Telefonnummer, Postanschrift, Geburtsdatum) bei der Nutzung der Website. Es ist keine Registrierung oder Kontoerstellung erforderlich.',
          ],
          list: [
            'Keine Identitätsdaten (Name, Vorname, Benutzername).',
            'Keine E-Mail-Adresse oder direkter Kontakt (außer bei freiwilliger Kontaktaufnahme).',
            'Kein von uns verwaltetes Passwort oder Sitzungskennung.',
            'Keine Zahlungs-, Bank- oder Handelsdaten.',
            'Keine präzisen Geolokalisierungsdaten.',
            'Keine biometrischen Daten.',
          ],
        },
        {
          id: 'data-local',
          title: '2.2. Lokal gespeicherte Daten (IndexedDB)',
          paragraphs: [
            'Die folgenden Daten werden ausschließlich in der lokalen Datenbank Ihres Browsers (IndexedDB) gespeichert. Sie werden niemals an unsere Server oder an Dritte übertragen, und wir haben keinen Zugriff darauf:',
          ],
          list: [
            'Ihre Lieblings-Pokémon (numerische Kennungen).',
            'Ihre Teamzusammenstellungen.',
            'Ihre "gefangen"-Status der Pokémon (persönlicher Pokédex).',
            'Ihre laufenden Pokémon-Vergleiche.',
            'Ihre Sammlung von Sammelkarten (TCG): besessene, gewünschte, beobachtete Karten.',
            'Ihre persönlichen Notizen zu Karten.',
            'Ihre gespeicherten Suchen und internen Browserverlauf.',
            'Ihre Quiz-Sitzungen und Ergebnisse (WhosThat, Typeneffektivität usw.).',
            'Ihre Anzeigeeinstellungen: helles/dunkles Thema, Sprache, Ton, Benachrichtigungen.',
            'Ihre freigeschalteten Abzeichen und Erfolge.',
          ],
          callout: {
            type: 'success',
            text: 'Diese Daten verbleiben auf Ihrem Gerät. Sie können sie jederzeit über die Website-Einstellungen (Abschnitt "Meine Daten zurücksetzen") oder durch Löschen der Browser-Speicherdaten entfernen.',
          },
        },
        {
          id: 'data-technical',
          title: '2.3. Automatisch übermittelte technische Daten',
          paragraphs: [
            'Bei jeder Verbindung zu Lunidex tauscht Ihr Browser automatisch technische Informationen mit unserer Infrastruktur und unseren Auftragsverarbeitern aus. Diese Daten sind für die Herstellung und den ordnungsgemäßen Betrieb der Kommunikation unbedingt erforderlich:',
          ],
          table: {
            headers: ['Kategorie', 'Daten', 'Zweck', 'Rechtsgrundlage (DSGVO)'],
            rows: [
              ['Technisch', 'IP-Adresse', 'Netzwerkrouting, Sicherheit, Missbrauchsschutz, CDN-Geolokalisierung', 'Berechtigtes Interesse (Art. 6.1.f)'],
              ['Technisch', 'User-Agent (Browser, Betriebssystem)', 'Anzeigekompatibilität, Fehlerbehebung', 'Berechtigtes Interesse (Art. 6.1.f)'],
              ['Technisch', 'HTTP-Header (Referer, Accept-Language)', 'Routing, Spracherkennung', 'Berechtigtes Interesse (Art. 6.1.f)'],
              ['Protokolle', 'Vercel-Zugriffsprotokolle (Zeitstempel, URL, HTTP-Code)', 'Sicherheit, Vorfallerkennung, Fehlerbehebung', 'Berechtigtes Interesse (Art. 6.1.f)'],
            ],
          },
        },
        {
          id: 'data-cookies',
          title: '2.4. Cookies und Tracker',
          paragraphs: [
            'Lunidex verwendet für den Dienst unbedingt erforderliche Speicherungen. Mit Ihrer Einwilligung messen Vercel Web Analytics und Speed Insights Reichweite und Leistung; Neon erhält nur tägliche Zähler zur Produktmessung. Getrennte Zwecke und Auswahlmöglichkeiten finden Sie in der Cookie-Richtlinie.',
          ],
          list: [
            'primedex-lang (Dauer: 1 Jahr): merkt sich Ihre bevorzugte Sprache.',
            'tcg-user-state (Dauer: 1 Jahr): bewahrt Ihren UI-Zustand auf TCG-Seiten.',
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '3. Zwecke und Rechtsgrundlagen',
      intro: 'Gemäß Art. 6 DSGVO stützt sich jede Verarbeitungstätigkeit auf eine spezifische Rechtsgrundlage:',
      table: {
        headers: ['Zweck', 'Betroffene Daten', 'Rechtsgrundlage'],
        rows: [
          ['Bereitstellung des Pokédex- und TCG-Dienstes', 'Technische Daten (IP, UA)', 'Dienstbereitstellung / Berechtigtes Interesse (Art. 6.1.f)'],
          ['Speicherung von Sprache und Präferenzen', 'Funktionale Cookies', 'Berechtigtes Interesse (Art. 6.1.f) — CNIL-Einwilligungsbefreiung'],
          ['Hosting und Inhaltsbereitstellung', 'Alle technischen Daten', 'Hosting-Vertrag (Art. 6.1.b) mit Vercel'],
          ['Sicherheit, Missbrauchsschutz, Fehlerbehebung', 'Vercel-Protokolle, IP', 'Berechtigtes Interesse (Art. 6.1.f)'],
          ['Beantwortung Ihrer Kontaktanfragen', 'E-Mail, Nachrichteninhalt', 'Vorvertragliche Maßnahmen oder Einwilligung (Art. 6.1.a/b)'],
          ['Lokale Speicherung Ihrer Präferenzen', 'IndexedDB-Daten', 'Außerhalb der DSGVO — lokale Speicherung auf Ihrem Gerät'],
        ],
      },
    },
    {
      id: 'recipients',
      title: '4. Empfänger und Auftragsverarbeiter',
      intro: 'Ihre Daten werden nur mit den für den Betrieb des Dienstes unbedingt erforderlichen Auftragsverarbeitern geteilt. Es findet keine kommerzielle Übertragung statt.',
      paragraphs: [
        'Lunidex verkauft, vermietet oder überträgt keine personenbezogenen Daten an Dritte zu kommerziellen oder Marketingzwecken. Es findet kein Profiling oder keine automatisierte Entscheidungsfindung mit Rechtswirkung statt.',
      ],
      table: {
        headers: ['Auftragsverarbeiter', 'Dienst', 'Land', 'Übertragungsgarantien'],
        rows: [
          ['Vercel Inc.', 'CDN-Hosting, SSR, Protokolle', 'USA', 'EU-US Data Privacy Framework + Standardvertragsklauseln'],
          ['PokéAPI (Paul Hallett)', 'Öffentliche Pokémon-Daten-API', 'USA/EU', 'Keine personenbezogenen Daten übertragen'],
          ['TCGdex', 'Öffentliche TCG-Karten-API', 'EU/Frankreich', 'Keine personenbezogenen Daten übertragen'],
          ['Scrydex', 'TCG-Bild-Hosting', 'EU', 'Keine personenbezogenen Daten übertragen'],
          ['GitHub (raw.githubusercontent.com)', 'Sprite-Hosting', 'USA', 'Keine personenbezogenen Daten übertragen'],
        ],
      },
    },
    {
      id: 'transfers',
      title: '5. Internationale Übermittlungen',
      paragraphs: [
        'Die Website wird von Vercel Inc. gehostet, einem Unternehmen mit Sitz in den Vereinigten Staaten. Datenübermittlungen in die USA unterliegen dem Angemessenheitsbeschluss der Europäischen Kommission zum EU-US Data Privacy Framework (DPF) vom 10. Juli 2023 und subsidiär den von der Europäischen Kommission angenommenen Standardvertragsklauseln (SCC).',
        'Die anderen Drittanbieterdienste (PokéAPI, TCGdex, Scrydex, GitHub) erhalten keine personenbezogenen Daten über Sie: Nur die zur Weiterleitung von Anfragen notwendigen technischen Daten werden an sie übermittelt.',
      ],
      callout: {
        type: 'info',
        text: 'Um Ihre Rechte auszuüben oder eine Kopie der Übertragungsgarantien zu erhalten, können Sie uns unter estdel3012@gmail.com kontaktieren.',
      },
    },
    {
      id: 'retention',
      title: '6. Speicherdauer',
      intro: 'Wir wenden den Grundsatz der Datenminimierung für Speicherfristen an:',
      table: {
        headers: ['Datenkategorie', 'Speicherdauer'],
        rows: [
          ['Lokale IndexedDB-Daten', 'Bis Sie sie löschen (über Einstellungen oder Browser)'],
          ['Funktionale Cookies', 'Maximal 1 Jahr'],
          ['Vercel-Protokolle', 'Maximal 30 Tage (interne Rotationsrichtlinie von Vercel)'],
          ['Kontakt-E-Mails', '3 Jahre nach dem letzten Austausch (Buchführungspflicht)'],
        ],
      },
    },
    {
      id: 'security',
      title: '7. Sicherheit',
      paragraphs: [
        'Lunidex setzt angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer Daten vor unbefugtem Zugriff, Änderung, Offenlegung oder Zerstörung um.',
      ],
      list: [
        'HTTPS/TLS-1.3-Verschlüsselung auf der gesamten Website (HSTS aktiviert).',
        'Sicherheits-Header: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, restriktive Permissions-Policy.',
        'Strenge Content-Security-Policy (CSP), die Skriptausführung und Bildquellen einschränkt.',
        'Es werden keine sensiblen Daten (Passwort, Zahlung) gespeichert — die Angriffsfläche ist dadurch reduziert.',
        'Regelmäßige Abhängigkeitsaktualisierungen (npm audit und Dependabot-Warnungen).',
        'Open-Source- und überprüfbarer Code auf GitHub (Transparenz von Anfang an).',
      ],
    },
    {
      id: 'rights',
      title: '8. Ihre Rechte',
      intro: 'Gemäß der DSGVO (Art. 15 bis 22) und dem CCPA haben Sie folgende Rechte bezüglich Ihrer personenbezogenen Daten:',
      list: [
        'Auskunftsrecht (Art. 15 DSGVO): Erhalt einer Kopie Ihrer Daten.',
        'Recht auf Berichtigung (Art. 16 DSGVO): Korrektur unrichtiger Daten.',
        'Recht auf Löschung (Art. 17 DSGVO): Beantragung der Löschung Ihrer Daten.',
        'Recht auf Einschränkung (Art. 18 DSGVO): vorübergehende Einschränkung der Verarbeitung.',
        'Recht auf Datenübertragbarkeit (Art. 20 DSGVO): Erhalt Ihrer Daten in einem strukturierten Format (betrifft hauptsächlich lokale Daten).',
        'Widerspruchsrecht (Art. 21 DSGVO): Widerspruch gegen eine auf berechtigtem Interesse beruhende Verarbeitung.',
        'Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO): wenn die Verarbeitung auf Einwilligung beruht.',
        'Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO).',
        'CCPA-Rechte (Einwohner Kaliforniens): Recht auf Kenntnis, Löschung, Widerspruch und Nichtdiskriminierung.',
      ],
      paragraphs: [
        'Um eines dieser Rechte auszuüben, schreiben Sie uns an estdel3012@gmail.com. Wir werden innerhalb von maximal 30 Tagen antworten. Ein Identitätsnachweis kann erforderlich sein, um zu überprüfen, dass die Anfrage von Ihnen stammt.',
        'Sie können auch eine Beschwerde bei der CNIL (Commission Nationale de l\'Informatique et des Libertés, www.cnil.fr) oder, für EU-Bürger, bei Ihrer nationalen Datenschutzbehörde einreichen. Einwohner Kaliforniens können sich an den California Attorney General (oag.ca.gov) wenden.',
      ],
    },
    {
      id: 'children',
      title: '9. Schutz von Minderjährigen',
      paragraphs: [
        'Lunidex richtet sich an ein Familienpublikum und kann von Minderjährigen genutzt werden. Die Website erhebt wissentlich keine personenbezogenen Daten von Kindern unter 16 Jahren (oder dem nach lokalem Recht geltenden Alter) ohne elterliche Zustimmung.',
        'Die Website bietet keinen für Kinder reservierten Bereich, keine Nachrichtenfunktion und erhebt keine Informationen, die einen Minderjährigen direkt identifizieren würden. Eltern, die glauben, dass ihr Kind personenbezogene Daten angegeben hat, können uns kontaktieren, um deren Löschung zu beantragen.',
        'Gemäß dem COPPA (Children\'s Online Privacy Protection Act) und der DSGVO werden wissentlich keine Daten von Kindern unter 13 Jahren (COPPA) oder 16 Jahren (DSGVO, sofern kein niedrigeres Alter vom Mitgliedstaat festgelegt wurde) erhoben.',
      ],
    },
    {
      id: 'third-parties',
      title: '10. Dienste Dritter und externe Links',
      paragraphs: [
        'Lunidex stützt sich auf Drittanbieter-APIs und -Dienste, um die angezeigten Daten bereitzustellen (PokéAPI, TCGdex, Scrydex, GitHub). Diese Dienste haben eigene Datenschutzrichtlinien, deren Einsichtnahme wir empfehlen.',
        'Die Website kann auch Links zu externen Websites anbieten (z. B. die offizielle Pokémon-Seite, YouTube-Videos, Shops). Wir sind nicht verantwortlich für den Inhalt oder die Datenschutzpraktiken dieser Drittanbieter-Websites.',
      ],
    },
    {
      id: 'changes',
      title: '11. Änderungen dieser Richtlinie',
      paragraphs: [
        'Diese Datenschutzerklärung kann aktualisiert werden, um Änderungen des Dienstes, der Vorschriften oder unserer Praktiken widerzuspiegeln. Das Datum der letzten Aktualisierung wird oben auf dieser Seite angezeigt.',
        'Bei einer wesentlichen Änderung wird eine Benachrichtigung deutlich sichtbar auf der Website angezeigt (z. B. über ein temporäres Banner). Wir empfehlen Ihnen, diese Seite regelmäßig zu konsultieren.',
      ],
    },
    {
      id: 'contact',
      title: '12. Kontakt',
      intro: 'Für Fragen zu dieser Datenschutzerklärung oder zur Ausübung Ihrer Rechte:',
      table: {
        headers: ['Kanal', 'Detail'],
        rows: [
          ['E-Mail', 'estdel3012@gmail.com'],
          ['Antwortzeit', 'Maximal 30 Tage (Art. 12 Abs. 3 DSGVO)'],
          ['Sprachen', 'Französisch oder Englisch'],
          ['Quellcode', 'github.com/Teeflo/Poke (öffentliche Issues)'],
        ],
      },
    },
  ],
};

const terms: LegalDocument = {
  title: 'Nutzungsbedingungen',
  intro:
    'Diese Nutzungsbedingungen (NB) regeln Ihren Zugang zu und die Nutzung von Lunidex. Durch den Zugriff auf die Website erklären Sie sich mit diesen Bedingungen einverstanden.',
  preamble:
    'Lunidex ist ein persönliches, kostenloses, werbefreies, nicht monetarisiertes Fan-Projekt. Es wird "wie besehen" zu Unterhaltungs- und Informationszwecken über das Pokémon-Universum bereitgestellt. Jede Nutzung der Website stellt eine Annahme dieser NB dar.',
  lastUpdated: '4. Juni 2026',
  effectiveDate: '4. Juni 2026',
  sections: [
    {
      id: 'object',
      title: '1. Zweck',
      paragraphs: [
        'Lunidex ist eine nicht-kommerzielle Website, die Daten im Zusammenhang mit Pokémon (Nummern, Typen, Statistiken, Beschreibungen, Entwicklungen, Fähigkeiten, Sprites) und den Sammelkarten (TCG) desselben Universums katalogisiert. Es handelt sich um ein Fan-Projekt zu rein informativen und unterhaltsamen Zwecken.',
        'Die Website wird kostenlos und ohne Werbung bereitgestellt. Für die Nutzung des Dienstes ist kein Kauf, Abonnement oder Registrierung erforderlich.',
      ],
    },
    {
      id: 'affiliation',
      title: '2. Keine Zugehörigkeit und geistiges Eigentum',
      intro: 'Lunidex steht in keiner Weise in Verbindung mit, wird nicht gesponsert, unterstützt oder genehmigt von:',
      list: [
        'Nintendo Co., Ltd.',
        'Game Freak Inc.',
        'Creatures Inc.',
        'The Pokémon Company (TPC) und ihren Tochtergesellschaften.',
        'Pokémon Center, Wizards of the Coast (Hasbro) oder anderen Rechteinhabern im Zusammenhang mit der Marke Pokémon.',
      ],
      paragraphs: [
        'Marken, Namen, Sprites, Illustrationen, Töne, Videos und alle anderen Inhalte im Zusammenhang mit dem Pokémon-Universum bleiben ausschließliches Eigentum ihrer jeweiligen Rechteinhaber. Lunidex beansprucht keinerlei Eigentum daran.',
        'Die Nutzung von Pokémon-Marken und -Inhalten erfolgt zu nicht-kommerziellen Fan-Projekt-Zwecken, was in den meisten Rechtsordnungen eine beschreibende und informative Nutzung darstellt, die grundsätzlich zulässig ist. Sollte ein Rechteinhaber der Ansicht sein, dass Inhalte seine Rechte verletzen, verpflichten wir uns, diese nach Benachrichtigung an estdel3012@gmail.com umgehend zu entfernen.',
        'Der Quellcode der Website wird unter der MIT-Lizenz (Open Source) veröffentlicht. Dies gewährt keinerlei Rechte an den Pokémon-Marken: Die MIT-Lizenz gilt nur für den vom Lunidex-Autor geschriebenen Code.',
      ],
    },
    {
      id: 'sources',
      title: '3. Datenquellen',
      paragraphs: [
        'Die von Lunidex angezeigten Daten stammen ausschließlich aus öffentlichen, gemeinschaftlich betriebenen Drittquellen: PokéAPI (pokeapi.co, betrieben von Paul Hallett) und TCGdex (api.tcgdex.net). Bilder werden von Scrydex und GitHub (raw.githubusercontent.com) gehostet.',
        'Wir bemühen uns, korrekte und aktuelle Daten anzuzeigen, garantieren jedoch nicht das Fehlen von Fehlern, Auslassungen oder Synchronisationsverzögerungen mit den Quellen. Die Daten werden zu Informationszwecken bereitgestellt und ersetzen keine offiziellen Quellen.',
      ],
    },
    {
      id: 'usage',
      title: '4. Erlaubte und verbotene Nutzung',
      intro: 'Sie sind berechtigt, Lunidex für persönliche, nicht-kommerzielle und informative Zwecke zu nutzen. Insbesondere ist Folgendes verboten:',
      list: [
        'Jede kommerzielle, werbliche oder Weiterverkaufsnutzung des Website-Zugangs.',
        'Jeder Versuch von massivem oder automatisiertem Scraping über die normale Nutzung hinaus (z. B. mehr als 60 Anfragen pro Minute oder vollständige Kopie der Datenbank).',
        'Jeder Versuch, Sicherheitsmaßnahmen, Ratenbegrenzungen oder CSP-Header zu umgehen.',
        'Jede Einschleusung bösartiger Inhalte (Skript, iframe, Upload) über Benutzerfelder (Suche, Vergleich usw.).',
        'Jede Nutzung der Website zur Belästigung, Bedrohung, Verleumdung oder anderweitigen Verletzung der Rechte anderer.',
        'Jeder Versuch, andere Nutzer zu identifizieren oder zu profilieren.',
        'Jeder Weiterverkauf, jede Weiterverbreitung oder erneute Veröffentlichung von Website-Inhalten ohne vorherige schriftliche Genehmigung.',
      ],
    },
    {
      id: 'availability',
      title: '5. Verfügbarkeit des Dienstes',
      paragraphs: [
        'Lunidex wird "wie besehen" und "wie verfügbar" bereitgestellt. Der Herausgeber bemüht sich, die Website rund um die Uhr zugänglich zu halten, garantiert jedoch keine unterbrechungsfreie Verfügbarkeit.',
        'Der Dienst kann vorübergehend für Wartung, Updates, technische Probleme oder höhere Gewalt unterbrochen werden. Auf dieser Grundlage kann keine Entschädigung verlangt werden.',
      ],
    },
    {
      id: 'responsibility',
      title: '6. Haftung',
      intro: 'Im Rahmen des geltenden Rechts:',
      list: [
        'Lunidex kann nicht für indirekte, zufällige, besondere oder Folgeschäden haftbar gemacht werden, die aus der Nutzung oder der Unmöglichkeit der Nutzung der Website resultieren.',
        'Der Herausgeber garantiert nicht die Richtigkeit, Vollständigkeit oder Aktualität der angezeigten Daten.',
        'Der Herausgeber kann nicht für den Inhalt von Websites Dritter haftbar gemacht werden, die über Links von Lunidex zugänglich sind.',
        'Der Nutzer ist allein verantwortlich für die Nutzung, die er von den von der Website bereitgestellten Informationen macht.',
      ],
      paragraphs: [
        'Sollte eine Bestimmung dieser NB von einem zuständigen Gericht für ungültig oder nicht durchsetzbar befunden werden, bleiben die übrigen Bestimmungen in vollem Umfang gültig.',
      ],
    },
    {
      id: 'accountability',
      title: '7. Meldung illegaler Inhalte',
      paragraphs: [
        'Wenn Sie glauben, dass Inhalte auf Lunidex Ihre Rechte verletzen (geistiges Eigentum, Verleumdung usw.), können Sie uns unter estdel3012@gmail.com kontaktieren und Folgendes angeben: die Art des betreffenden Inhalts, seine genaue URL, Ihren Status (Rechteinhaber oder Vertreter) und alle unterstützenden Beweise.',
        'Wir verpflichten uns, jede Meldung innerhalb einer angemessenen Frist zu prüfen und gegebenenfalls den betreffenden Inhalt zu entfernen oder zu ändern.',
      ],
    },
    {
      id: 'modifications',
      title: '8. Änderungen der NB',
      paragraphs: [
        'Diese NB können jederzeit geändert werden. Das Datum der letzten Aktualisierung wird oben auf dieser Seite angezeigt. Bei einer wesentlichen Änderung wird eine Benachrichtigung auf der Website angezeigt.',
        'Die fortgesetzte Nutzung der Website nach Veröffentlichung der Änderungen stellt eine Annahme der neuen NB dar.',
      ],
    },
    {
      id: 'law',
      title: '9. Anwendbares Recht und Gerichtsstand',
      paragraphs: [
        'Diese NB unterliegen französischem Recht, unbeschadet der zwingenden Bestimmungen, die in Ihrem Wohnsitzland gelten (insbesondere EU-Verbraucherrecht).',
        'Mangels einer gütlichen Einigung unterliegt jede Streitigkeit über die Auslegung oder Durchführung dieser NB der Zuständigkeit der französischen Gerichte, sofern das auf Verbraucher anwendbare Recht nichts anderes vorsieht.',
      ],
    },
    {
      id: 'contact',
      title: '10. Kontakt',
      paragraphs: [
        'Für Fragen zu diesen NB können Sie uns unter estdel3012@gmail.com kontaktieren.',
      ],
    },
  ],
};

const legalNotice: LegalDocument = {
  title: 'Impressum',
  intro:
    'Dieses Impressum wird gemäß Artikel 6 des französischen Gesetzes für Vertrauen in die digitale Wirtschaft (LCEN) vom 21. Juni 2004 veröffentlicht.',
  preamble:
    'Lunidex wird von einer Einzelperson auf persönlicher, nicht-kommerzieller Basis veröffentlicht. Hinter diesem Projekt steht keine juristische Person: Es handelt sich um ein Fan-Projekt.',
  lastUpdated: '4. Juni 2026',
  effectiveDate: '4. Juni 2026',
  sections: [
    {
      id: 'editor',
      title: '1. Website-Herausgeber',
      intro: 'Lunidex wird herausgegeben von:',
      table: {
        headers: ['Feld', 'Wert'],
        rows: [
          ['Name', 'Lunidex (Name des persönlichen Projekts)'],
          ['Status', 'Einzelperson — persönliches, nicht-kommerzielles Projekt'],
          ['Publikationsleiter', 'Der einzelne Herausgeber'],
          ['Kontakt', 'estdel3012@gmail.com'],
          ['SIRET', 'Nicht zutreffend (keine juristische Person)'],
          ['USt-IdNr.', 'Nicht zutreffend'],
          ['Adresse', 'Nicht veröffentlicht (Einzelperson)'],
          ['Publikationsleiter', 'Der Website-Herausgeber'],
        ],
      },
      callout: {
        type: 'warning',
        text: 'In Ermangelung einer juristischen Person ist Lunidex nicht im Handels- und Gesellschaftsregister (RCS) oder im Handwerksregister (RM) eingetragen. Der Herausgeber handelt im Rahmen seiner persönlichen zivilrechtlichen Haftung.',
      },
    },
    {
      id: 'host',
      title: '2. Hosting-Anbieter',
      intro: 'Die Website wird gehostet von:',
      table: {
        headers: ['Feld', 'Wert'],
        rows: [
          ['Unternehmen', 'Vercel Inc.'],
          ['Rechtsform', 'US-amerikanische (Delaware) Gesellschaft'],
          ['Adresse', '340 S Lemon Ave #4133, Walnut, CA 91789, USA'],
          ['Website', 'vercel.com'],
          ['Kontakt', 'privacy@vercel.com'],
        ],
      },
    },
    {
      id: 'activity',
      title: '3. Tätigkeit und Art des Dienstes',
      paragraphs: [
        'Lunidex ist ein kostenloser, werbefreier und nicht monetarisierter Online-Pokédex und TCG-Kartenkatalog. Die Website zeigt öffentliche Daten im Zusammenhang mit dem Pokémon-Universum (Nummern, Typen, Statistiken, Sprites, Karten) zu rein informativen und unterhaltsamen Zwecken an.',
        'Der Dienst wird kostenlos, ohne Registrierung, ohne Erhebung personenbezogener Daten und ohne kommerzielle Transaktion bereitgestellt.',
      ],
    },
    {
      id: 'affiliation-notice',
      title: '4. Keine Zugehörigkeit',
      paragraphs: [
        'Lunidex ist ein nicht-kommerzielles, unabhängiges, nicht angeschlossenes Fan-Projekt. Marken, Namen, Sprites, Illustrationen und alle anderen Elemente im Zusammenhang mit dem Pokémon-Universum bleiben ausschließliches Eigentum von Nintendo, Game Freak, Creatures Inc. und The Pokémon Company.',
        'Aus der Website ist keine Zugehörigkeit, Partnerschaft, Sponsoring oder offizielle Unterstützung der oben genannten Rechteinhaber abzuleiten. Weitere Informationen finden Sie in unseren Nutzungsbedingungen.',
      ],
    },
    {
      id: 'contact',
      title: '5. Kontakt',
      paragraphs: [
        'Für Anfragen zur Website (Fragen, Meldungen, Ausübung von DSGVO-Rechten) können Sie uns kontaktieren unter: estdel3012@gmail.com.',
      ],
    },
    {
      id: 'authority',
      title: '6. Aufsichtsbehörde',
      paragraphs: [
        'Für Beschwerden bezüglich des Schutzes Ihrer personenbezogenen Daten können Sie die Commission Nationale de l\'Informatique et des Libertés (CNIL) kontaktieren: www.cnil.fr.',
      ],
    },
  ],
};

const cookies: LegalDocument = {
  title: 'Cookie-Richtlinie',
  intro:
    'Diese Richtlinie beschreibt die Cookies und Tracker, die beim Surfen auf Lunidex auf Ihrem Gerät platziert werden, gemäß den CNIL-Richtlinien und der DSGVO.',
  preamble:
    'Ein Cookie ist eine kleine Textdatei, die vom Server einer Website auf Ihrem Gerät platziert wird. Einige Cookies sind für das Funktionieren der Website unbedingt erforderlich; andere erfordern Ihre vorherige Einwilligung.',
  lastUpdated: '4. Juni 2026',
  effectiveDate: '4. Juni 2026',
  sections: [
    {
      id: 'inventory',
      title: '1. Übersicht der verwendeten Cookies',
      intro: 'Lunidex verwendet für den Dienst unbedingt erforderliche Speicherungen. Die Reichweiten- und Leistungsmessung von Vercel sowie die Produktmessung von Neon bleiben bis zur jeweiligen Einwilligung deaktiviert.',
      table: {
        headers: ['Cookie', 'Zweck', 'Typ', 'Dauer', 'Herausgeber'],
        rows: [
          ['primedex-lang', 'Merkt sich Ihre bevorzugte Sprache', 'Unbedingt erforderlich (Art. 82 französisches Datenschutzgesetz)', '1 Jahr', 'Lunidex'],
          ['tcg-user-state', 'Bewahrt Ihren UI-Zustand auf TCG-Seiten (Filter, Sortierungen)', 'Unbedingt erforderlich', '1 Jahr', 'Lunidex'],
        ],
      },
      callout: {
        type: 'info',
        text: 'Unbedingt erforderliche Cookies sind gemäß Artikel 82 des französischen Datenschutzgesetzes und den CNIL-Empfehlungen von der vorherigen Einwilligung befreit.',
      },
    },
    {
      id: 'details',
      title: '2. Details zu jedem Cookie',
      subsections: [
        {
          id: 'lang',
          title: '2.1. primedex-lang',
          paragraphs: [
            'Dieses Cookie merkt sich die Sprache, in der Sie die Website anzeigen möchten. Ohne dieses Cookie würden Sie Lunidex bei jedem Besuch in der Standardsprache (Englisch) sehen. Es enthält keine personenbezogenen Daten: Es wird nur ein alphabetischer Wert ("en", "fr", "de" usw.) gespeichert.',
          ],
          list: [
            'Herausgeber: Lunidex.',
            'Lebensdauer: maximal 1 Jahr.',
            'Typ: serverseitiges HTTP-Cookie (über den Set-Cookie-Header gesetzt).',
            'Rechtsgrundlage: berechtigtes Interesse (Art. 6.1.f DSGVO) — CNIL-Einwilligungsbefreiung.',
          ],
        },
        {
          id: 'tcg',
          title: '2.2. tcg-user-state',
          paragraphs: [
            'Dieses Cookie bewahrt den UI-Zustand auf den TCG-Katalogseiten (aktive Filter, Anzeigemodus, letzte Sortierungen), damit Sie Ihre Präferenzen von Besuch zu Besuch wiederfinden.',
          ],
          list: [
            'Herausgeber: Lunidex.',
            'Lebensdauer: maximal 1 Jahr.',
            'Typ: clientseitiges Cookie (localStorage, browserseitig verwaltet).',
            'Rechtsgrundlage: berechtigtes Interesse (Art. 6.1.f DSGVO) — CNIL-Einwilligungsbefreiung.',
          ],
        },
      ],
    },
    {
      id: 'no-third-party',
      title: '3. Keine Cookies von Drittanbietern',
      paragraphs: [
        'Lunidex setzt keine Cookies von Drittanbietern. Insbesondere:',
        'Diese Richtlinie kann aktualisiert werden, falls wir uns entscheiden, einen Drittanbieterdienst hinzuzufügen. In diesem Fall wird Ihre Einwilligung über das Cookie-Banner eingeholt, bevor nicht unbedingt erforderliche Cookies gesetzt werden.',
      ],
      list: [
        'Vercel Web Analytics und Speed Insights werden erst nach Einwilligung für Reichweite und Leistung geladen; Neon erhält erst nach gesonderter Einwilligung nur aggregierte tägliche Produktzähler.',
        'Es wird kein Werbe-Cookie (Meta Pixel, Google Ads, TikTok Pixel usw.) installiert.',
        'Es wird kein Social-Media-Cookie (Facebook-, Twitter-Share-Buttons usw.) installiert.',
        'Es wird kein Retargeting- oder Profiling-Skript geladen.',
      ],
    },
    {
      id: 'localstorage',
      title: '4. Lokaler Speicher (IndexedDB und localStorage)',
      paragraphs: [
        'Zusätzlich zu Cookies verwendet Lunidex lokale Speichertechnologien (IndexedDB, localStorage), um Ihre Präferenzen und Nutzungsdaten zu bewahren. Diese Daten verbleiben auf Ihrem Gerät und werden niemals an einen Server übertragen.',
        'Weitere Informationen zu diesen Daten (Favoriten, Teams, TCG-Sammlung, Quiz-Ergebnisse, Anzeigeeinstellungen) finden Sie in unserer Datenschutzerklärung (Abschnitt 2.2 "Lokal gespeicherte Daten").',
      ],
    },
    {
      id: 'manage',
      title: '5. Ihre Cookies verwalten',
      intro: 'Sie können Cookies jederzeit kontrollieren und löschen:',
      list: [
        'Über Ihre Browsereinstellungen (siehe unten).',
        'Durch Löschen der Browserdaten für die Website lunidex.app.',
        'Durch Klicken auf die Schaltfläche "Meine Präferenzen verwalten" im Cookie-Banner, falls angezeigt.',
        'Durch Deaktivieren von JavaScript in Ihrem Browser (auf Kosten einer erheblichen Verschlechterung des Dienstes).',
      ],
      paragraphs: ['Links zu Hilfeseiten für die gängigsten Browser:'],
      table: {
        headers: ['Browser', 'Hilfe-Link'],
        rows: [
          ['Google Chrome', 'support.google.com/chrome/answer/95647'],
          ['Mozilla Firefox', 'support.mozilla.org/de/kb/cookies-und-website-daten-firefox-loeschen'],
          ['Apple Safari', 'support.apple.com/guide/safari/sfri11471'],
          ['Microsoft Edge', 'support.microsoft.com/de-de/microsoft-edge/cookies-löschen'],
        ],
      },
    },
    {
      id: 'changes',
      title: '6. Änderungen dieser Richtlinie',
      paragraphs: [
        'Diese Cookie-Richtlinie kann aktualisiert werden, um das Hinzufügen oder Entfernen von Cookies oder Änderungen der Vorschriften widerzuspiegeln. Das Datum der letzten Aktualisierung wird oben auf dieser Seite angezeigt.',
      ],
    },
    {
      id: 'contact',
      title: '7. Kontakt',
      paragraphs: [
        'Für Fragen zu dieser Richtlinie können Sie uns kontaktieren unter: estdel3012@gmail.com.',
      ],
    },
  ],
};

export const deLegal = { privacy, terms, legalNotice, cookies };
