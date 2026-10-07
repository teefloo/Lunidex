import type { SupportedLanguage } from '@/lib/languages';

interface DemoTranslations {
  title: string;
  notice: string;
  reset_notice: string;
  signup: string;
  auth_unavailable: string;
  progress: string;
  mark_owned: string;
  mark_missing: string;
  start_title: string;
  start_description: string;
  try_checklist: string;
  account_transition: string;
}

export const tcgDemoTranslations = {
  en: {
    title: 'Demo checklist',
    notice: 'Demo mode — your progress has not been saved.',
    reset_notice: 'Temporary progress: cleared when you refresh, change sets or sign in. Demo changes will not be transferred to your account.',
    signup: 'Create an account to save my progress',
    auth_unavailable: 'Account creation is unavailable here. You can still try the demo.',
    progress: 'Owned {{owned}} / {{total}} · Progress {{percent}}%',
    mark_owned: 'Demo: mark {{name}} as owned',
    mark_missing: 'Demo: mark {{name}} as missing',
    start_title: 'Try a real set checklist',
    start_description: 'Choose a Pokémon TCG set, mark a few cards and see your progress. No account needed to try it. Demo changes are temporary and will not be transferred to your account.',
    try_checklist: 'Try the checklist without an account',
    account_transition: 'You are now viewing your saved collection. Demo changes were discarded and were not transferred. Your existing collection is unchanged; your next changes can be saved here.',
  },
  fr: {
    title: 'Checklist démo',
    notice: 'Mode démo — ta progression n’est pas encore sauvegardée.',
    reset_notice: 'Progression temporaire : effacée au rechargement, au changement de set ou à la connexion. Aucun transfert vers ton compte.',
    signup: 'Créer un compte pour sauvegarder ma progression',
    auth_unavailable: 'La création de compte est indisponible ici. Tu peux toujours tester la démo.',
    progress: 'Possédées {{owned}} / {{total}} · Progression {{percent}} %',
    mark_owned: 'Démo : marquer {{name}} comme possédée',
    mark_missing: 'Démo : marquer {{name}} comme manquante',
    start_title: 'Tester la checklist d’un vrai set',
    start_description: 'Choisis un set Pokémon TCG, marque quelques cartes et vois ta progression. Aucun compte nécessaire pour tester. Les modifications démo sont temporaires et ne seront pas transférées à ton compte.',
    try_checklist: 'Tester la checklist sans compte',
    account_transition: 'Tu consultes maintenant ta collection sauvegardée. Les modifications démo ont été effacées sans transfert. Ta collection existante est inchangée ; tes prochaines modifications pourront être sauvegardées ici.',
  },
  es: {
    title: 'Lista de demostración',
    notice: 'Modo demo — tu progreso aún no está guardado.',
    reset_notice: 'Progreso temporal: se borra al recargar, cambiar de expansión o iniciar sesión. Los cambios de la demo no se transferirán a tu cuenta.',
    signup: 'Crear una cuenta para guardar mi progreso',
    auth_unavailable: 'No se pueden crear cuentas aquí. Puedes seguir probando la demo.',
    progress: 'Obtenidas {{owned}} / {{total}} · Progreso {{percent}}%',
    mark_owned: 'Demo: marcar {{name}} como obtenida',
    mark_missing: 'Demo: marcar {{name}} como faltante',
    start_title: 'Prueba la lista de una expansión real',
    start_description: 'Elige una expansión Pokémon TCG, marca algunas cartas y consulta tu progreso. No necesitas una cuenta para probar. Los cambios de la demo son temporales y no se transferirán a tu cuenta.',
    try_checklist: 'Probar la lista sin cuenta',
    account_transition: 'Ahora ves tu colección guardada. Los cambios de la demo se han borrado sin transferirse. Tu colección existente no ha cambiado; aquí podrás guardar tus próximos cambios.',
  },
  de: {
    title: 'Demo-Checkliste',
    notice: 'Demo-Modus — dein Fortschritt ist noch nicht gespeichert.',
    reset_notice: 'Vorübergehender Fortschritt: wird beim Neuladen, Setwechsel oder Anmelden gelöscht. Demo-Änderungen werden nicht in dein Konto übernommen.',
    signup: 'Konto erstellen, um meinen Fortschritt zu speichern',
    auth_unavailable: 'Hier können keine Konten erstellt werden. Du kannst die Demo weiterhin testen.',
    progress: 'Vorhanden {{owned}} / {{total}} · Fortschritt {{percent}}%',
    mark_owned: 'Demo: {{name}} als vorhanden markieren',
    mark_missing: 'Demo: {{name}} als fehlend markieren',
    start_title: 'Teste die Checkliste eines echten Sets',
    start_description: 'Wähle ein Pokémon-TCG-Set, markiere einige Karten und sieh deinen Fortschritt. Zum Testen brauchst du kein Konto. Demo-Änderungen sind vorübergehend und werden nicht in dein Konto übernommen.',
    try_checklist: 'Checkliste ohne Konto testen',
    account_transition: 'Du siehst jetzt deine gespeicherte Sammlung. Demo-Änderungen wurden gelöscht und nicht übertragen. Deine bestehende Sammlung ist unverändert; hier kannst du deine nächsten Änderungen speichern.',
  },
  it: {
    title: 'Checklist demo',
    notice: 'Modalità demo — i tuoi progressi non sono ancora salvati.',
    reset_notice: 'Progressi temporanei: si azzerano quando ricarichi, cambi espansione o accedi. Le modifiche demo non verranno trasferite al tuo account.',
    signup: 'Crea un account per salvare i miei progressi',
    auth_unavailable: 'Qui non è possibile creare account. Puoi continuare a provare la demo.',
    progress: 'Possedute {{owned}} / {{total}} · Progresso {{percent}}%',
    mark_owned: 'Demo: segna {{name}} come posseduta',
    mark_missing: 'Demo: segna {{name}} come mancante',
    start_title: 'Prova la checklist di un’espansione reale',
    start_description: 'Scegli un’espansione Pokémon TCG, segna alcune carte e controlla i progressi. Non serve un account per provare. Le modifiche demo sono temporanee e non verranno trasferite al tuo account.',
    try_checklist: 'Prova la checklist senza account',
    account_transition: 'Ora stai visualizzando la tua collezione salvata. Le modifiche demo sono state cancellate senza trasferimento. La collezione esistente è invariata; qui potrai salvare le prossime modifiche.',
  },
  ja: {
    title: 'デモチェックリスト',
    notice: 'デモモード — 進捗はまだ保存されていません。',
    reset_notice: '進捗は一時的です。再読み込み、セットの変更、ログインでリセットされます。デモの変更はアカウントに引き継がれません。',
    signup: 'アカウントを作成して進捗を保存',
    auth_unavailable: 'ここではアカウントを作成できません。デモは引き続き試せます。',
    progress: '所持 {{owned}} / {{total}} · 進捗 {{percent}}%',
    mark_owned: 'デモ：{{name}}を所持にする',
    mark_missing: 'デモ：{{name}}を未所持にする',
    start_title: '実際のセットのチェックリストを試す',
    start_description: 'ポケモンTCGのセットを選び、カードを数枚マークして進捗を確認できます。体験にアカウントは不要です。デモの変更は一時的で、アカウントには引き継がれません。',
    try_checklist: 'アカウントなしでチェックリストを試す',
    account_transition: '保存済みのコレクションを表示しています。デモの変更は削除され、引き継がれていません。既存のコレクションに変更はありません。今後の変更はここで保存できます。',
  },
  ko: {
    title: '데모 체크리스트',
    notice: '데모 모드 — 진행 상황은 아직 저장되지 않았습니다.',
    reset_notice: '진행 상황은 일시적입니다. 새로고침, 세트 변경 또는 로그인 시 초기화되며 계정으로 이전되지 않습니다.',
    signup: '계정을 만들어 진행 상황 저장하기',
    auth_unavailable: '여기서는 계정을 만들 수 없습니다. 데모는 계속 체험할 수 있습니다.',
    progress: '보유 {{owned}} / {{total}} · 진행률 {{percent}}%',
    mark_owned: '데모: {{name}} 보유로 표시',
    mark_missing: '데모: {{name}} 미보유로 표시',
    start_title: '실제 세트의 체크리스트 체험하기',
    start_description: '포켓몬 TCG 세트를 선택하고 카드를 몇 장 표시하여 진행률을 확인하세요. 계정 없이 체험할 수 있습니다. 데모 변경 사항은 일시적이며 계정으로 이전되지 않습니다.',
    try_checklist: '계정 없이 체크리스트 체험하기',
    account_transition: '이제 저장된 컬렉션이 표시됩니다. 데모 변경 사항은 삭제되었으며 이전되지 않았습니다. 기존 컬렉션은 그대로입니다. 이후 변경 사항은 여기에서 저장할 수 있습니다.',
  },
  zh: {
    title: '演示清单',
    notice: '演示模式 — 你的进度尚未保存。',
    reset_notice: '进度是临时的，刷新、切换卡牌系列或登录时会清除。演示更改不会转移到你的账号。',
    signup: '创建账号以保存我的进度',
    auth_unavailable: '此处暂时无法创建账号，你仍可以体验演示。',
    progress: '已拥有 {{owned}} / {{total}} · 进度 {{percent}}%',
    mark_owned: '演示：将{{name}}标记为已拥有',
    mark_missing: '演示：将{{name}}标记为缺失',
    start_title: '体验真实系列的卡牌清单',
    start_description: '选择一个宝可梦TCG系列，标记几张卡牌并查看进度。无需账号即可体验。演示更改是临时的，不会转移到你的账号。',
    try_checklist: '无需账号体验清单',
    account_transition: '你现在查看的是已保存的收藏。演示更改已清除，未转移到账号。现有收藏没有变化；你可以在此保存后续更改。',
  },
} satisfies Record<SupportedLanguage, DemoTranslations>;
