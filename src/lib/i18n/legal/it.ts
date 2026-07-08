import type { LegalDocument } from '../legal-types';

const privacy: LegalDocument = {
  title: 'Informativa sulla Privacy',
  intro:
    'Questa informativa descrive come trattiamo i tuoi dati personali quando utilizzi PrimeDex, in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) e il California Consumer Privacy Act (CCPA).',
  preamble:
    'PrimeDex è un sito web di fan, non commerciale, non affiliato a Nintendo, Game Freak, The Pokémon Company o Creatures Inc. Prendiamo molto sul serio la protezione della tua privacy. Questa informativa spiega, in piena trasparenza, quali dati vengono raccolti, perché, come vengono utilizzati, per quanto tempo vengono conservati e quali sono i tuoi diritti.',
  lastUpdated: '4 giugno 2026',
  effectiveDate: '4 giugno 2026',
  sections: [
    {
      id: 'controller',
      title: '1. Titolare del trattamento',
      intro: 'Il titolare del trattamento dei tuoi dati personali è:',
      paragraphs: [
        'PrimeDex è pubblicato da una persona fisica a titolo personale e non commerciale. Non esiste alcuna persona giuridica, alcun numero di registrazione commerciale, né un rappresentante legale distinto.',
        'L\'editore agisce come titolare del trattamento ai sensi dell\'articolo 4.7 del GDPR. Determina le finalità e i mezzi del trattamento dei tuoi dati personali.',
      ],
      table: {
        headers: ['Ruolo', 'Identità', 'Contatto'],
        rows: [
          ['Editore (Titolare del trattamento)', 'Persona fisica — PrimeDex', 'estdel3012@gmail.com'],
          ['Hosting (Responsabile del trattamento)', 'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA', 'privacy@vercel.com'],
          ['Responsabile della protezione dei dati', 'Non designato (trattamento a basso rischio)', 'estdel3012@gmail.com'],
        ],
      },
      callout: {
        type: 'info',
        text: 'Nessun dato viene trasferito verso un paese terzo al di fuori dell\'Unione Europea senza garanzie adeguate (clausole contrattuali standard o decisione di adeguatezza).',
      },
    },
    {
      id: 'data',
      title: '2. Dati raccolti',
      intro: 'PrimeDex raccoglie solo il minimo indispensabile di dati necessari al funzionamento del servizio.',
      subsections: [
        {
          id: 'data-personal',
          title: '2.1. Dati personali',
          paragraphs: [
            'Non raccogliamo alcun dato di identificazione diretta (nome, cognome, indirizzo email, numero di telefono, indirizzo postale, data di nascita) quando utilizzi il sito. Non è richiesta alcuna registrazione o creazione di account.',
          ],
          list: [
            'Nessun dato identificativo (nome, cognome, nome utente).',
            'Nessun indirizzo email o contatto diretto (a meno che tu non ci contatti volontariamente).',
            'Nessuna password o identificativo di sessione gestito da noi.',
            'Nessun dato di pagamento, bancario o commerciale.',
            'Nessun dato di geolocalizzazione precisa.',
            'Nessun dato biometrico.',
          ],
        },
        {
          id: 'data-local',
          title: '2.2. Dati memorizzati localmente (IndexedDB)',
          paragraphs: [
            'I seguenti dati sono memorizzati esclusivamente nel database locale del tuo browser (IndexedDB). Non vengono mai trasmessi ai nostri server o a terzi, e non abbiamo alcun accesso ad essi:',
          ],
          list: [
            'I tuoi Pokémon preferiti (identificativi numerici).',
            'Le tue composizioni di squadra.',
            'Il tuo stato Pokémon "catturati" (Pokédex personale).',
            'I tuoi confronti tra Pokémon in corso.',
            'La tua collezione di carte collezionabili (TCG): carte possedute, in lista desideri, monitorate.',
            'Le tue note personali sulle carte.',
            'Le tue ricerche salvate e la tua cronologia di navigazione interna.',
            'Le tue sessioni e punteggi del quiz (WhosThat, efficacia dei tipi, ecc.).',
            'Le tue preferenze di visualizzazione: tema chiaro/scuro, lingua, audio, notifiche.',
            'I tuoi badge e risultati sbloccati.',
          ],
          callout: {
            type: 'success',
            text: 'Questi dati rimangono sul tuo dispositivo. Puoi eliminarli in qualsiasi momento tramite le impostazioni del sito (sezione "Reimposta i miei dati") o cancellando i dati di archiviazione del tuo browser.',
          },
        },
        {
          id: 'data-technical',
          title: '2.3. Dati tecnici trasmessi automaticamente',
          paragraphs: [
            'Ad ogni connessione a PrimeDex, il tuo browser scambia automaticamente informazioni tecniche con la nostra infrastruttura e i nostri responsabili del trattamento. Questi dati sono strettamente necessari per l\'instaurazione e il corretto funzionamento della comunicazione:',
          ],
          table: {
            headers: ['Categoria', 'Dati', 'Finalità', 'Base giuridica (GDPR)'],
            rows: [
              ['Tecnico', 'Indirizzo IP', 'Instradamento di rete, sicurezza, prevenzione abusi, geolocalizzazione CDN', 'Interesse legittimo (Art. 6.1.f)'],
              ['Tecnico', 'User-Agent (browser, SO)', 'Compatibilità di visualizzazione, debug', 'Interesse legittimo (Art. 6.1.f)'],
              ['Tecnico', 'Intestazioni HTTP (Referer, Accept-Language)', 'Instradamento, rilevamento lingua', 'Interesse legittimo (Art. 6.1.f)'],
              ['Log', 'Log di accesso Vercel (timestamp, URL, codice HTTP)', 'Sicurezza, rilevamento incidenti, debug', 'Interesse legittimo (Art. 6.1.f)'],
            ],
          },
        },
        {
          id: 'data-cookies',
          title: '2.4. Cookie e tracker',
          paragraphs: [
            'PrimeDex imposta solo due cookie strettamente necessari per il funzionamento del servizio. Attualmente non viene impostato alcun cookie di analisi, pubblicità o profilazione. Per maggiori informazioni, consulta la nostra politica sui cookie.',
          ],
          list: [
            'primedex-lang (durata: 1 anno): memorizza la tua lingua preferita.',
            'tcg-user-state (durata: 1 anno): conserva lo stato dell\'interfaccia sulle pagine TCG.',
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '3. Finalità e basi giuridiche',
      intro: 'In conformità con l\'articolo 6 del GDPR, ogni attività di trattamento si basa su una specifica base giuridica:',
      table: {
        headers: ['Finalità', 'Dati interessati', 'Base giuridica'],
        rows: [
          ['Fornitura del servizio Pokédex e TCG', 'Dati tecnici (IP, UA)', 'Fornitura del servizio / Interesse legittimo (Art. 6.1.f)'],
          ['Memorizzazione di lingua e preferenze', 'Cookie funzionali', 'Interesse legittimo (Art. 6.1.f) — esenzione dal consenso CNIL'],
          ['Hosting e distribuzione dei contenuti', 'Tutti i dati tecnici', 'Contratto di hosting (Art. 6.1.b) con Vercel'],
          ['Sicurezza, prevenzione abusi, debug', 'Log Vercel, IP', 'Interesse legittimo (Art. 6.1.f)'],
          ['Risposta alle tue richieste di contatto', 'Email, contenuto del messaggio', 'Misure precontrattuali o consenso (Art. 6.1.a/b)'],
          ['Archiviazione locale delle tue preferenze', 'Dati IndexedDB', 'Al di fuori del GDPR — archiviazione locale sul tuo dispositivo'],
        ],
      },
    },
    {
      id: 'recipients',
      title: '4. Destinatari e responsabili del trattamento',
      intro: 'I tuoi dati vengono condivisi solo con i responsabili del trattamento strettamente necessari per il funzionamento del servizio. Nessun trasferimento commerciale viene effettuato.',
      paragraphs: [
        'PrimeDex non vende, affitta o trasferisce alcun dato personale a terzi per scopi commerciali o di marketing. Non viene effettuata alcuna profilazione o decisione automatizzata che produca effetti giuridici.',
      ],
      table: {
        headers: ['Responsabile del trattamento', 'Servizio', 'Paese', 'Garanzie di trasferimento'],
        rows: [
          ['Vercel Inc.', 'Hosting CDN, SSR, log', 'USA', 'Data Privacy Framework UE-USA + SCC'],
          ['PokéAPI (Paul Hallett)', 'API pubblica di dati Pokémon', 'USA/UE', 'Nessun dato personale trasmesso'],
          ['TCGdex', 'API pubblica di carte TCG', 'UE/Francia', 'Nessun dato personale trasmesso'],
          ['Scrydex', 'Hosting immagini TCG', 'UE', 'Nessun dato personale trasmesso'],
          ['GitHub (raw.githubusercontent.com)', 'Hosting sprite', 'USA', 'Nessun dato personale trasmesso'],
        ],
      },
    },
    {
      id: 'transfers',
      title: '5. Trasferimenti internazionali',
      paragraphs: [
        'Il sito è ospitato da Vercel Inc., un\'azienda con sede negli Stati Uniti. I trasferimenti di dati verso gli Stati Uniti sono disciplinati dalla decisione di adeguatezza della Commissione Europea sul Data Privacy Framework UE-USA (DPF) del 10 luglio 2023 e, in subordine, dalle Clausole Contrattuali Standard (SCC) adottate dalla Commissione Europea.',
        'Gli altri servizi di terze parti (PokéAPI, TCGdex, Scrydex, GitHub) non ricevono alcun dato personale su di te: vengono trasmessi loro solo i dati tecnici necessari per instradare le richieste.',
      ],
      callout: {
        type: 'info',
        text: 'Per esercitare i tuoi diritti o ottenere una copia delle garanzie di trasferimento, puoi contattarci all\'indirizzo estdel3012@gmail.com.',
      },
    },
    {
      id: 'retention',
      title: '6. Conservazione dei dati',
      intro: 'Applichiamo il principio di minimizzazione dei dati per i periodi di conservazione:',
      table: {
        headers: ['Categoria di dati', 'Periodo di conservazione'],
        rows: [
          ['Dati locali IndexedDB', 'Fino alla loro eliminazione (tramite impostazioni o browser)'],
          ['Cookie funzionali', 'Massimo 1 anno'],
          ['Log Vercel', 'Massimo 30 giorni (politica interna di rotazione Vercel)'],
          ['Email di contatto', '3 anni dopo l\'ultimo scambio (obbligo contabile)'],
        ],
      },
    },
    {
      id: 'security',
      title: '7. Sicurezza',
      paragraphs: [
        'PrimeDex implementa misure tecniche e organizzative appropriate per proteggere i tuoi dati da accesso, modifica, divulgazione o distruzione non autorizzati.',
      ],
      list: [
        'Crittografia HTTPS/TLS 1.3 su tutto il sito (HSTS abilitato).',
        'Intestazioni di sicurezza: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrittiva.',
        'Content Security Policy (CSP) rigorosa che limita l\'esecuzione di script e le fonti delle immagini.',
        'Nessun dato sensibile (password, pagamento) viene memorizzato — la superficie di attacco è quindi ridotta.',
        'Aggiornamenti regolari delle dipendenze (npm audit e avvisi Dependabot).',
        'Codice open source e verificabile su GitHub (trasparenza per progettazione).',
      ],
    },
    {
      id: 'rights',
      title: '8. I tuoi diritti',
      intro: 'Ai sensi del GDPR (articoli da 15 a 22) e del CCPA, disponi dei seguenti diritti riguardo ai tuoi dati personali:',
      list: [
        'Diritto di accesso (Art. 15 GDPR): ottenere una copia dei tuoi dati.',
        'Diritto di rettifica (Art. 16 GDPR): correggere dati inesatti.',
        'Diritto alla cancellazione (Art. 17 GDPR): richiedere la cancellazione dei tuoi dati.',
        'Diritto di limitazione (Art. 18 GDPR): limitare temporaneamente il trattamento.',
        'Diritto alla portabilità (Art. 20 GDPR): ricevere i tuoi dati in un formato strutturato (si applica principalmente ai dati locali).',
        'Diritto di opposizione (Art. 21 GDPR): opporsi al trattamento basato sull\'interesse legittimo.',
        'Diritto di revoca del consenso (Art. 7.3 GDPR): quando il trattamento si basa sul consenso.',
        'Diritto di presentare reclamo a un\'autorità di controllo (Art. 77 GDPR).',
        'Diritti CCPA (residenti in California): diritto di sapere, cancellare, rifiutare e non discriminazione.',
      ],
      paragraphs: [
        'Per esercitare uno qualsiasi di questi diritti, scrivici a estdel3012@gmail.com. Risponderemo entro un massimo di 30 giorni. Potrebbe essere richiesta una prova d\'identità per verificare che la richiesta provenga da te.',
        'Puoi anche presentare un reclamo alla CNIL (Commission Nationale de l\'Informatique et des Libertés, www.cnil.fr) o, per i residenti UE, alla tua autorità nazionale di protezione dei dati. I residenti in California possono contattare il California Attorney General (oag.ca.gov).',
      ],
    },
    {
      id: 'children',
      title: '9. Protezione dei minori',
      paragraphs: [
        'PrimeDex è rivolto a un pubblico familiare e può essere consultato da minori. Il sito non raccoglie consapevolmente alcun dato personale da bambini di età inferiore a 16 anni (o l\'età applicabile secondo la legge locale) senza il consenso dei genitori.',
        'Il sito non offre alcuna sezione riservata ai bambini, non offre messaggistica e non raccoglie informazioni che identifichino direttamente un minore. I genitori che ritengono che il proprio figlio abbia fornito informazioni personali possono contattarci per richiederne la cancellazione.',
        'In conformità con il COPPA (Children\'s Online Privacy Protection Act) e il GDPR, nessun dato viene raccolto consapevolmente da bambini di età inferiore a 13 anni (COPPA) o 16 anni (GDPR, salvo che lo Stato membro stabilisca un\'età inferiore).',
      ],
    },
    {
      id: 'third-parties',
      title: '10. Servizi di terze parti e link esterni',
      paragraphs: [
        'PrimeDex si basa su API e servizi di terze parti per fornire i dati visualizzati (PokéAPI, TCGdex, Scrydex, GitHub). Questi servizi hanno le proprie politiche sulla privacy, che ti invitiamo a consultare.',
        'Il sito può anche offrire link a siti esterni (ad es. la pagina ufficiale di Pokémon, video di YouTube, negozi). Non siamo responsabili del contenuto o delle pratiche sulla privacy di questi siti di terze parti.',
      ],
    },
    {
      id: 'changes',
      title: '11. Modifiche a questa informativa',
      paragraphs: [
        'Questa informativa sulla privacy può essere aggiornata per riflettere cambiamenti nel servizio, nella normativa o nelle nostre pratiche. La data dell\'ultimo aggiornamento è indicata in cima a questa pagina.',
        'In caso di modifica sostanziale, verrà mostrata una notifica in modo visibile sul sito (ad es. tramite un banner temporaneo). Ti invitiamo a consultare regolarmente questa pagina.',
      ],
    },
    {
      id: 'contact',
      title: '12. Contatto',
      intro: 'Per qualsiasi domanda relativa a questa informativa sulla privacy o all\'esercizio dei tuoi diritti:',
      table: {
        headers: ['Canale', 'Dettaglio'],
        rows: [
          ['Email', 'estdel3012@gmail.com'],
          ['Tempo di risposta', 'Massimo 30 giorni (Art. 12.3 GDPR)'],
          ['Lingue', 'Francese o inglese'],
          ['Codice sorgente', 'github.com/Teeflo/Poke (issue pubbliche)'],
        ],
      },
    },
  ],
};

const terms: LegalDocument = {
  title: 'Termini di Servizio',
  intro:
    'Questi termini di servizio (TDS) disciplinano il tuo accesso e utilizzo di PrimeDex. Accedendo al sito, accetti di essere vincolato da questi termini.',
  preamble:
    'PrimeDex è un progetto di fan personale, gratuito, senza pubblicità e non monetizzato. È fornito "così com\'è", per scopi di intrattenimento e informazione sull\'universo Pokémon. Qualsiasi utilizzo del sito costituisce accettazione di questi TDS.',
  lastUpdated: '4 giugno 2026',
  effectiveDate: '4 giugno 2026',
  sections: [
    {
      id: 'object',
      title: '1. Oggetto',
      paragraphs: [
        'PrimeDex è un sito web non commerciale che cataloga dati relativi ai Pokémon (numeri, tipi, statistiche, descrizioni, evoluzioni, abilità, sprite) e alle carte del gioco di carte collezionabili (TCG) dello stesso universo. È un progetto di fan a scopo puramente informativo e ricreativo.',
        'Il sito è fornito gratuitamente e senza pubblicità. Non è richiesto alcun acquisto, abbonamento o registrazione per utilizzare il servizio.',
      ],
    },
    {
      id: 'affiliation',
      title: '2. Non affiliazione e proprietà intellettuale',
      intro: 'PrimeDex non è in alcun modo affiliato, sponsorizzato, supportato o approvato da:',
      list: [
        'Nintendo Co., Ltd.',
        'Game Freak Inc.',
        'Creatures Inc.',
        'The Pokémon Company (TPC) e le sue affiliate.',
        'Pokémon Center, Wizards of the Coast (Hasbro), o qualsiasi altro titolare di diritti relativo al marchio Pokémon.',
      ],
      paragraphs: [
        'Marchi, nomi, sprite, illustrazioni, suoni, video e qualsiasi altro contenuto relativo all\'universo Pokémon rimangono di proprietà esclusiva dei rispettivi titolari dei diritti. PrimeDex non rivendica alcuna proprietà su di essi.',
        'L\'uso dei marchi e dei contenuti Pokémon è effettuato per scopi di progetto di fan non commerciale, il che, nella maggior parte delle giurisdizioni, costituisce un uso descrittivo e informativo intrinsecamente consentito. Se un titolare di diritti ritiene che un contenuto violi i propri diritti, ci impegniamo a rimuoverlo prontamente dopo notifica a estdel3012@gmail.com.',
        'Il codice sorgente del sito è rilasciato sotto Licenza MIT (open source). Questo non concede alcun diritto sui marchi Pokémon: la Licenza MIT si applica solo al codice scritto dall\'autore di PrimeDex.',
      ],
    },
    {
      id: 'sources',
      title: '3. Fonti dei dati',
      paragraphs: [
        'I dati visualizzati da PrimeDex provengono esclusivamente da fonti pubbliche di terze parti gestite dalla community: PokéAPI (pokeapi.co, mantenuta da Paul Hallett) e TCGdex (api.tcgdex.net). Le immagini sono ospitate da Scrydex e GitHub (raw.githubusercontent.com).',
        'Ci impegniamo a mostrare dati accurati e aggiornati, ma non garantiamo l\'assenza di errori, omissioni o ritardi di sincronizzazione con le fonti. I dati sono forniti a scopo informativo e non sostituiscono le fonti ufficiali.',
      ],
    },
    {
      id: 'usage',
      title: '4. Usi autorizzati e vietati',
      intro: 'Sei autorizzato a utilizzare PrimeDex per scopi personali, non commerciali e informativi. In particolare, è vietato:',
      list: [
        'Qualsiasi uso commerciale, pubblicitario o di rivendita dell\'accesso al sito.',
        'Qualsiasi tentativo di scraping massivo o automatizzato oltre il normale utilizzo (ad es. più di 60 richieste al minuto, o copia integrale del database).',
        'Qualsiasi tentativo di eludere misure di sicurezza, limiti di frequenza o intestazioni CSP.',
        'Qualsiasi iniezione di contenuto dannoso (script, iframe, upload) attraverso campi utente (ricerca, confronto, ecc.).',
        'Qualsiasi utilizzo del sito per molestare, minacciare, diffamare o violare in altro modo i diritti altrui.',
        'Qualsiasi tentativo di identificare o profilare altri utenti.',
        'Qualsiasi rivendita, ridistribuzione o ripubblicazione del contenuto del sito senza previa autorizzazione scritta.',
      ],
    },
    {
      id: 'availability',
      title: '5. Disponibilità del servizio',
      paragraphs: [
        'PrimeDex è fornito "così com\'è" e "come disponibile". L\'editore si impegna a mantenere il sito accessibile 24 ore su 24, 7 giorni su 7, ma non garantisce una disponibilità ininterrotta.',
        'Il servizio può essere temporaneamente interrotto per manutenzione, aggiornamenti, problemi tecnici o cause di forza maggiore. Nessun risarcimento può essere richiesto su questa base.',
      ],
    },
    {
      id: 'responsibility',
      title: '6. Responsabilità',
      intro: 'Nei limiti consentiti dalla legge applicabile:',
      list: [
        'PrimeDex non può essere ritenuto responsabile per danni indiretti, incidentali, speciali o consequenziali derivanti dall\'uso o dall\'impossibilità di utilizzare il sito.',
        'L\'editore non garantisce l\'accuratezza, completezza o tempestività dei dati visualizzati.',
        'L\'editore non può essere ritenuto responsabile per il contenuto di siti di terze parti accessibili tramite link da PrimeDex.',
        'L\'utente è l\'unico responsabile dell\'uso che fa delle informazioni fornite dal sito.',
      ],
      paragraphs: [
        'Se una qualsiasi disposizione di questi TDS fosse ritenuta invalida o inapplicabile da un tribunale competente, le altre disposizioni rimarranno pienamente valide.',
      ],
    },
    {
      id: 'accountability',
      title: '7. Segnalazione di contenuti illegali',
      paragraphs: [
        'Se ritieni che un contenuto visualizzato su PrimeDex violi i tuoi diritti (proprietà intellettuale, diffamazione, ecc.), puoi contattarci a estdel3012@gmail.com specificando: la natura del contenuto in questione, il suo URL esatto, il tuo status (titolare di diritti o rappresentante) e qualsiasi prova a supporto.',
        'Ci impegniamo a esaminare qualsiasi segnalazione entro un termine ragionevole e, se del caso, a rimuovere o modificare il contenuto in questione.',
      ],
    },
    {
      id: 'modifications',
      title: '8. Modifiche ai TDS',
      paragraphs: [
        'Questi TDS possono essere modificati in qualsiasi momento. La data dell\'ultimo aggiornamento è indicata in cima a questa pagina. In caso di modifica sostanziale, verrà mostrata una notifica sul sito.',
        'L\'uso continuato del sito dopo la pubblicazione delle modifiche costituisce accettazione dei nuovi TDS.',
      ],
    },
    {
      id: 'law',
      title: '9. Legge applicabile e giurisdizione',
      paragraphs: [
        'Questi TDS sono disciplinati dalla legge francese, senza pregiudizio delle disposizioni imperative applicabili nel tuo paese di residenza (in particolare il diritto dei consumatori dell\'UE).',
        'In assenza di un accordo amichevole, qualsiasi controversia relativa all\'interpretazione o all\'esecuzione di questi TDS sarà soggetta alla giurisdizione dei tribunali francesi, salvo diversa disposizione della legge applicabile ai consumatori.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contatto',
      paragraphs: [
        'Per qualsiasi domanda relativa a questi TDS, puoi contattarci a estdel3012@gmail.com.',
      ],
    },
  ],
};

const legalNotice: LegalDocument = {
  title: 'Note Legali',
  intro:
    'Queste note legali sono pubblicate in conformità con l\'articolo 6 della Legge francese per la Fiducia nell\'Economia Digitale (LCEN) del 21 giugno 2004.',
  preamble:
    'PrimeDex è pubblicato da una persona fisica a titolo personale e non commerciale. Nessuna persona giuridica è dietro questo progetto: è un progetto di fan.',
  lastUpdated: '4 giugno 2026',
  effectiveDate: '4 giugno 2026',
  sections: [
    {
      id: 'editor',
      title: '1. Editore del sito',
      intro: 'PrimeDex è pubblicato da:',
      table: {
        headers: ['Campo', 'Valore'],
        rows: [
          ['Nome', 'PrimeDex (nome del progetto personale)'],
          ['Stato', 'Persona fisica — progetto personale non commerciale'],
          ['Direttore della pubblicazione', 'L\'editore individuale'],
          ['Contatto', 'estdel3012@gmail.com'],
          ['SIRET', 'Non applicabile (nessuna persona giuridica)'],
          ['Numero di partita IVA', 'Non applicabile'],
          ['Indirizzo', 'Non pubblicato (persona fisica)'],
          ['Direttore della pubblicazione', 'L\'editore del sito'],
        ],
      },
      callout: {
        type: 'warning',
        text: 'In assenza di persona giuridica, PrimeDex non è registrato nel Registro delle Imprese (RCS) o nel Registro Artigiani (RM). L\'editore agisce sotto la propria responsabilità civile personale.',
      },
    },
    {
      id: 'host',
      title: '2. Fornitore di hosting',
      intro: 'Il sito è ospitato da:',
      table: {
        headers: ['Campo', 'Valore'],
        rows: [
          ['Azienda', 'Vercel Inc.'],
          ['Forma giuridica', 'Società statunitense (Delaware)'],
          ['Indirizzo', '340 S Lemon Ave #4133, Walnut, CA 91789, USA'],
          ['Sito web', 'vercel.com'],
          ['Contatto', 'privacy@vercel.com'],
        ],
      },
    },
    {
      id: 'activity',
      title: '3. Attività e natura del servizio',
      paragraphs: [
        'PrimeDex è un Pokédex online e catalogo di carte TCG, gratuito, senza pubblicità e non monetizzato. Il sito mostra dati pubblici relativi all\'universo Pokémon (numeri, tipi, statistiche, sprite, carte) a scopo strettamente informativo e ricreativo.',
        'Il servizio è fornito gratuitamente, senza registrazione, senza raccolta di dati personali e senza transazione commerciale.',
      ],
    },
    {
      id: 'affiliation-notice',
      title: '4. Non affiliazione',
      paragraphs: [
        'PrimeDex è un progetto di fan non commerciale, indipendente e non affiliato. Marchi, nomi, sprite, illustrazioni e tutti gli altri elementi relativi all\'universo Pokémon rimangono di proprietà esclusiva di Nintendo, Game Freak, Creatures Inc. e The Pokémon Company.',
        'Nessuna affiliazione, partnership, sponsorizzazione o approvazione ufficiale da parte dei suddetti titolari di diritti deve essere dedotta dal sito. Per maggiori informazioni, consulta i nostri TDS.',
      ],
    },
    {
      id: 'contact',
      title: '5. Contatto',
      paragraphs: [
        'Per qualsiasi richiesta relativa al sito (domande, segnalazioni, esercizio dei diritti GDPR), puoi contattarci a: estdel3012@gmail.com.',
      ],
    },
    {
      id: 'authority',
      title: '6. Autorità di controllo',
      paragraphs: [
        'Per qualsiasi reclamo relativo alla protezione dei tuoi dati personali, puoi contattare la Commission Nationale de l\'Informatique et des Libertés (CNIL): www.cnil.fr.',
      ],
    },
  ],
};

const cookies: LegalDocument = {
  title: 'Politica sui Cookie',
  intro:
    'Questa politica descrive i cookie e i tracker installati sul tuo dispositivo quando navighi su PrimeDex, in conformità con le linee guida CNIL e il GDPR.',
  preamble:
    'Un cookie è un piccolo file di testo installato sul tuo dispositivo dal server di un sito web. Alcuni cookie sono strettamente necessari per il funzionamento del sito; altri richiedono il tuo previo consenso.',
  lastUpdated: '4 giugno 2026',
  effectiveDate: '4 giugno 2026',
  sections: [
    {
      id: 'inventory',
      title: '1. Inventario dei cookie utilizzati',
      intro: 'PrimeDex imposta solo due cookie, entrambi strettamente necessari per il funzionamento del servizio. Nessun cookie di analisi, pubblicità o profilazione è attualmente impostato.',
      table: {
        headers: ['Cookie', 'Finalità', 'Tipo', 'Durata', 'Editore'],
        rows: [
          ['primedex-lang', 'Memorizza la tua lingua preferita', 'Strettamente necessario (Art. 82 legge francese sulla protezione dei dati)', '1 anno', 'PrimeDex'],
          ['tcg-user-state', 'Conserva lo stato dell\'interfaccia sulle pagine TCG (filtri, ordinamenti)', 'Strettamente necessario', '1 anno', 'PrimeDex'],
        ],
      },
      callout: {
        type: 'info',
        text: 'I cookie strettamente necessari sono esenti dal consenso preventivo ai sensi dell\'articolo 82 della legge francese sulla protezione dei dati e delle raccomandazioni CNIL.',
      },
    },
    {
      id: 'details',
      title: '2. Dettagli di ciascun cookie',
      subsections: [
        {
          id: 'lang',
          title: '2.1. primedex-lang',
          paragraphs: [
            'Questo cookie memorizza la lingua in cui hai scelto di visualizzare il sito. Senza di esso, vedresti PrimeDex nella lingua predefinita (inglese) ad ogni visita. Non contiene alcun dato personale: viene memorizzato solo un valore alfabetico ("en", "fr", "de", ecc.).',
          ],
          list: [
            'Editore: PrimeDex.',
            'Durata: massimo 1 anno.',
            'Tipo: cookie HTTP lato server (impostato tramite l\'intestazione Set-Cookie).',
            'Base giuridica: interesse legittimo (Art. 6.1.f GDPR) — esenzione dal consenso CNIL.',
          ],
        },
        {
          id: 'tcg',
          title: '2.2. tcg-user-state',
          paragraphs: [
            'Questo cookie conserva lo stato dell\'interfaccia sulle pagine del catalogo TCG (filtri attivi, modalità di visualizzazione, ultimi ordinamenti) in modo che tu possa ritrovare le tue preferenze da una visita all\'altra.',
          ],
          list: [
            'Editore: PrimeDex.',
            'Durata: massimo 1 anno.',
            'Tipo: cookie lato client (localStorage, gestito dal browser).',
            'Base giuridica: interesse legittimo (Art. 6.1.f GDPR) — esenzione dal consenso CNIL.',
          ],
        },
      ],
    },
    {
      id: 'no-third-party',
      title: '3. Assenza di cookie di terze parti',
      paragraphs: [
        'PrimeDex non imposta alcun cookie di terze parti. In particolare:',
        'Questa politica può essere aggiornata se decidiamo di aggiungere un servizio di terze parti. In tal caso, il tuo consenso verrà richiesto tramite il banner dei cookie prima dell\'installazione di qualsiasi cookie non strettamente necessario.',
      ],
      list: [
        'Nessun cookie di analisi (Google Analytics, Matomo, Plausible, ecc.) è installato.',
        'Nessun cookie pubblicitario (Meta Pixel, Google Ads, TikTok Pixel, ecc.) è installato.',
        'Nessun cookie di social network (pulsanti di condivisione Facebook, Twitter, ecc.) è installato.',
        'Nessuno script di retargeting o profilazione viene caricato.',
      ],
    },
    {
      id: 'localstorage',
      title: '4. Archiviazione locale (IndexedDB e localStorage)',
      paragraphs: [
        'Oltre ai cookie, PrimeDex utilizza tecnologie di archiviazione locale (IndexedDB, localStorage) per conservare le tue preferenze e i dati di utilizzo. Questi dati rimangono sul tuo dispositivo e non vengono mai trasmessi a un server.',
        'Per maggiori informazioni su questi dati (preferiti, squadre, collezione TCG, punteggi quiz, preferenze di visualizzazione), consulta la nostra informativa sulla privacy (sezione 2.2 "Dati memorizzati localmente").',
      ],
    },
    {
      id: 'manage',
      title: '5. Gestisci i tuoi cookie',
      intro: 'Puoi controllare ed eliminare i cookie in qualsiasi momento:',
      list: [
        'Tramite le impostazioni del tuo browser (vedi sotto).',
        'Cancellando i dati di navigazione per il sito primedex.vercel.app.',
        'Facendo clic sul pulsante "Gestisci le mie preferenze" nel banner dei cookie, se visualizzato.',
        'Disabilitando JavaScript nel tuo browser (a costo di un notevole degrado del servizio).',
      ],
      paragraphs: ['Link alle pagine di aiuto per i browser più comuni:'],
      table: {
        headers: ['Browser', 'Link di aiuto'],
        rows: [
          ['Google Chrome', 'support.google.com/chrome/answer/95647'],
          ['Mozilla Firefox', 'support.mozilla.org/it/kb/Eliminare%20i%20cookie'],
          ['Apple Safari', 'support.apple.com/guide/safari/sfri11471'],
          ['Microsoft Edge', 'support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie'],
        ],
      },
    },
    {
      id: 'changes',
      title: '6. Modifiche a questa politica',
      paragraphs: [
        'Questa politica sui cookie può essere aggiornata per riflettere l\'aggiunta o la rimozione di cookie, o cambiamenti normativi. La data dell\'ultimo aggiornamento è indicata in cima a questa pagina.',
      ],
    },
    {
      id: 'contact',
      title: '7. Contatto',
      paragraphs: [
        'Per qualsiasi domanda relativa a questa politica, puoi contattarci a: estdel3012@gmail.com.',
      ],
    },
  ],
};

export const itLegal = { privacy, terms, legalNotice, cookies };
