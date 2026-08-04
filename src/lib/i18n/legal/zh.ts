import type { LegalDocument } from '../legal-types';

const privacy: LegalDocument = {
  title: '隐私政策',
  intro:
    '本政策依据《通用数据保护条例》(GDPR)和《加州消费者隐私法》(CCPA)，说明您使用 Lunidex 时我们如何处理您的个人数据。',
  preamble:
    'Lunidex 是一个非商业性的粉丝网站，与任天堂、Game Freak、宝可梦公司或 Creatures Inc. 没有任何关联。我们非常重视您的隐私保护。本政策将完全透明地说明收集哪些数据、原因、使用方式、保留时长以及您所拥有的权利。',
  lastUpdated: '2026年6月4日',
  effectiveDate: '2026年6月4日',
  sections: [
    {
      id: 'controller',
      title: '1. 数据控制者',
      intro: '您个人数据的控制者为：',
      paragraphs: [
        'Lunidex 由个人以个人、非商业方式发布。不存在法人实体、商业注册号或独立的法定代表人。',
        '发布者在 GDPR 第 4(7) 条的意义上作为数据控制者行事，决定处理您个人数据的目的和方式。',
      ],
      table: {
        headers: ['角色', '身份', '联系方式'],
        rows: [
          ['发布者（数据控制者）', '个人 — Lunidex', 'estdel3012@gmail.com'],
          ['托管服务商（数据处理者）', 'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA', 'privacy@vercel.com'],
          ['数据保护官', '未指定（低风险处理）', 'estdel3012@gmail.com'],
        ],
      },
      callout: {
        type: 'info',
        text: '未经充分保障措施（标准合同条款或充分性认定），任何数据均不会转移至欧盟以外的第三国。',
      },
    },
    {
      id: 'data',
      title: '2. 收集的数据',
      intro: 'Lunidex 仅收集运营服务所需的最少数据。',
      subsections: [
        {
          id: 'data-personal',
          title: '2.1. 个人数据',
          paragraphs: [
            '您使用本网站时，我们不会收集任何直接身份识别数据（姓名、电子邮件地址、电话号码、邮寄地址、出生日期）。无需注册或创建账户。',
          ],
          list: [
            '无身份数据（姓名、用户名）。',
            '无电子邮件地址或直接联系方式（除非您自愿联系我们）。',
            '无由我们管理的密码或会话标识符。',
            '无支付、银行或商业数据。',
            '无精确地理定位数据。',
            '无生物识别数据。',
          ],
        },
        {
          id: 'data-local',
          title: '2.2. 本地存储的数据（IndexedDB）',
          paragraphs: [
            '以下数据仅存储在您浏览器的本地数据库（IndexedDB）中。这些数据从不传输至我们的服务器或任何第三方，我们也无法访问：',
          ],
          list: [
            '您收藏的宝可梦（数字标识符）。',
            '您的队伍配置。',
            '您的"已捕获"宝可梦状态（个人图鉴）。',
            '您正在进行的宝可梦对比。',
            '您的集换式卡牌游戏（TCG）收藏：拥有、心愿单、关注的卡牌。',
            '您对卡牌的个人笔记。',
            '您保存的搜索记录和内部浏览历史。',
            '您的测验记录和分数（猜猜看、属性相克等）。',
            '您的显示偏好：浅色/深色主题、语言、声音、通知。',
            '您解锁的徽章和成就。',
          ],
          callout: {
            type: 'success',
            text: '这些数据保留在您的设备上。您可以随时通过网站设置（"重置我的数据"部分）删除它们，或清除浏览器存储数据。',
          },
        },
        {
          id: 'data-technical',
          title: '2.3. 自动传输的技术数据',
          paragraphs: [
            '每次连接到 Lunidex 时，您的浏览器会自动与我们的基础设施及数据处理者交换技术信息。这些数据是建立和正常运行通信所必需的：',
          ],
          table: {
            headers: ['类别', '数据', '目的', '法律依据（GDPR）'],
            rows: [
              ['技术', 'IP 地址', '网络路由、安全、防滥用、CDN 地理定位', '合法利益（第6.1(f)条）'],
              ['技术', 'User-Agent（浏览器、操作系统）', '显示兼容性、调试', '合法利益（第6.1(f)条）'],
              ['技术', 'HTTP 标头（Referer、Accept-Language）', '路由、语言检测', '合法利益（第6.1(f)条）'],
              ['日志', 'Vercel 访问日志（时间戳、URL、HTTP 代码）', '安全、事件检测、调试', '合法利益（第6.1(f)条）'],
            ],
          },
        },
        {
          id: 'data-cookies',
          title: '2.4. Cookie 和跟踪器',
          paragraphs: [
            'Lunidex 使用服务严格必要的存储。仅在您同意后，Vercel Web Analytics 和 Speed Insights 才衡量受众和性能；Neon 仅接收每日产品衡量计数。请参阅 Cookie 政策了解独立的目的和选择。',
          ],
          list: [
            'primedex-lang（时长：1年）：记住您偏好的语言。',
            'tcg-user-state（时长：1年）：保留您在 TCG 页面的界面状态。',
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '3. 目的和法律依据',
      intro: '根据 GDPR 第6条，每项处理活动均基于特定的法律依据：',
      table: {
        headers: ['目的', '涉及数据', '法律依据'],
        rows: [
          ['提供图鉴和 TCG 服务', '技术数据（IP、UA）', '服务提供 / 合法利益（第6.1(f)条）'],
          ['记忆语言和偏好设置', '功能性 Cookie', '合法利益（第6.1(f)条）— CNIL 同意豁免'],
          ['托管和内容分发', '所有技术数据', '与 Vercel 的托管合同（第6.1(b)条）'],
          ['安全、防滥用、调试', 'Vercel 日志、IP', '合法利益（第6.1(f)条）'],
          ['回复您的联系请求', '电子邮件、消息内容', '合同前措施或同意（第6.1(a)/(b)条）'],
          ['本地存储您的偏好设置', 'IndexedDB 数据', 'GDPR 范围之外 — 设备本地存储'],
        ],
      },
    },
    {
      id: 'recipients',
      title: '4. 数据接收方和处理者',
      intro: '您的数据仅与服务运行所严格必需的处理者共享。不进行任何商业性转让。',
      paragraphs: [
        'Lunidex 不会出于商业或营销目的向第三方出售、出租或转让任何个人数据。不进行任何具有法律效力的用户画像或自动化决策。',
      ],
      table: {
        headers: ['数据处理者', '服务', '国家', '转移保障措施'],
        rows: [
          ['Vercel Inc.', 'CDN 托管、SSR、日志', '美国', '欧盟-美国数据隐私框架 + 标准合同条款'],
          ['PokéAPI（Paul Hallett）', '公开宝可梦数据 API', '美国/欧盟', '不传输个人数据'],
          ['TCGdex', '公开 TCG 卡牌 API', '欧盟/法国', '不传输个人数据'],
          ['Scrydex', 'TCG 图片托管', '欧盟', '不传输个人数据'],
          ['GitHub (raw.githubusercontent.com)', '精灵图托管', '美国', '不传输个人数据'],
        ],
      },
    },
    {
      id: 'transfers',
      title: '5. 国际数据传输',
      paragraphs: [
        '本网站由总部位于美国的 Vercel Inc. 托管。向美国传输数据受欧盟委员会 2023 年 7 月 10 日关于欧盟-美国数据隐私框架（DPF）的充分性认定以及欧盟委员会通过的标准合同条款（SCC）的约束（作为补充）。',
        '其他第三方服务（PokéAPI、TCGdex、Scrydex、GitHub）不会收到有关您的任何个人数据：仅向其传输路由请求所必需的技术数据。',
      ],
      callout: {
        type: 'info',
        text: '如需行使您的权利或获取转移保障措施的副本，请联系 estdel3012@gmail.com。',
      },
    },
    {
      id: 'retention',
      title: '6. 数据保留',
      intro: '我们在保留期限方面遵循数据最小化原则：',
      table: {
        headers: ['数据类别', '保留期限'],
        rows: [
          ['本地 IndexedDB 数据', '直至您删除（通过设置或浏览器）'],
          ['功能性 Cookie', '最长1年'],
          ['Vercel 日志', '最长30天（Vercel 内部轮换政策）'],
          ['联系邮件', '最后一次沟通后3年（会计义务）'],
        ],
      },
    },
    {
      id: 'security',
      title: '7. 安全',
      paragraphs: [
        'Lunidex 实施适当的技术和组织措施，以保护您的数据免受未经授权的访问、篡改、泄露或破坏。',
      ],
      list: [
        '全站 HTTPS/TLS 1.3 加密（启用 HSTS）。',
        '安全标头：X-Frame-Options DENY、X-Content-Type-Options nosniff、Referrer-Policy strict-origin-when-cross-origin、限制性 Permissions-Policy。',
        '严格的内容安全策略（CSP），限制脚本执行和图片来源。',
        '不存储任何敏感数据（密码、支付信息），从而减少攻击面。',
        '定期更新依赖项（npm audit 和 Dependabot 警报）。',
        'GitHub 上的开源、可审计代码（设计上的透明性）。',
      ],
    },
    {
      id: 'rights',
      title: '8. 您的权利',
      intro: '根据 GDPR（第15至22条）和 CCPA，您对个人数据享有以下权利：',
      list: [
        '访问权（GDPR 第15条）：获取您数据的副本。',
        '更正权（GDPR 第16条）：更正不准确的数据。',
        '删除权（GDPR 第17条）：请求删除您的数据。',
        '限制权（GDPR 第18条）：暂时限制处理。',
        '数据可携权（GDPR 第20条）：以结构化格式接收您的数据（主要适用于本地数据）。',
        '反对权（GDPR 第21条）：反对基于合法利益的处理。',
        '撤回同意权（GDPR 第7.3条）：当处理基于同意时。',
        '向监管机构投诉的权利（GDPR 第77条）。',
        'CCPA 权利（加州居民）：知情权、删除权、选择退出权及不受歧视权。',
      ],
      paragraphs: [
        '如需行使上述任何权利，请致函 estdel3012@gmail.com。我们将在最长30天内答复。可能需要身份证明以核实请求确实来自您本人。',
        '您也可以向 CNIL（法国信息与自由委员会，www.cnil.fr）投诉，欧盟居民可向所在国的数据保护机构投诉。加州居民可联系加州总检察长办公室（oag.ca.gov）。',
      ],
    },
    {
      id: 'children',
      title: '9. 未成年人保护',
      paragraphs: [
        'Lunidex 面向家庭受众，未成年人也可能浏览本网站。未经父母同意，本网站不会故意收集16岁以下（或当地法律适用年龄以下）儿童的任何个人数据。',
        '本网站不提供任何儿童专属板块，不提供消息功能，也不收集能直接识别未成年人身份的信息。若家长认为其子女提供了个人信息，可联系我们要求删除。',
        '根据《儿童在线隐私保护法》（COPPA）和 GDPR，本网站不会故意收集13岁以下（COPPA）或16岁以下（GDPR，除非成员国设定更低年龄）儿童的数据。',
      ],
    },
    {
      id: 'third-parties',
      title: '10. 第三方服务与外部链接',
      paragraphs: [
        'Lunidex 依赖第三方 API 和服务（PokéAPI、TCGdex、Scrydex、GitHub）来提供所显示的数据。这些服务有其自身的隐私政策，我们建议您查阅。',
        '本网站还可能提供指向外部网站的链接（例如宝可梦官方页面、YouTube 视频、商店）。我们对这些第三方网站的内容或隐私实践不承担任何责任。',
      ],
    },
    {
      id: 'changes',
      title: '11. 本政策的变更',
      paragraphs: [
        '本隐私政策可能会更新，以反映服务、法规或我们做法的变化。最后更新日期显示在本页顶部。',
        '如发生重大变更，网站将以显著方式显示通知（例如通过临时横幅）。我们建议您定期查阅本页面。',
      ],
    },
    {
      id: 'contact',
      title: '12. 联系方式',
      intro: '如对本隐私政策或行使您的权利有任何疑问：',
      table: {
        headers: ['渠道', '详情'],
        rows: [
          ['电子邮件', 'estdel3012@gmail.com'],
          ['回复时间', '最长30天（GDPR 第12.3条）'],
          ['支持语言', '法语或英语'],
          ['源代码', 'github.com/Teeflo/Poke（公开 issue）'],
        ],
      },
    },
  ],
};

const terms: LegalDocument = {
  title: '服务条款',
  intro:
    '本服务条款规定了您访问和使用 Lunidex 的相关规则。访问本网站即表示您同意受本条款约束。',
  preamble:
    'Lunidex 是一个个人的、免费的、无广告的、未货币化的粉丝项目，以宝可梦世界观为主题，"按现状"提供，用于娱乐和信息目的。使用本网站即构成对本条款的接受。',
  lastUpdated: '2026年6月4日',
  effectiveDate: '2026年6月4日',
  sections: [
    {
      id: 'object',
      title: '1. 目的',
      paragraphs: [
        'Lunidex 是一个非商业性网站，收录与宝可梦（编号、属性、能力值、描述、进化、特性、精灵图）以及同一世界观的集换式卡牌游戏（TCG）卡牌相关的数据。这是一个纯粹以信息和娱乐为目的的粉丝项目。',
        '本网站免费提供且无广告。使用本服务无需购买、订阅或注册。',
      ],
    },
    {
      id: 'affiliation',
      title: '2. 非关联声明及知识产权',
      intro: 'Lunidex 与以下各方没有任何关联、赞助、支持或认可关系：',
      list: [
        '任天堂株式会社。',
        'Game Freak 株式会社。',
        'Creatures 株式会社。',
        '宝可梦公司（TPC）及其子公司。',
        '宝可梦中心、Wizards of the Coast（Hasbro），或任何其他与宝可梦商标相关的权利人。',
      ],
      paragraphs: [
        '与宝可梦世界观相关的商标、名称、精灵图、插图、声音、视频及任何其他内容，均归其各自权利人独家所有。Lunidex 不对其主张任何所有权。',
        '对宝可梦商标和内容的使用是出于非商业性粉丝项目目的，这在大多数司法管辖区构成本质上被允许的描述性和信息性使用。若权利人认为任何内容侵犯其权利，我们承诺在收到发送至 estdel3012@gmail.com 的通知后及时移除。',
        '本网站的源代码依据 MIT 许可证（开源）发布。这并不授予对宝可梦商标的任何权利：MIT 许可证仅适用于 Lunidex 作者编写的代码。',
      ],
    },
    {
      id: 'sources',
      title: '3. 数据来源',
      paragraphs: [
        'Lunidex 显示的数据完全来自公开的、社区维护的第三方来源：PokéAPI（pokeapi.co，由 Paul Hallett 维护）和 TCGdex（api.tcgdex.net）。图片由 Scrydex 和 GitHub（raw.githubusercontent.com）托管。',
        '我们努力显示准确且最新的数据，但不保证不存在错误、遗漏或与数据源的同步延迟。数据仅供参考，不能替代官方来源。',
      ],
    },
    {
      id: 'usage',
      title: '4. 授权与禁止用途',
      intro: '您被授权将 Lunidex 用于个人、非商业和信息目的。特别禁止以下行为：',
      list: [
        '对网站访问进行任何商业、广告或转售用途。',
        '任何超出正常使用范围的大规模或自动化抓取行为（例如每分钟超过60次请求，或整体复制数据库）。',
        '任何试图规避安全措施、速率限制或 CSP 标头的行为。',
        '通过用户输入字段（搜索、比较等）注入恶意内容（脚本、iframe、上传）。',
        '利用本网站骚扰、威胁、诽谤或以其他方式侵犯他人权利。',
        '任何试图识别或对其他用户进行画像分析的行为。',
        '未经事先书面授权对网站内容进行转售、再分发或再发布。',
      ],
    },
    {
      id: 'availability',
      title: '5. 服务可用性',
      paragraphs: [
        'Lunidex 按"现状"和"可用性"提供。发布者努力保持网站全天候可访问，但不保证不间断的可用性。',
        '服务可能因维护、更新、技术问题或不可抗力而暂时中断。不得以此为由要求任何赔偿。',
      ],
    },
    {
      id: 'responsibility',
      title: '6. 责任',
      intro: '在适用法律允许的范围内：',
      list: [
        'Lunidex 不对因使用或无法使用本网站而产生的间接、附带、特殊或后果性损害承担责任。',
        '发布者不保证所显示数据的准确性、完整性或时效性。',
        '发布者不对通过 Lunidex 链接访问的第三方网站内容承担责任。',
        '用户对其如何使用本网站提供的信息独自承担责任。',
      ],
      paragraphs: [
        '如本条款的任何条款被有管辖权的法院认定为无效或不可执行，其余条款仍应保持完全效力。',
      ],
    },
    {
      id: 'accountability',
      title: '7. 举报非法内容',
      paragraphs: [
        '若您认为 Lunidex 上显示的任何内容侵犯了您的权利（知识产权、诽谤等），可联系 estdel3012@gmail.com，并说明：相关内容的性质、其确切网址、您的身份（权利人或代理人）以及任何支持性证据。',
        '我们承诺在合理时间内审查任何举报，并在适当情况下移除或修改相关内容。',
      ],
    },
    {
      id: 'modifications',
      title: '8. 条款的变更',
      paragraphs: [
        '本条款可能随时修改。最后更新日期显示在本页顶部。如发生重大变更，网站将显示通知。',
        '在修改内容发布后继续使用本网站，即构成对新条款的接受。',
      ],
    },
    {
      id: 'law',
      title: '9. 适用法律及管辖权',
      paragraphs: [
        '本条款受法国法律管辖，但不影响您居住国适用的强制性规定（特别是欧盟消费者法）。',
        '若无法友好解决，与本条款的解释或执行相关的任何争议均应受法国法院管辖，除非适用于消费者的法律另有规定。',
      ],
    },
    {
      id: 'contact',
      title: '10. 联系方式',
      paragraphs: [
        '如对本条款有任何疑问，可联系 estdel3012@gmail.com。',
      ],
    },
  ],
};

const legalNotice: LegalDocument = {
  title: '法律声明',
  intro:
    '本法律声明依据2004年6月21日法国《数字经济信任法》（LCEN）第6条发布。',
  preamble:
    'Lunidex 由个人以个人、非商业方式发布。该项目背后没有任何法人实体：这是一个粉丝项目。',
  lastUpdated: '2026年6月4日',
  effectiveDate: '2026年6月4日',
  sections: [
    {
      id: 'editor',
      title: '1. 网站发布者',
      intro: 'Lunidex 由以下主体发布：',
      table: {
        headers: ['字段', '内容'],
        rows: [
          ['名称', 'Lunidex（个人项目名称）'],
          ['状态', '个人 — 个人非商业项目'],
          ['出版负责人', '个人发布者'],
          ['联系方式', 'estdel3012@gmail.com'],
          ['注册号', '不适用（无法人实体）'],
          ['增值税号', '不适用'],
          ['地址', '未公开（个人）'],
          ['出版负责人', '网站发布者'],
        ],
      },
      callout: {
        type: 'warning',
        text: '由于不存在法人实体，Lunidex 未在商业登记簿（RCS）或手工业登记簿（RM）中注册。发布者以其个人民事责任行事。',
      },
    },
    {
      id: 'host',
      title: '2. 托管服务商',
      intro: '本网站由以下服务商托管：',
      table: {
        headers: ['字段', '内容'],
        rows: [
          ['公司', 'Vercel Inc.'],
          ['法律形式', '美国（特拉华州）公司'],
          ['地址', '340 S Lemon Ave #4133, Walnut, CA 91789, USA'],
          ['网站', 'vercel.com'],
          ['联系方式', 'privacy@vercel.com'],
        ],
      },
    },
    {
      id: 'activity',
      title: '3. 活动性质与服务内容',
      paragraphs: [
        'Lunidex 是一个免费、无广告、未货币化的在线图鉴及 TCG 卡牌目录网站。本网站出于严格的信息和娱乐目的，显示与宝可梦世界观相关的公开数据（编号、属性、能力值、精灵图、卡牌）。',
        '本服务免费提供，无需注册，不收集个人数据，不涉及商业交易。',
      ],
    },
    {
      id: 'affiliation-notice',
      title: '4. 非关联声明',
      paragraphs: [
        'Lunidex 是一个非商业性、独立、无关联的粉丝项目。与宝可梦世界观相关的商标、名称、精灵图、插图及其他所有元素均归任天堂、Game Freak、Creatures Inc. 和宝可梦公司独家所有。',
        '不应从本网站推断出与上述权利人存在任何关联、合作、赞助或官方认可关系。更多信息请参阅我们的服务条款。',
      ],
    },
    {
      id: 'contact',
      title: '5. 联系方式',
      paragraphs: [
        '如有与本网站相关的任何请求（问题、举报、行使 GDPR 权利），可联系：estdel3012@gmail.com。',
      ],
    },
    {
      id: 'authority',
      title: '6. 监管机构',
      paragraphs: [
        '如对您个人数据的保护有任何投诉，可联系法国信息与自由委员会（CNIL）：www.cnil.fr。',
      ],
    },
  ],
};

const cookies: LegalDocument = {
  title: 'Cookie 政策',
  intro:
    '本政策依据 CNIL 指南和 GDPR，详细说明您浏览 Lunidex 时在您设备上设置的 Cookie 和跟踪器。',
  preamble:
    'Cookie 是网站服务器放置在您设备上的小型文本文件。部分 Cookie 是网站正常运行所严格必需的；其他 Cookie 则需要您的事先同意。',
  lastUpdated: '2026年6月4日',
  effectiveDate: '2026年6月4日',
  sections: [
    {
      id: 'inventory',
      title: '1. 使用的 Cookie 清单',
      intro: 'Lunidex 使用服务严格必要的存储。Vercel 的受众和性能衡量以及 Neon 的产品衡量在获得各自同意前均保持禁用。',
      table: {
        headers: ['Cookie', '目的', '类型', '时长', '发布者'],
        rows: [
          ['primedex-lang', '记住您偏好的语言', '严格必要（法国数据保护法第82条）', '1年', 'Lunidex'],
          ['tcg-user-state', '保留您在 TCG 页面的界面状态（筛选、排序）', '严格必要', '1年', 'Lunidex'],
        ],
      },
      callout: {
        type: 'info',
        text: '根据法国数据保护法第82条和 CNIL 的建议，严格必要的 Cookie 无需事先同意。',
      },
    },
    {
      id: 'details',
      title: '2. 每个 Cookie 的详细信息',
      subsections: [
        {
          id: 'lang',
          title: '2.1. primedex-lang',
          paragraphs: [
            '此 Cookie 记住您选择显示网站所用的语言。若无此 Cookie，您每次访问时都会看到默认语言（英语）的 Lunidex。它不包含任何个人数据：仅存储一个字母值（如 "en"、"fr"、"de" 等）。',
          ],
          list: [
            '发布者：Lunidex。',
            '有效期：最长1年。',
            '类型：服务器端 HTTP Cookie（通过 Set-Cookie 标头设置）。',
            '法律依据：合法利益（GDPR 第6.1(f)条）— CNIL 同意豁免。',
          ],
        },
        {
          id: 'tcg',
          title: '2.2. tcg-user-state',
          paragraphs: [
            '此 Cookie 保留 TCG 目录页面的界面状态（活动筛选器、显示模式、最近排序），以便您每次访问都能找到自己的偏好设置。',
          ],
          list: [
            '发布者：Lunidex。',
            '有效期：最长1年。',
            '类型：客户端 Cookie（localStorage，由浏览器端管理）。',
            '法律依据：合法利益（GDPR 第6.1(f)条）— CNIL 同意豁免。',
          ],
        },
      ],
    },
    {
      id: 'no-third-party',
      title: '3. 无第三方 Cookie',
      paragraphs: [
        'Lunidex 不设置任何第三方 Cookie。具体而言：',
        '如果我们决定添加第三方服务，本政策可能会更新。在这种情况下，在设置任何非严格必要的 Cookie 之前，将通过 Cookie 横幅征求您的同意。',
      ],
      list: [
        'Vercel Web Analytics 和 Speed Insights 仅在受众和性能同意后加载；Neon 仅在单独同意产品衡量后接收汇总的每日产品计数。',
        '未安装任何广告 Cookie（Meta Pixel、Google Ads、TikTok Pixel 等）。',
        '未安装任何社交网络 Cookie（Facebook、Twitter 分享按钮等）。',
        '未加载任何重定向或用户画像脚本。',
      ],
    },
    {
      id: 'localstorage',
      title: '4. 本地存储（IndexedDB 和 localStorage）',
      paragraphs: [
        '除 Cookie 外，Lunidex 还使用本地存储技术（IndexedDB、localStorage）来保存您的偏好设置和使用数据。这些数据保留在您的设备上，从不会传输至服务器。',
        '有关这些数据（收藏夹、队伍、TCG 收藏、测验分数、显示偏好）的更多信息，请参阅我们的隐私政策（第 2.2 节"本地存储的数据"）。',
      ],
    },
    {
      id: 'manage',
      title: '5. 管理您的 Cookie',
      intro: '您可以随时控制和删除 Cookie：',
      list: [
        '通过您的浏览器设置（见下文）。',
        '清除 primedex.vercel.app 网站的浏览数据。',
        '点击 Cookie 横幅上的"管理我的偏好"按钮（如有显示）。',
        '在浏览器中禁用 JavaScript（但会导致服务严重降级）。',
      ],
      paragraphs: ['常见浏览器的帮助页面链接：'],
      table: {
        headers: ['浏览器', '帮助链接'],
        rows: [
          ['Google Chrome', 'support.google.com/chrome/answer/95647'],
          ['Mozilla Firefox', 'support.mozilla.org/zh-CN/kb/清除火狐浏览器中的cookie'],
          ['Apple Safari', 'support.apple.com/guide/safari/sfri11471'],
          ['Microsoft Edge', 'support.microsoft.com/zh-cn/microsoft-edge/删除-cookie'],
        ],
      },
    },
    {
      id: 'changes',
      title: '6. 本政策的变更',
      paragraphs: [
        '本 Cookie 政策可能会更新，以反映 Cookie 的增删或法规的变化。最后更新日期显示在本页顶部。',
      ],
    },
    {
      id: 'contact',
      title: '7. 联系方式',
      paragraphs: [
        '如对本政策有任何疑问，可联系：estdel3012@gmail.com。',
      ],
    },
  ],
};

export const zhLegal = { privacy, terms, legalNotice, cookies };
