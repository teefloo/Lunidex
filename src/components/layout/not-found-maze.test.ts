import { describe, expect, it } from 'vitest';

import {
  advanceMazeGame,
  coordKey,
  createMazeGame,
  findReachableMazeCells,
  generateMazeLayout,
  getMazeTile,
  isMazeSolvable,
  MAZE_DIRECTION_VECTORS,
  MAZE_FRAGMENT_SYMBOLS,
  type MazeCoord,
  type MazeDirection,
  type MazeGameState,
  type MazeLayout,
  type MazeRandom,
} from './not-found-maze';

function createSeededRandom(seed: number): MazeRandom {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function findPath(layout: MazeLayout, start: MazeCoord, target: MazeCoord, blockedTile: MazeCoord | null = null) {
  const queue: MazeCoord[] = [start];
  const parents = new Map<string, { previous: MazeCoord; direction: MazeDirection }>();
  const visited = new Set([coordKey(start)]);
  const blockedKey = blockedTile ? coordKey(blockedTile) : null;

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) break;
    if (coordKey(current) === coordKey(target)) break;

    for (const [direction, delta] of Object.entries(MAZE_DIRECTION_VECTORS) as Array<[MazeDirection, MazeCoord]>) {
      const next = {
        x: current.x + delta.x,
        y: current.y + delta.y,
      };
      const key = coordKey(next);
      const tile = getMazeTile(layout, next);

      if (blockedKey && key === blockedKey) continue;
      if (!tile || tile === '#') continue;
      if (visited.has(key)) continue;

      visited.add(key);
      parents.set(key, { previous: current, direction });
      queue.push(next);
    }
  }

  const targetKey = coordKey(target);

  if (!parents.has(targetKey) && targetKey !== coordKey(start)) {
    throw new Error(`No path found to ${targetKey}`);
  }

  const directions: MazeDirection[] = [];
  let cursorKey = targetKey;

  while (cursorKey !== coordKey(start)) {
    const step = parents.get(cursorKey);

    if (!step) {
      throw new Error(`Broken path at ${cursorKey}`);
    }

    directions.unshift(step.direction);
    cursorKey = coordKey(step.previous);
  }

  return directions;
}

function applyDirections(layout: MazeLayout, state: MazeGameState, directions: MazeDirection[]) {
  let current = state;

  for (const direction of directions) {
    current = advanceMazeGame(current, direction, layout).state;
  }

  return current;
}

describe('not found maze logic', () => {
  it('generates solvable mazes with the expected structure', () => {
    for (const seed of [11, 27, 101, 404, 1337]) {
      const layout = generateMazeLayout(createSeededRandom(seed));
      const reachable = findReachableMazeCells(layout);
      const reachableWithoutExit = findReachableMazeCells(layout, layout.exit);

      expect(layout.width).toBe(19);
      expect(layout.height).toBe(13);
      expect(layout.fragments).toHaveLength(MAZE_FRAGMENT_SYMBOLS.length);
      expect(isMazeSolvable(layout)).toBe(true);
      expect(reachable.has(coordKey(layout.exit))).toBe(true);
      expect(
        layout.fragments.every((fragment) => reachableWithoutExit.has(coordKey(fragment.position)))
      ).toBe(true);
    }
  });

  it('changes the maze shape across different seeds', () => {
    const first = generateMazeLayout(createSeededRandom(1));
    const second = generateMazeLayout(createSeededRandom(2));

    expect(first.rows.join('\n')).not.toBe(second.rows.join('\n'));
  });

  it('does not increment steps when a wall blocks the move', () => {
    const layout = generateMazeLayout(createSeededRandom(7));
    const initial = createMazeGame(layout, 'playing');
    const result = advanceMazeGame(initial, 'left', layout);

    expect(result.outcome).toBe('blocked');
    expect(result.state.player).toEqual(initial.player);
    expect(result.state.steps).toBe(0);
    expect(result.state.notice).toBe('blocked');
  });

  it('keeps the exit locked until all fragments are collected', () => {
    const layout = generateMazeLayout(createSeededRandom(19));
    const pathToExit = findPath(layout, layout.start, layout.exit);
    const cellBeforeExit = pathToExit.slice(0, -1).reduce<MazeCoord>((position, direction) => ({
      x: position.x + MAZE_DIRECTION_VECTORS[direction].x,
      y: position.y + MAZE_DIRECTION_VECTORS[direction].y,
    }), layout.start);
    const lockedState: MazeGameState = {
      ...createMazeGame(layout, 'playing'),
      player: cellBeforeExit,
      steps: 8,
      foundFragmentIds: [layout.fragments[0].id],
      exitUnlocked: false,
      notice: 'exploring',
    };
    const finalStep = pathToExit[pathToExit.length - 1];
    const result = advanceMazeGame(lockedState, finalStep, layout);

    expect(result.outcome).toBe('locked');
    expect(result.state.player).toEqual(lockedState.player);
    expect(result.state.steps).toBe(8);
    expect(result.state.status).toBe('playing');
    expect(result.state.notice).toBe('locked');
  });

  it('wins once all fragments are collected and the player reaches the exit', () => {
    const layout = generateMazeLayout(createSeededRandom(404));
    let state = createMazeGame(layout, 'playing');

    for (const fragment of layout.fragments) {
      const directions = findPath(layout, state.player, fragment.position, layout.exit);
      state = applyDirections(layout, state, directions);
    }

    expect(state.foundFragmentIds).toHaveLength(MAZE_FRAGMENT_SYMBOLS.length);
    expect(state.exitUnlocked).toBe(true);

    const exitPath = findPath(layout, state.player, layout.exit);
    state = applyDirections(layout, state, exitPath);

    expect(state.status).toBe('won');
    expect(state.notice).toBe('won');
    expect(state.player).toEqual(layout.exit);
    expect(state.bestSteps).toBe(state.steps);
  });
});
