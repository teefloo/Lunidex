import type { SupportedLanguage } from '@/lib/languages';

const copy: Record<SupportedLanguage, { title: string; text: string }> = {
  en: { title: 'Measurement', text: 'With your choices, Vercel Web Analytics and Speed Insights measure audience and performance. Optional Supabase product measurement stores only daily aggregated funnel counters for 90 days, without profiling, account linkage, or any join with user_state. You can withdraw at any time.' },
  fr: { title: 'Mesure', text: 'Selon vos choix, Vercel Web Analytics et Speed Insights mesurent audience et performance. La mesure produit Supabase, facultative, ne conserve que des compteurs journaliers agrégés du funnel pendant 90 jours, sans profilage, compte ni jointure avec user_state. Vous pouvez retirer votre choix à tout moment.' },
  es: { title: 'Medición', text: 'Según tus elecciones, Vercel Web Analytics y Speed Insights miden audiencia y rendimiento. La medición opcional de producto de Supabase conserva solo contadores diarios agregados durante 90 días, sin perfiles, cuentas ni unión con user_state. Puedes retirar tu elección en cualquier momento.' },
  de: { title: 'Messung', text: 'Je nach Auswahl messen Vercel Web Analytics und Speed Insights Reichweite und Leistung. Die optionale Supabase-Produktmessung speichert nur tägliche aggregierte Zähler für 90 Tage, ohne Profiling, Konto oder Verknüpfung mit user_state. Die Auswahl kann jederzeit widerrufen werden.' },
  it: { title: 'Misurazione', text: 'In base alle tue scelte, Vercel Web Analytics e Speed Insights misurano pubblico e prestazioni. La misurazione prodotto Supabase facoltativa conserva solo contatori giornalieri aggregati per 90 giorni, senza profilazione, account o collegamento con user_state. Puoi revocare la scelta in qualsiasi momento.' },
  ja: { title: '計測', text: '選択に応じて、Vercel Web Analytics と Speed Insights が利用状況と性能を計測します。任意の Supabase 製品計測は、プロファイリング、アカウント、user_state との結合なしに、集計済みの日次カウンターのみを90日間保持します。いつでも撤回できます。' },
  ko: { title: '측정', text: '선택에 따라 Vercel Web Analytics와 Speed Insights가 이용 현황과 성능을 측정합니다. 선택 사항인 Supabase 제품 측정은 프로파일링, 계정 또는 user_state 결합 없이 집계된 일일 카운터만 90일간 보관합니다. 언제든 철회할 수 있습니다.' },
  zh: { title: '测量', text: '根据您的选择，Vercel Web Analytics 和 Speed Insights 用于测量受众与性能。可选的 Supabase 产品测量仅保存聚合的每日漏斗计数器 90 天，不进行画像、不关联账户或 user_state。您可以随时撤回选择。' },
};

export function MeasurementNotice({ lang }: { lang: SupportedLanguage }) { const item = copy[lang]; return <section className="mt-8 rounded-lg border border-foreground/10 p-5"><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-foreground/80">{item.text}</p></section>; }
