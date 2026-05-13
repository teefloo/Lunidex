export const MAZE_CANVAS_WIDTH = 640;
export const MAZE_CANVAS_HEIGHT = 440;
export const MAZE_TILE_SIZE = 32;
export const MAZE_WIDTH = 19;
export const MAZE_HEIGHT = 13;
export const MAZE_PIXEL_WIDTH = MAZE_WIDTH * MAZE_TILE_SIZE;
export const MAZE_PIXEL_HEIGHT = MAZE_HEIGHT * MAZE_TILE_SIZE;
export const MAZE_OFFSET_X = Math.floor((MAZE_CANVAS_WIDTH - MAZE_PIXEL_WIDTH) / 2);
export const MAZE_OFFSET_Y = Math.floor((MAZE_CANVAS_HEIGHT - MAZE_PIXEL_HEIGHT) / 2);
export const MAZE_FRAGMENT_SYMBOLS = ['4', '0', '4'] as const;

export type MazeTile = '#' | '.' | 'S' | 'E' | '0' | '4';
export type MazeDirection = 'up' | 'down' | 'left' | 'right';
export type MazeStatus = 'ready' | 'playing' | 'won';
export type MazeNotice = 'ready' | 'exploring' | 'fragment' | 'blocked' | 'locked' | 'won';
export type MazeRandom = () => number;

export type MazeCoord = {
  x: number;
  y: number;
};

export type MazeFragment = {
  id: string;
  symbol: (typeof MAZE_FRAGMENT_SYMBOLS)[number];
  position: MazeCoord;
};

export type MazeLayout = {
  rows: readonly string[];
  width: number;
  height: number;
  start: MazeCoord;
  exit: MazeCoord;
  fragments: readonly MazeFragment[];
};

export type MazeGameState = {
  status: MazeStatus;
  notice: MazeNotice;
  player: MazeCoord;
  steps: number;
  bestSteps: number | null;
  foundFragmentIds: readonly string[];
  exitUnlocked: boolean;
};

export type MazeAdvanceOutcome = 'moved' | 'blocked' | 'locked' | 'won';

export type MazeAdvanceResult = {
  state: MazeGameState;
  outcome: MazeAdvanceOutcome;
  collectedFragment: MazeFragment | null;
};

export type MazeRound = {
  layout: MazeLayout;
  game: MazeGameState;
};

export const MAZE_DIRECTION_VECTORS: Record<MazeDirection, MazeCoord> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function createWallGrid() {
  return Array.from({ length: MAZE_HEIGHT }, () => Array.from({ length: MAZE_WIDTH }, () => '#'));
}

function cloneCoord(coord: MazeCoord): MazeCoord {
  return { x: coord.x, y: coord.y };
}

function randomIndex(length: number, random: MazeRandom) {
  return Math.floor(random() * length);
}

function shuffle<T>(values: readonly T[], random: MazeRandom) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function manhattanDistance(a: MazeCoord, b: MazeCoord) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInsidePlayableArea(coord: MazeCoord) {
  return coord.x > 0 && coord.x < MAZE_WIDTH - 1 && coord.y > 0 && coord.y < MAZE_HEIGHT - 1;
}

function isWalkableGridCell(grid: string[][], coord: MazeCoord) {
  return grid[coord.y]?.[coord.x] !== '#';
}

function countWalkableNeighbors(grid: string[][], coord: MazeCoord) {
  return Object.values(MAZE_DIRECTION_VECTORS).reduce((count, delta) => {
    const next = {
      x: coord.x + delta.x,
      y: coord.y + delta.y,
    };

    return count + (isWalkableGridCell(grid, next) ? 1 : 0);
  }, 0);
}

function gridToRows(grid: string[][]) {
  return grid.map((row) => row.join(''));
}

function getRowTile(rows: readonly string[], coord: MazeCoord) {
  const row = rows[coord.y];
  if (!row) return null;
  return row[coord.x] ?? null;
}

