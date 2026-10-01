import { describe, expect, it } from 'vitest';
import { formatActivityDate, translateActivityAction } from './dashboard-activity';

const translate = (key: string, values?: Record<string, string | number>): string => {
  if (key === 'quiz.classic') return 'Classique';
  if (key === 'quiz.silhouette') return 'Silhouette';
  if (key === 'quiz.stats_mode') return 'Stats';
  if (key === 'quiz.mode_time_attack') return 'Contre la montre';
  if (key === 'quiz.mode_survival') return 'Survie';
  if (key === 'quiz.mode_marathon') return 'Marathon';
  if (key === 'quiz.final_score') return 'Score final :';
  if (key === 'dashboard.activity.actions.quiz') return `Quiz ${values?.mode ?? ''}`;
  if (key === 'dashboard.activity.actions.pokemon_view') return `Pokémon consulté : ${values?.name ?? ''}`;
  if (key === 'dashboard.activity.actions.tcg_add') return 'Carte ajoutée';
  if (key === 'dashboard.activity.actions.favorite_add') return `Favori : ${values?.name ?? ''}`;
  if (key === 'dashboard.activity.actions.team_edit') return 'Équipe modifiée';
  if (key === 'dashboard.activity.actions.caught') return `Pokémon capturé : ${values?.name ?? ''}`;
  return key;
};

describe('dashboard activity localization', () => {
  it('translates persisted quiz labels and score details', () => {
    expect(translateActivityAction({
      id: 'quiz-1',
      date: '2026-10-01T10:00:00.000Z',
      type: 'quiz',
      label: 'Played time-attack classic quiz',
      details: 'Score: 12',
    }, translate)).toEqual({
      label: 'Quiz Classique · Contre la montre',
      details: 'Score final : 12',
    });
  });

  it('localizes known activity types while preserving Pokémon names', () => {
    expect(translateActivityAction({
      id: 'view-1',
      date: '2026-10-01T10:00:00.000Z',
      type: 'pokemon_view',
      label: 'Viewed Bulbasaur',
    }, translate)).toEqual({ label: 'Pokémon consulté : Bulbasaur' });

    expect(translateActivityAction({
      id: 'team-1',
      date: '2026-10-01T10:00:00.000Z',
      type: 'team_edit',
      label: 'Edited team',
    }, translate)).toEqual({ label: 'Équipe modifiée' });

    expect(translateActivityAction({
      id: 'favorite-1',
      date: '2026-10-01T10:00:00.000Z',
      type: 'favorite_add',
      label: 'Favorited Pikachu',
    }, translate)).toEqual({ label: 'Favori : Pikachu' });

    expect(translateActivityAction({
      id: 'caught-1',
      date: '2026-10-01T10:00:00.000Z',
      type: 'caught',
      label: 'Caught Mew',
    }, translate)).toEqual({ label: 'Pokémon capturé : Mew' });

    expect(translateActivityAction({
      id: 'tcg-1',
      date: '2026-10-01T10:00:00.000Z',
      type: 'tcg_add',
      label: 'Added TCG card',
    }, translate)).toEqual({ label: 'Carte ajoutée' });
  });

  it('uses locale-aware relative dates and handles invalid timestamps', () => {
    const now = Date.parse('2026-10-01T12:00:00.000Z');

    expect(formatActivityDate('2026-09-30T12:00:00.000Z', 'fr', now)).toBe('hier');
    expect(formatActivityDate('not-a-date', 'fr', now)).toBe('-');
  });
});
