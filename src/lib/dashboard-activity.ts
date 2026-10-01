import type { SupportedLanguage } from './languages';
import type { ActivityAction } from '@/types/dashboard';

type ActivityTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const QUIZ_MODE_KEYS = {
  'time-attack': 'quiz.mode_time_attack',
  survival: 'quiz.mode_survival',
  marathon: 'quiz.mode_marathon',
} as const;

const QUIZ_CHALLENGE_KEYS = {
  classic: 'quiz.classic',
  silhouette: 'quiz.silhouette',
  stats: 'quiz.stats_mode',
} as const;

const ACTIVITY_ACTION_KEYS = {
  pokemon_view: 'dashboard.activity.actions.pokemon_view',
  tcg_add: 'dashboard.activity.actions.tcg_add',
  favorite_add: 'dashboard.activity.actions.favorite_add',
  team_edit: 'dashboard.activity.actions.team_edit',
  caught: 'dashboard.activity.actions.caught',
} as const;

function recordedName(label: string, prefix: string): string {
  const match = label.match(new RegExp(`^${prefix}\\s+(.+)$`, 'i'));
  return match?.[1]?.trim() || label.trim();
}

export function translateActivityAction(
  action: ActivityAction,
  translate: ActivityTranslator,
): { label: string; details?: string } {
  if (action.type === 'quiz') {
    const match = action.label.match(/^Played (time-attack|survival|marathon) (classic|silhouette|stats) quiz$/i);
    const mode = match?.[1]?.toLowerCase() as keyof typeof QUIZ_MODE_KEYS | undefined;
    const challenge = match?.[2]?.toLowerCase() as keyof typeof QUIZ_CHALLENGE_KEYS | undefined;
    const translatedMode = mode ? translate(QUIZ_MODE_KEYS[mode]) : translate('quiz.title');
    const translatedChallenge = challenge ? translate(QUIZ_CHALLENGE_KEYS[challenge]) : null;
    const label = translate('dashboard.activity.actions.quiz', {
      mode: translatedChallenge ? `${translatedChallenge} · ${translatedMode}` : translatedMode,
    });
    const score = action.details?.match(/^Score:\s*(\d+)$/i)?.[1];

    return {
      label,
      ...(score ? { details: `${translate('quiz.final_score')} ${score}` } : {}),
    };
  }

  const translationKey = ACTIVITY_ACTION_KEYS[action.type];
  const name = action.type === 'pokemon_view'
    ? recordedName(action.label, 'Viewed')
    : action.type === 'favorite_add'
      ? recordedName(action.label, 'Favorited')
      : action.type === 'caught'
        ? recordedName(action.label, 'Caught')
        : undefined;

  return {
    label: translate(translationKey, name ? { name } : undefined),
    ...(action.details ? { details: action.details } : {}),
  };
}

export function formatActivityDate(
  dateString: string,
  language: SupportedLanguage,
  now = Date.now(),
): string {
  const date = new Date(dateString);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '-';

  const difference = timestamp - now;
  const absoluteDifference = Math.abs(difference);
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

  if (absoluteDifference < 60_000) return relative.format(0, 'second');
  if (absoluteDifference < 3_600_000) return relative.format(Math.round(difference / 60_000), 'minute');
  if (absoluteDifference < 86_400_000) return relative.format(Math.round(difference / 3_600_000), 'hour');
  if (absoluteDifference < 7 * 86_400_000) return relative.format(Math.round(difference / 86_400_000), 'day');

  return new Intl.DateTimeFormat(language, { dateStyle: 'short' }).format(date);
}