function findDistances(rows: readonly string[], start: MazeCoord) {
  const distances = new Map<string, number>();
  const queue: MazeCoord[] = [start];

  distances.set(coordKey(start), 0);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDistance = distances.get(coordKey(current)) ?? 0;

    for (const delta of Object.values(MAZE_DIRECTION_VECTORS)) {
      const next = {
        x: current.x + delta.x,
        y: current.y + delta.y,
      };
      const tile = getRowTile(rows, next);
      const key = coordKey(next);

      if (!tile || tile === '#' || distances.has(key)) {
        continue;
      }

      distances.set(key, currentDistance + 1);
      queue.push(next);
    }
  }

  return distances;
}

function pickExit(rows: readonly string[], grid: string[][], start: MazeCoord, random: MazeRandom) {
  const distances = findDistances(rows, start);
  const walkableCells = Array.from(distances.entries()).map(([key, distance]) => {
    const [x, y] = key.split(',').map(Number);
    return { position: { x, y }, distance };
  });
  const leafCandidates = walkableCells.filter(({ position }) => (
    coordKey(position) !== coordKey(start) && countWalkableNeighbors(grid, position) === 1
  ));
  const source = leafCandidates.length > 0 ? leafCandidates : walkableCells.filter(({ position }) => coordKey(position) !== coordKey(start));
  const farthestDistance = Math.max(...source.map((candidate) => candidate.distance));
  const farthestCandidates = source.filter((candidate) => candidate.distance === farthestDistance);

  return cloneCoord(shuffle(farthestCandidates, random)[0].position);
}

function pickFragmentPositions(rows: readonly string[], start: MazeCoord, exit: MazeCoord, random: MazeRandom) {
  const startDistances = findDistances(rows, start);
  const exitDistances = findDistances(rows, exit);
  const allCandidates = Array.from(startDistances.entries())
    .map(([key, distanceFromStart]) => {
      const [x, y] = key.split(',').map(Number);
      const position = { x, y };
      const distanceFromExit = exitDistances.get(key) ?? 0;

      return {
        key,
        position,
        distanceFromStart,
        distanceFromExit,
        score: distanceFromStart + distanceFromExit,
      };
    })
    .filter(({ position }) => (
      coordKey(position) !== coordKey(start)
      && coordKey(position) !== coordKey(exit)
    ));
  const preferredCandidates = allCandidates.filter(({ position }) => (
      coordKey(position) !== coordKey(start)
      && coordKey(position) !== coordKey(exit)
      && manhattanDistance(position, start) >= 3
      && manhattanDistance(position, exit) >= 3
    ));
  const candidates = preferredCandidates.length >= MAZE_FRAGMENT_SYMBOLS.length ? preferredCandidates : allCandidates;

  const ranked = shuffle(candidates, random).sort((a, b) => b.score - a.score);
  const selected: MazeCoord[] = [];
  const selectedKeys = new Set<string>();

  for (let minSpacing = 6; minSpacing >= 0 && selected.length < MAZE_FRAGMENT_SYMBOLS.length; minSpacing -= 1) {
    selected.length = 0;
    selectedKeys.clear();

    for (const candidate of ranked) {
      if (selected.length === MAZE_FRAGMENT_SYMBOLS.length) break;
      if (selectedKeys.has(candidate.key)) continue;

      const farEnough = selected.every((position) => manhattanDistance(position, candidate.position) >= minSpacing);
      if (!farEnough) continue;

      selected.push(cloneCoord(candidate.position));
      selectedKeys.add(candidate.key);
    }
  }

  if (selected.length < MAZE_FRAGMENT_SYMBOLS.length) {
    for (const candidate of ranked) {
      if (selected.length === MAZE_FRAGMENT_SYMBOLS.length) break;
      if (selectedKeys.has(candidate.key)) continue;

      selected.push(cloneCoord(candidate.position));
      selectedKeys.add(candidate.key);
    }
  }

  return selected;
}

