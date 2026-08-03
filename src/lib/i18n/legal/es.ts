import type { LegalDocument } from '../legal-types';

const privacy: LegalDocument = {
  title: 'Política de Privacidad',
  intro:
    'Esta política describe cómo tratamos sus datos personales cuando utiliza Lunidex, de conformidad con el Reglamento General de Protección de Datos (RGPD) y la California Consumer Privacy Act (CCPA).',
  preamble:
    'Lunidex es un sitio web de fans, no comercial, no afiliado a Nintendo, Game Freak, The Pokémon Company ni Creatures Inc. Nos tomamos muy en serio la protección de su privacidad. Esta política explica, con total transparencia, qué datos se recopilan, por qué, cómo se utilizan, cuánto tiempo se conservan y cuáles son sus derechos.',
  lastUpdated: '4 de junio de 2026',
  effectiveDate: '4 de junio de 2026',
  sections: [
    {
      id: 'controller',
      title: '1. Responsable del tratamiento',
      intro: 'El responsable del tratamiento de sus datos personales es:',
      paragraphs: [
        'Lunidex es publicado por una persona física a título personal y no comercial. No existe entidad jurídica, ni número de registro mercantil, ni representante legal independiente.',
        'El editor actúa como responsable del tratamiento en el sentido del artículo 4.7 del RGPD. Determina los fines y los medios del tratamiento de sus datos personales.',
      ],
      table: {
        headers: ['Función', 'Identidad', 'Contacto'],
        rows: [
          ['Editor (Responsable del tratamiento)', 'Persona física — Lunidex', 'estdel3012@gmail.com'],
          ['Alojamiento (Encargado del tratamiento)', 'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, EE. UU.', 'privacy@vercel.com'],
          ['Delegado de Protección de Datos', 'No designado (tratamiento de bajo riesgo)', 'estdel3012@gmail.com'],
        ],
      },
      callout: {
        type: 'info',
        text: 'Ningún dato se transfiere a un país fuera de la Unión Europea sin garantías adecuadas (cláusulas contractuales tipo o decisión de adecuación).',
      },
    },
    {
      id: 'data',
      title: '2. Datos recopilados',
      intro: 'Lunidex recopila únicamente el mínimo de datos necesario para el funcionamiento del servicio.',
      subsections: [
        {
          id: 'data-personal',
          title: '2.1. Datos personales',
          paragraphs: [
            'No recopilamos ningún dato de identificación directa (nombre, apellidos, dirección de correo electrónico, número de teléfono, dirección postal, fecha de nacimiento) cuando utiliza el sitio. No se requiere registro ni creación de cuenta.',
          ],
          list: [
            'Ningún dato de identidad (nombre, apellidos, nombre de usuario).',
            'Ninguna dirección de correo electrónico o contacto directo (salvo que nos contacte voluntariamente).',
            'Ninguna contraseña ni identificador de sesión gestionado por nosotros.',
            'Ningún dato de pago, bancario o comercial.',
            'Ningún dato de geolocalización precisa.',
            'Ningún dato biométrico.',
          ],
        },
        {
          id: 'data-local',
          title: '2.2. Datos almacenados localmente (IndexedDB)',
          paragraphs: [
            'Los siguientes datos se almacenan exclusivamente en la base de datos local de su navegador (IndexedDB). Nunca se transmiten a nuestros servidores ni a terceros, y no tenemos acceso a ellos:',
          ],
          list: [
            'Sus Pokémon favoritos (identificadores numéricos).',
            'Sus composiciones de equipo.',
            'Su estado de Pokémon "capturados" (Pokédex personal).',
            'Sus comparaciones de Pokémon en curso.',
            'Su colección del juego de cartas coleccionables (TCG): cartas poseídas, en lista de deseos, vigiladas.',
            'Sus notas personales sobre las cartas.',
            'Sus búsquedas guardadas y su historial de navegación interno.',
            'Sus sesiones y puntuaciones de quiz (WhosThat, efectividad de tipos, etc.).',
            'Sus preferencias de visualización: tema claro/oscuro, idioma, sonido, notificaciones.',
            'Sus insignias y logros desbloqueados.',
          ],
          callout: {
            type: 'success',
            text: 'Estos datos permanecen en su dispositivo. Puede eliminarlos en cualquier momento a través de la configuración del sitio (sección "Restablecer mis datos") o borrando los datos de almacenamiento de su navegador.',
          },
        },
        {
          id: 'data-technical',
          title: '2.3. Datos técnicos transmitidos automáticamente',
          paragraphs: [
            'En cada conexión a Lunidex, su navegador intercambia automáticamente información técnica con nuestra infraestructura y nuestros encargados del tratamiento. Estos datos son estrictamente necesarios para el establecimiento y el correcto funcionamiento de la comunicación:',
          ],
          table: {
            headers: ['Categoría', 'Datos', 'Finalidad', 'Base jurídica (RGPD)'],
            rows: [
              ['Técnico', 'Dirección IP', 'Enrutamiento de red, seguridad, prevención de abusos, geolocalización CDN', 'Interés legítimo (Art. 6.1.f)'],
              ['Técnico', 'User-Agent (navegador, SO)', 'Compatibilidad de visualización, depuración', 'Interés legítimo (Art. 6.1.f)'],
              ['Técnico', 'Cabeceras HTTP (Referer, Accept-Language)', 'Enrutamiento, detección de idioma', 'Interés legítimo (Art. 6.1.f)'],
              ['Registros', 'Registros de acceso de Vercel (marca de tiempo, URL, código HTTP)', 'Seguridad, detección de incidentes, depuración', 'Interés legítimo (Art. 6.1.f)'],
            ],
          },
        },
        {
          id: 'data-cookies',
          title: '2.4. Cookies y rastreadores',
          paragraphs: [
            'Lunidex utiliza almacenamiento estrictamente necesario para el servicio. Con su consentimiento, Vercel Web Analytics y Speed Insights miden la audiencia y el rendimiento, y Supabase solo recibe contadores diarios de medición de producto. Consulte la política de cookies para las finalidades y elecciones separadas.',
          ],
          list: [
            'primedex-lang (duración: 1 año): recuerda su idioma preferido.',
            'tcg-user-state (duración: 1 año): conserva su estado de interfaz en las páginas del TCG.',
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '3. Finalidades y bases jurídicas',
      intro: 'De conformidad con el artículo 6 del RGPD, cada actividad de tratamiento se basa en una base jurídica específica:',
      table: {
        headers: ['Finalidad', 'Datos afectados', 'Base jurídica'],
        rows: [
          ['Prestación del servicio de Pokédex y TCG', 'Datos técnicos (IP, UA)', 'Prestación del servicio / Interés legítimo (Art. 6.1.f)'],
          ['Memorización del idioma y las preferencias', 'Cookies funcionales', 'Interés legítimo (Art. 6.1.f) — exención de consentimiento CNIL'],
          ['Alojamiento y entrega de contenido', 'Todos los datos técnicos', 'Contrato de alojamiento (Art. 6.1.b) con Vercel'],
          ['Seguridad, prevención de abusos, depuración', 'Registros de Vercel, IP', 'Interés legítimo (Art. 6.1.f)'],
          ['Respuesta a sus solicitudes de contacto', 'Correo electrónico, contenido del mensaje', 'Medidas precontractuales o consentimiento (Art. 6.1.a/b)'],
          ['Almacenamiento local de sus preferencias', 'Datos de IndexedDB', 'Fuera del RGPD — almacenamiento local en su dispositivo'],
        ],
      },
    },
    {
      id: 'recipients',
      title: '4. Destinatarios y encargados del tratamiento',
      intro: 'Sus datos solo se comparten con los encargados del tratamiento estrictamente necesarios para el funcionamiento del servicio. No se realiza ninguna transferencia comercial.',
      paragraphs: [
        'Lunidex no vende, alquila ni transfiere ningún dato personal a terceros con fines comerciales o de marketing. No se realiza ningún perfilado ni toma de decisiones automatizada que produzca efectos jurídicos.',
      ],
      table: {
        headers: ['Encargado del tratamiento', 'Servicio', 'País', 'Garantías de transferencia'],
        rows: [
          ['Vercel Inc.', 'Alojamiento CDN, SSR, registros', 'EE. UU.', 'Marco de Privacidad de Datos UE-EE. UU. + CCT'],
          ['PokéAPI (Paul Hallett)', 'API pública de datos de Pokémon', 'EE. UU./UE', 'No se transmiten datos personales'],
          ['TCGdex', 'API pública de cartas TCG', 'UE/Francia', 'No se transmiten datos personales'],
          ['Scrydex', 'Alojamiento de imágenes TCG', 'UE', 'No se transmiten datos personales'],
          ['GitHub (raw.githubusercontent.com)', 'Alojamiento de sprites', 'EE. UU.', 'No se transmiten datos personales'],
        ],
      },
    },
    {
      id: 'transfers',
      title: '5. Transferencias internacionales',
      paragraphs: [
        'El sitio está alojado por Vercel Inc., una empresa con sede en Estados Unidos. Las transferencias de datos a Estados Unidos se rigen por la decisión de adecuación de la Comisión Europea sobre el Marco de Privacidad de Datos UE-EE. UU. (DPF) del 10 de julio de 2023 y, subsidiariamente, por las Cláusulas Contractuales Tipo (CCT) adoptadas por la Comisión Europea.',
        'Los demás servicios de terceros (PokéAPI, TCGdex, Scrydex, GitHub) no reciben ningún dato personal sobre usted: solo se les transmiten los datos técnicos necesarios para enrutar las solicitudes.',
      ],
      callout: {
        type: 'info',
        text: 'Para ejercer sus derechos u obtener una copia de las garantías de transferencia, puede contactarnos en estdel3012@gmail.com.',
      },
    },
    {
      id: 'retention',
      title: '6. Conservación de los datos',
      intro: 'Aplicamos el principio de minimización de datos para los períodos de conservación:',
      table: {
        headers: ['Categoría de datos', 'Período de conservación'],
        rows: [
          ['Datos locales de IndexedDB', 'Hasta que usted los elimine (mediante ajustes o navegador)'],
          ['Cookies funcionales', 'Máximo 1 año'],
          ['Registros de Vercel', 'Máximo 30 días (política interna de rotación de Vercel)'],
          ['Correos de contacto', '3 años tras el último intercambio (obligación contable)'],
        ],
      },
    },
    {
      id: 'security',
      title: '7. Seguridad',
      paragraphs: [
        'Lunidex implementa medidas técnicas y organizativas apropiadas para proteger sus datos contra el acceso, la modificación, la divulgación o la destrucción no autorizados.',
      ],
      list: [
        'Cifrado HTTPS/TLS 1.3 en todo el sitio (HSTS activado).',
        'Cabeceras de seguridad: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrictiva.',
        'Política de Seguridad de Contenido (CSP) estricta que limita la ejecución de scripts y las fuentes de imágenes.',
        'No se almacena ningún dato sensible (contraseña, pago), lo que reduce la superficie de ataque.',
        'Actualizaciones regulares de dependencias (npm audit y alertas de Dependabot).',
        'Código de código abierto y auditable en GitHub (transparencia por diseño).',
      ],
    },
    {
      id: 'rights',
      title: '8. Sus derechos',
      intro: 'En virtud del RGPD (artículos 15 a 22) y la CCPA, usted dispone de los siguientes derechos respecto a sus datos personales:',
      list: [
        'Derecho de acceso (Art. 15 RGPD): obtener una copia de sus datos.',
        'Derecho de rectificación (Art. 16 RGPD): corregir datos inexactos.',
        'Derecho de supresión (Art. 17 RGPD): solicitar la eliminación de sus datos.',
        'Derecho a la limitación (Art. 18 RGPD): restringir temporalmente el tratamiento.',
        'Derecho a la portabilidad (Art. 20 RGPD): recibir sus datos en un formato estructurado (aplica principalmente a datos locales).',
        'Derecho de oposición (Art. 21 RGPD): oponerse al tratamiento basado en el interés legítimo.',
        'Derecho a retirar el consentimiento (Art. 7.3 RGPD): cuando el tratamiento se base en el consentimiento.',
        'Derecho a presentar una reclamación ante una autoridad de control (Art. 77 RGPD).',
        'Derechos de la CCPA (residentes de California): derecho a saber, a eliminar, a excluirse y a la no discriminación.',
      ],
      paragraphs: [
        'Para ejercer cualquiera de estos derechos, escríbanos a estdel3012@gmail.com. Responderemos en un plazo máximo de 30 días. Puede requerirse prueba de identidad para verificar que la solicitud proviene de usted.',
        'También puede presentar una reclamación ante la CNIL (Commission Nationale de l\'Informatique et des Libertés, www.cnil.fr) o, para residentes de la UE, ante su autoridad nacional de protección de datos. Los residentes de California pueden contactar con el Fiscal General de California (oag.ca.gov).',
      ],
    },
    {
      id: 'children',
      title: '9. Protección de menores',
      paragraphs: [
        'Lunidex está dirigido a un público familiar y puede ser consultado por menores. El sitio no recopila conscientemente ningún dato personal de menores de 16 años (o la edad aplicable según la ley local) sin el consentimiento parental.',
        'El sitio no ofrece ninguna sección reservada para niños, no ofrece mensajería y no recopila información que identifique directamente a un menor. Los padres que crean que su hijo ha proporcionado información personal pueden contactarnos para solicitar su eliminación.',
        'De conformidad con la COPPA (Children\'s Online Privacy Protection Act) y el RGPD, no se recopilan conscientemente datos de menores de 13 años (COPPA) o 16 años (RGPD, salvo que el Estado miembro establezca una edad inferior).',
      ],
    },
    {
      id: 'third-parties',
      title: '10. Servicios de terceros y enlaces externos',
      paragraphs: [
        'Lunidex se basa en APIs y servicios de terceros para proporcionar los datos mostrados (PokéAPI, TCGdex, Scrydex, GitHub). Estos servicios tienen sus propias políticas de privacidad, que le recomendamos consultar.',
        'El sitio también puede ofrecer enlaces a sitios externos (por ejemplo, la página oficial de Pokémon, vídeos de YouTube, tiendas). No somos responsables del contenido ni de las prácticas de privacidad de estos sitios de terceros.',
      ],
    },
    {
      id: 'changes',
      title: '11. Cambios en esta política',
      paragraphs: [
        'Esta política de privacidad puede actualizarse para reflejar cambios en el servicio, la normativa o nuestras prácticas. La fecha de la última actualización se indica en la parte superior de esta página.',
        'En caso de un cambio sustancial, se mostrará una notificación de forma visible en el sitio (por ejemplo, mediante un banner temporal). Le recomendamos consultar esta página regularmente.',
      ],
    },
    {
      id: 'contact',
      title: '12. Contacto',
      intro: 'Para cualquier pregunta relativa a esta política de privacidad o al ejercicio de sus derechos:',
      table: {
        headers: ['Canal', 'Detalle'],
        rows: [
          ['Correo electrónico', 'estdel3012@gmail.com'],
          ['Tiempo de respuesta', 'Máximo 30 días (Art. 12.3 RGPD)'],
          ['Idiomas', 'Francés o inglés'],
          ['Código fuente', 'github.com/Teeflo/Poke (issues públicas)'],
        ],
      },
    },
  ],
};

const terms: LegalDocument = {
  title: 'Términos de Servicio',
  intro:
    'Estos términos de servicio (TDS) rigen su acceso y uso de Lunidex. Al acceder al sitio, usted acepta quedar vinculado por estos términos.',
  preamble:
    'Lunidex es un proyecto de fans personal, gratuito, sin publicidad y no monetizado. Se proporciona "tal cual", con fines de entretenimiento e información sobre el universo Pokémon. Cualquier uso del sitio constituye la aceptación de estos TDS.',
  lastUpdated: '4 de junio de 2026',
  effectiveDate: '4 de junio de 2026',
  sections: [
    {
      id: 'object',
      title: '1. Objeto',
      paragraphs: [
        'Lunidex es un sitio web no comercial que cataloga datos relacionados con Pokémon (números, tipos, estadísticas, descripciones, evoluciones, habilidades, sprites) y con las cartas del juego de cartas coleccionables (TCG) del mismo universo. Es un proyecto de fans con fines puramente informativos y recreativos.',
        'El sitio se proporciona de forma gratuita y sin publicidad. No se requiere compra, suscripción ni registro para utilizar el servicio.',
      ],
    },
    {
      id: 'affiliation',
      title: '2. No afiliación y propiedad intelectual',
      intro: 'Lunidex no está en modo alguno afiliado, patrocinado, apoyado ni aprobado por:',
      list: [
        'Nintendo Co., Ltd.',
        'Game Freak Inc.',
        'Creatures Inc.',
        'The Pokémon Company (TPC) y sus filiales.',
        'Pokémon Center, Wizards of the Coast (Hasbro), ni ningún otro titular de derechos relacionado con la marca Pokémon.',
      ],
      paragraphs: [
        'Las marcas, nombres, sprites, ilustraciones, sonidos, vídeos y cualquier otro contenido relacionado con el universo Pokémon siguen siendo propiedad exclusiva de sus respectivos titulares de derechos. Lunidex no reclama ninguna propiedad sobre ellos.',
        'El uso de las marcas y contenidos de Pokémon se realiza con fines de proyecto de fans no comercial, lo que, en la mayoría de las jurisdicciones, constituye un uso descriptivo e informativo inherentemente permitido. Si un titular de derechos considera que algún contenido infringe sus derechos, nos comprometemos a retirarlo con prontitud tras la notificación a estdel3012@gmail.com.',
        'El código fuente del sitio se publica bajo la Licencia MIT (código abierto). Esto no otorga ningún derecho sobre las marcas de Pokémon: la Licencia MIT se aplica únicamente al código escrito por el autor de Lunidex.',
      ],
    },
    {
      id: 'sources',
      title: '3. Fuentes de datos',
      paragraphs: [
        'Los datos mostrados por Lunidex provienen exclusivamente de fuentes públicas de terceros gestionadas por la comunidad: PokéAPI (pokeapi.co, mantenida por Paul Hallett) y TCGdex (api.tcgdex.net). Las imágenes están alojadas por Scrydex y GitHub (raw.githubusercontent.com).',
        'Nos esforzamos por mostrar datos precisos y actualizados, pero no garantizamos la ausencia de errores, omisiones o retrasos de sincronización con las fuentes. Los datos se proporcionan con fines informativos y no sustituyen a las fuentes oficiales.',
      ],
    },
    {
      id: 'usage',
      title: '4. Usos autorizados y prohibidos',
      intro: 'Usted está autorizado a utilizar Lunidex con fines personales, no comerciales e informativos. En particular, está prohibido:',
      list: [
        'Cualquier uso comercial, publicitario o de reventa del acceso al sitio.',
        'Cualquier intento de scraping masivo o automatizado más allá del uso normal (por ejemplo, más de 60 solicitudes por minuto, o copia íntegra de la base de datos).',
        'Cualquier intento de eludir las medidas de seguridad, los límites de tasa o las cabeceras CSP.',
        'Cualquier inyección de contenido malicioso (script, iframe, carga de archivos) a través de campos de usuario (búsqueda, comparación, etc.).',
        'Cualquier uso del sitio para acosar, amenazar, difamar o vulnerar de otro modo los derechos de terceros.',
        'Cualquier intento de identificar o perfilar a otros usuarios.',
        'Cualquier reventa, redistribución o republicación del contenido del sitio sin autorización previa por escrito.',
      ],
    },
    {
      id: 'availability',
      title: '5. Disponibilidad del servicio',
      paragraphs: [
        'Lunidex se proporciona "tal cual" y "según disponibilidad". El editor se esfuerza por mantener el sitio accesible las 24 horas del día, los 7 días de la semana, pero no garantiza una disponibilidad ininterrumpida.',
        'El servicio puede interrumpirse temporalmente por mantenimiento, actualizaciones, problemas técnicos o fuerza mayor. No se podrá reclamar ninguna compensación por este motivo.',
      ],
    },
    {
      id: 'responsibility',
      title: '6. Responsabilidad',
      intro: 'Dentro de los límites autorizados por la ley aplicable:',
      list: [
        'Lunidex no podrá ser considerado responsable de daños indirectos, incidentales, especiales o consecuentes resultantes del uso o de la imposibilidad de usar el sitio.',
        'El editor no garantiza la precisión, integridad o actualidad de los datos mostrados.',
        'El editor no podrá ser considerado responsable del contenido de sitios de terceros accesibles a través de enlaces desde Lunidex.',
        'El usuario es el único responsable del uso que haga de la información proporcionada por el sitio.',
      ],
      paragraphs: [
        'Si alguna disposición de estos TDS fuera considerada inválida o inaplicable por un tribunal competente, las demás disposiciones seguirán en pleno vigor.',
      ],
    },
    {
      id: 'accountability',
      title: '7. Notificación de contenido ilegal',
      paragraphs: [
        'Si considera que algún contenido mostrado en Lunidex infringe sus derechos (propiedad intelectual, difamación, etc.), puede contactarnos en estdel3012@gmail.com especificando: la naturaleza del contenido en cuestión, su URL exacta, su condición (titular de derechos o representante) y cualquier prueba justificativa.',
        'Nos comprometemos a revisar cualquier notificación en un plazo razonable y, en su caso, a retirar o modificar el contenido en cuestión.',
      ],
    },
    {
      id: 'modifications',
      title: '8. Cambios en los TDS',
      paragraphs: [
        'Estos TDS pueden modificarse en cualquier momento. La fecha de la última actualización se indica en la parte superior de esta página. En caso de un cambio sustancial, se mostrará una notificación en el sitio.',
        'El uso continuado del sitio tras la publicación de las modificaciones constituye la aceptación de los nuevos TDS.',
      ],
    },
    {
      id: 'law',
      title: '9. Ley aplicable y jurisdicción',
      paragraphs: [
        'Estos TDS se rigen por la legislación francesa, sin perjuicio de las disposiciones imperativas aplicables en su país de residencia (en particular, el derecho de consumo de la UE).',
        'A falta de un acuerdo amistoso, cualquier disputa relativa a la interpretación o ejecución de estos TDS estará sujeta a la jurisdicción de los tribunales franceses, salvo disposición en contrario de la ley aplicable a los consumidores.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contacto',
      paragraphs: [
        'Para cualquier pregunta relativa a estos TDS, puede contactarnos en estdel3012@gmail.com.',
      ],
    },
  ],
};

const legalNotice: LegalDocument = {
  title: 'Aviso Legal',
  intro:
    'Este aviso legal se publica de conformidad con el artículo 6 de la Ley francesa para la Confianza en la Economía Digital (LCEN) del 21 de junio de 2004.',
  preamble:
    'Lunidex es publicado por una persona física a título personal y no comercial. No hay ninguna entidad jurídica detrás de este proyecto: es un proyecto de fans.',
  lastUpdated: '4 de junio de 2026',
  effectiveDate: '4 de junio de 2026',
  sections: [
    {
      id: 'editor',
      title: '1. Editor del sitio',
      intro: 'Lunidex es publicado por:',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Nombre', 'Lunidex (nombre del proyecto personal)'],
          ['Estatus', 'Persona física — proyecto personal no comercial'],
          ['Director de publicación', 'El editor individual'],
          ['Contacto', 'estdel3012@gmail.com'],
          ['SIRET', 'No aplicable (sin entidad jurídica)'],
          ['Número de IVA', 'No aplicable'],
          ['Dirección', 'No publicada (persona física)'],
          ['Director de publicación', 'El editor del sitio'],
        ],
      },
      callout: {
        type: 'warning',
        text: 'A falta de entidad jurídica, Lunidex no está inscrito en el Registro Mercantil (RCS) ni en el Registro de Artesanos (RM). El editor actúa bajo su responsabilidad civil personal.',
      },
    },
    {
      id: 'host',
      title: '2. Proveedor de alojamiento',
      intro: 'El sitio está alojado por:',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Empresa', 'Vercel Inc.'],
          ['Forma jurídica', 'Sociedad estadounidense (Delaware)'],
          ['Dirección', '340 S Lemon Ave #4133, Walnut, CA 91789, EE. UU.'],
          ['Sitio web', 'vercel.com'],
          ['Contacto', 'privacy@vercel.com'],
        ],
      },
    },
    {
      id: 'activity',
      title: '3. Actividad y naturaleza del servicio',
      paragraphs: [
        'Lunidex es un Pokédex en línea y un catálogo de cartas TCG, gratuito, sin publicidad y no monetizado. El sitio muestra datos públicos relacionados con el universo Pokémon (números, tipos, estadísticas, sprites, cartas) con fines estrictamente informativos y recreativos.',
        'El servicio se proporciona de forma gratuita, sin registro, sin recopilación de datos personales y sin transacción comercial.',
      ],
    },
    {
      id: 'affiliation-notice',
      title: '4. No afiliación',
      paragraphs: [
        'Lunidex es un proyecto de fans no comercial, independiente y no afiliado. Las marcas, nombres, sprites, ilustraciones y demás elementos relacionados con el universo Pokémon siguen siendo propiedad exclusiva de Nintendo, Game Freak, Creatures Inc. y The Pokémon Company.',
        'No debe inferirse del sitio ninguna afiliación, asociación, patrocinio o aprobación oficial por parte de los titulares de derechos mencionados. Para más información, consulte nuestros TDS.',
      ],
    },
    {
      id: 'contact',
      title: '5. Contacto',
      paragraphs: [
        'Para cualquier solicitud relacionada con el sitio (preguntas, notificaciones, ejercicio de derechos del RGPD), puede contactarnos en: estdel3012@gmail.com.',
      ],
    },
    {
      id: 'authority',
      title: '6. Autoridad de control',
      paragraphs: [
        'Para cualquier reclamación relativa a la protección de sus datos personales, puede contactar con la Commission Nationale de l\'Informatique et des Libertés (CNIL): www.cnil.fr.',
      ],
    },
  ],
};