function createGeneratedRows(start: MazeCoord, exit: MazeCoord, fragmentPositions: readonly MazeCoord[], baseRows: readonly string[]) {
  const fragmentTiles = new Map<string, string>();

  fragmentPositions.forEach((position, index) => {
    fragmentTiles.set(coordKey(position), MAZE_FRAGMENT_SYMBOLS[index]);
  });

  return baseRows.map((row, y) => row.split('').map((tile, x) => {
    const coord = { x, y };
    const key = coordKey(coord);

    if (key === coordKey(start)) return 'S';
    if (key === coordKey(exit)) return 'E';
    if (fragmentTiles.has(key)) return fragmentTiles.get(key)!;

    return tile;
  }).join(''));
}

export function coordKey(coord: MazeCoord) {
  return `${coord.x},${coord.y}`;
}

export function getMazeTile(layout: MazeLayout, coord: MazeCoord): MazeTile | null {
  const row = layout.rows[coord.y];
  if (!row) return null;
  const tile = row[coord.x];
  if (!tile) return null;
  return tile as MazeTile;
}

export function isWalkableMazeTile(tile: MazeTile | null) {
  return tile !== null && tile !== '#';
}

export function createMazeLayout(rows: readonly string[]): MazeLayout {
  if (rows.length === 0) {
    throw new Error('Maze layout must include at least one row.');
  }

  const width = rows[0].length;
  let start: MazeCoord | null = null;
  let exit: MazeCoord | null = null;
  const fragments: MazeFragment[] = [];

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error('Maze rows must all share the same width.');
    }

    row.split('').forEach((rawTile, x) => {
      const tile = rawTile as MazeTile;

      if (tile === 'S') {
        if (start) {
          throw new Error('Maze layout can only contain one start tile.');
        }
        start = { x, y };
      }

      if (tile === 'E') {
        if (exit) {
          throw new Error('Maze layout can only contain one exit tile.');
        }
        exit = { x, y };
      }

      if (tile === '0' || tile === '4') {
        fragments.push({
          id: `${tile}-${fragments.length}`,
          symbol: tile,
          position: { x, y },
        });
      }
    });
  });

  if (!start) {
    throw new Error('Maze layout is missing a start tile.');
  }

  if (!exit) {
    throw new Error('Maze layout is missing an exit tile.');
  }

  if (fragments.length !== MAZE_FRAGMENT_SYMBOLS.length) {
    throw new Error('Maze layout must contain exactly three fragments.');
  }

  return {
    rows,
    width,
    height: rows.length,
    start,
    exit,
    fragments,
  };
}

export function generateMazeLayout(random: MazeRandom = Math.random): MazeLayout {
  const grid = createWallGrid();
  const start = { x: 1, y: 1 };
  const stack: MazeCoord[] = [start];

  grid[start.y][start.x] = '.';

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = shuffle(
      Object.values(MAZE_DIRECTION_VECTORS)
        .map((delta) => ({
          next: {
            x: current.x + delta.x * 2,
            y: current.y + delta.y * 2,
          },
          between: {
            x: current.x + delta.x,
            y: current.y + delta.y,
          },
        }))
        .filter(({ next }) => isInsidePlayableArea(next) && grid[next.y][next.x] === '#'),
      random
    );

    const nextStep = neighbors[0];

    if (!nextStep) {
      stack.pop();
      continue;
    }

    grid[nextStep.between.y][nextStep.between.x] = '.';
    grid[nextStep.next.y][nextStep.next.x] = '.';
    stack.push(nextStep.next);
  }

  const baseRows = gridToRows(grid);
  const exit = pickExit(baseRows, grid, start, random);
  const fragmentPositions = pickFragmentPositions(baseRows, start, exit, random);
  const rows = createGeneratedRows(start, exit, fragmentPositions, baseRows);

  return createMazeLayout(rows);
}