const cookies: LegalDocument = {
  title: 'Política de Cookies',
  intro:
    'Esta política detalla las cookies y rastreadores instalados en su dispositivo cuando navega por Lunidex, de conformidad con las directrices de la CNIL y el RGPD.',
  preamble:
    'Una cookie es un pequeño archivo de texto que el servidor de un sitio web instala en su dispositivo. Algunas cookies son estrictamente necesarias para el funcionamiento del sitio; otras requieren su consentimiento previo.',
  lastUpdated: '4 de junio de 2026',
  effectiveDate: '4 de junio de 2026',
  sections: [
    {
      id: 'inventory',
      title: '1. Inventario de las cookies utilizadas',
      intro: 'Lunidex utiliza almacenamiento estrictamente necesario para el servicio. La medición de audiencia y rendimiento de Vercel y la medición de producto de Supabase permanecen desactivadas hasta que otorgue el consentimiento correspondiente.',
      table: {
        headers: ['Cookie', 'Finalidad', 'Tipo', 'Duración', 'Editor'],
        rows: [
          ['primedex-lang', 'Recuerda su idioma preferido', 'Estrictamente necesaria (Art. 82 de la Ley de Protección de Datos francesa)', '1 año', 'Lunidex'],
          ['tcg-user-state', 'Conserva su estado de interfaz en las páginas del TCG (filtros, ordenaciones)', 'Estrictamente necesaria', '1 año', 'Lunidex'],
        ],
      },
      callout: {
        type: 'info',
        text: 'Las cookies estrictamente necesarias están exentas de consentimiento previo en virtud del artículo 82 de la Ley de Protección de Datos francesa y las recomendaciones de la CNIL.',
      },
    },
    {
      id: 'details',
      title: '2. Detalles de cada cookie',
      subsections: [
        {
          id: 'lang',
          title: '2.1. primedex-lang',
          paragraphs: [
            'Esta cookie recuerda el idioma en el que ha elegido mostrar el sitio. Sin ella, vería Lunidex en el idioma predeterminado (inglés) en cada visita. No contiene ningún dato personal: solo se almacena un valor alfabético ("en", "fr", "de", etc.).',
          ],
          list: [
            'Editor: Lunidex.',
            'Duración: máximo 1 año.',
            'Tipo: cookie HTTP del lado del servidor (establecida mediante la cabecera Set-Cookie).',
            'Base jurídica: interés legítimo (Art. 6.1.f RGPD) — exención de consentimiento CNIL.',
          ],
        },
        {
          id: 'tcg',
          title: '2.2. tcg-user-state',
          paragraphs: [
            'Esta cookie conserva el estado de la interfaz en las páginas del catálogo TCG (filtros activos, modo de visualización, últimas ordenaciones) para que pueda encontrar sus preferencias de una visita a otra.',
          ],
          list: [
            'Editor: Lunidex.',
            'Duración: máximo 1 año.',
            'Tipo: cookie del lado del cliente (localStorage, gestionada por el navegador).',
            'Base jurídica: interés legítimo (Art. 6.1.f RGPD) — exención de consentimiento CNIL.',
          ],
        },
      ],
    },
    {
      id: 'no-third-party',
      title: '3. Ausencia de cookies de terceros',
      paragraphs: [
        'Lunidex no establece ninguna cookie de terceros. En particular:',
        'Esta política puede actualizarse si decidimos añadir un servicio de terceros. En ese caso, se solicitará su consentimiento a través del banner de cookies antes de instalar cualquier cookie no estrictamente necesaria.',
      ],
      list: [
        'Vercel Web Analytics y Speed Insights solo se cargan después del consentimiento de audiencia y rendimiento; Supabase solo recibe contadores diarios agregados de producto después del consentimiento separado de medición de producto.',
        'No se instala ninguna cookie de publicidad (Meta Pixel, Google Ads, TikTok Pixel, etc.).',
        'No se instala ninguna cookie de redes sociales (botones de compartir de Facebook, Twitter, etc.).',
        'No se carga ningún script de retargeting o perfilado.',
      ],
    },
    {
      id: 'localstorage',
      title: '4. Almacenamiento local (IndexedDB y localStorage)',
      paragraphs: [
        'Además de las cookies, Lunidex utiliza tecnologías de almacenamiento local (IndexedDB, localStorage) para conservar sus preferencias y datos de uso. Estos datos permanecen en su dispositivo y nunca se transmiten a un servidor.',
        'Para más información sobre estos datos (favoritos, equipos, colección TCG, puntuaciones de quiz, preferencias de visualización), consulte nuestra política de privacidad (sección 2.2 "Datos almacenados localmente").',
      ],
    },
    {
      id: 'manage',
      title: '5. Gestione sus cookies',
      intro: 'Puede controlar y eliminar las cookies en cualquier momento:',
      list: [
        'A través de la configuración de su navegador (véase más abajo).',
        'Borrando los datos de navegación del sitio primedex.vercel.app.',
        'Haciendo clic en el botón "Gestionar mis preferencias" del banner de cookies, si se muestra.',
        'Desactivando JavaScript en su navegador (a costa de una degradación importante del servicio).',
      ],
      paragraphs: ['Enlaces a páginas de ayuda para los navegadores más comunes:'],
      table: {
        headers: ['Navegador', 'Enlace de ayuda'],
        rows: [
          ['Google Chrome', 'support.google.com/chrome/answer/95647'],
          ['Mozilla Firefox', 'support.mozilla.org/es/kb/Borrar%20cookies'],
          ['Apple Safari', 'support.apple.com/guide/safari/sfri11471'],
          ['Microsoft Edge', 'support.microsoft.com/es-es/microsoft-edge/eliminar-cookies'],
        ],
      },
    },
    {
      id: 'changes',
      title: '6. Cambios en esta política',
      paragraphs: [
        'Esta política de cookies puede actualizarse para reflejar la adición o eliminación de cookies, o cambios en la normativa. La fecha de la última actualización se indica en la parte superior de esta página.',
      ],
    },
    {
      id: 'contact',
      title: '7. Contacto',
      paragraphs: [
        'Para cualquier pregunta relativa a esta política, puede contactarnos en: estdel3012@gmail.com.',
      ],
    },
  ],
};

export const esLegal = { privacy, terms, legalNotice, cookies };