export function findReachableMazeCells(layout: MazeLayout, blockedTile: MazeCoord | null = null) {
  const reachable = new Set<string>();
  const queue: MazeCoord[] = [layout.start];
  const blockedKey = blockedTile ? coordKey(blockedTile) : null;

  reachable.add(coordKey(layout.start));

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    for (const delta of Object.values(MAZE_DIRECTION_VECTORS)) {
      const next = {
        x: current.x + delta.x,
        y: current.y + delta.y,
      };
      const key = coordKey(next);

      if (blockedKey && key === blockedKey) {
        continue;
      }

      const tile = getMazeTile(layout, next);

      if (!isWalkableMazeTile(tile) || reachable.has(key)) {
        continue;
      }

      reachable.add(key);
      queue.push(next);
    }
  }

  return reachable;
}

export function isMazeSolvable(layout: MazeLayout) {
  const reachableWithoutExit = findReachableMazeCells(layout, layout.exit);
  const reachableWithExit = findReachableMazeCells(layout);

  return (
    reachableWithExit.has(coordKey(layout.exit))
    && layout.fragments.every((fragment) => reachableWithoutExit.has(coordKey(fragment.position)))
  );
}

export function createMazeGame(
  layout: MazeLayout,
  status: MazeStatus = 'ready',
  bestSteps: number | null = null
): MazeGameState {
  return {
    status,
    notice: status === 'ready' ? 'ready' : 'exploring',
    player: cloneCoord(layout.start),
    steps: 0,
    bestSteps,
    foundFragmentIds: [],
    exitUnlocked: false,
  };
}

export function createMazeRound(bestSteps: number | null = null, status: MazeStatus = 'ready', random: MazeRandom = Math.random): MazeRound {
  const layout = generateMazeLayout(random);

  return {
    layout,
    game: createMazeGame(layout, status, bestSteps),
  };
}

export function advanceMazeGame(
  state: MazeGameState,
  direction: MazeDirection,
  layout: MazeLayout
): MazeAdvanceResult {
  if (state.status !== 'playing') {
    return {
      state,
      outcome: 'blocked',
      collectedFragment: null,
    };
  }

  const delta = MAZE_DIRECTION_VECTORS[direction];
  const target = {
    x: state.player.x + delta.x,
    y: state.player.y + delta.y,
  };
  const tile = getMazeTile(layout, target);

  if (!isWalkableMazeTile(tile)) {
    return {
      state: {
        ...state,
        notice: 'blocked',
      },
      outcome: 'blocked',
      collectedFragment: null,
    };
  }

  if (tile === 'E' && !state.exitUnlocked) {
    return {
      state: {
        ...state,
        notice: 'locked',
      },
      outcome: 'locked',
      collectedFragment: null,
    };
  }

  const collectedFragment = layout.fragments.find((fragment) => coordKey(fragment.position) === coordKey(target))
    ?? null;
  const nextFoundFragmentIds = collectedFragment && !state.foundFragmentIds.includes(collectedFragment.id)
    ? [...state.foundFragmentIds, collectedFragment.id]
    : [...state.foundFragmentIds];
  const nextSteps = state.steps + 1;
  const exitUnlocked = nextFoundFragmentIds.length === layout.fragments.length;

  if (tile === 'E') {
    const bestSteps = state.bestSteps === null ? nextSteps : Math.min(state.bestSteps, nextSteps);

    return {
      state: {
        ...state,
        status: 'won',
        notice: 'won',
        player: target,
        steps: nextSteps,
        bestSteps,
        foundFragmentIds: nextFoundFragmentIds,
        exitUnlocked,
      },
      outcome: 'won',
      collectedFragment,
    };
  }

  return {
    state: {
      ...state,
      notice: collectedFragment ? 'fragment' : 'exploring',
      player: target,
      steps: nextSteps,
      foundFragmentIds: nextFoundFragmentIds,
      exitUnlocked,
    },
    outcome: 'moved',
    collectedFragment,
  };
}
