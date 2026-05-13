"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleDot,
  Lock,
  LockOpen,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import {
  advanceMazeGame,
  createMazeRound,
  MAZE_FRAGMENT_SYMBOLS,
  MAZE_CANVAS_HEIGHT,
  MAZE_CANVAS_WIDTH,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_TILE_SIZE,
  MAZE_PIXEL_HEIGHT,
  MAZE_PIXEL_WIDTH,
  type MazeCoord,
  type MazeDirection,
  type MazeGameState,
  type MazeLayout,
  type MazeNotice,
} from '@/components/layout/not-found-maze';

type MotionState = {
  from: MazeCoord;
  to: MazeCoord;
  startedAt: number;
  durationMs: number;
};

type HudState = Pick<MazeGameState, 'status' | 'notice' | 'steps' | 'bestSteps' | 'exitUnlocked' | 'foundFragmentIds'> & {
  shakeFor: number;
};

const FRAGMENT_TOTAL = MAZE_FRAGMENT_SYMBOLS.length;
const MOVE_DURATION_MS = 150;
const HOLD_REPEAT_DELAY_MS = 150;
const HOLD_REPEAT_INTERVAL_MS = 120;
const BOARD_SHAKE_SECONDS = 0.18;
const REDIRECT_DELAY_MS = 600;

const KEY_TO_DIRECTION: Partial<Record<string, MazeDirection>> = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
};

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function shouldIgnoreKeyboardEvent(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

function cellToPixel(coord: MazeCoord) {
  return {
    x: MAZE_OFFSET_X + coord.x * MAZE_TILE_SIZE,
    y: MAZE_OFFSET_Y + coord.y * MAZE_TILE_SIZE,
  };
}

function toHud(game: MazeGameState, shakeFor: number): HudState {
  return {
    status: game.status,
    notice: game.notice,
    steps: game.steps,
    bestSteps: game.bestSteps,
    exitUnlocked: game.exitUnlocked,
    foundFragmentIds: [...game.foundFragmentIds],
    shakeFor,
  };
}

function hudEquals(a: HudState, b: HudState) {
  return (
    a.status === b.status &&
    a.notice === b.notice &&
    a.steps === b.steps &&
    a.bestSteps === b.bestSteps &&
    a.exitUnlocked === b.exitUnlocked &&
    a.foundFragmentIds.join(',') === b.foundFragmentIds.join(',') &&
    (a.shakeFor > 0) === (b.shakeFor > 0)
  );
}

function activeDirectionFromKeys(keys: readonly string[]) {
  const activeKey = keys.at(-1);
  return activeKey ? KEY_TO_DIRECTION[activeKey] ?? null : null;
}

function getPlayerScreenPosition(game: MazeGameState, motion: MotionState | null, time: number) {
  if (!motion) {
    const settled = cellToPixel(game.player);
    return {
      x: settled.x + MAZE_TILE_SIZE / 2,
      y: settled.y + MAZE_TILE_SIZE / 2,
    };
  }

  const progress = Math.min((time - motion.startedAt) / motion.durationMs, 1);
  const eased = easeOutCubic(progress);
  const from = cellToPixel(motion.from);
  const to = cellToPixel(motion.to);

  return {
    x: lerp(from.x, to.x, eased) + MAZE_TILE_SIZE / 2,
    y: lerp(from.y, to.y, eased) + MAZE_TILE_SIZE / 2,
  };
}

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, MAZE_CANVAS_HEIGHT);
  sky.addColorStop(0, '#1d4ed8');
  sky.addColorStop(0.4, '#0f766e');
  sky.addColorStop(1, '#14532d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, MAZE_CANVAS_WIDTH, MAZE_CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(92, 70, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(MAZE_OFFSET_X - 4, MAZE_OFFSET_Y - 4, MAZE_PIXEL_WIDTH + 8, MAZE_PIXEL_HEIGHT + 8);

  ctx.fillStyle = 'rgba(12, 74, 110, 0.38)';
  ctx.fillRect(0, MAZE_OFFSET_Y + MAZE_PIXEL_HEIGHT - 20, MAZE_CANVAS_WIDTH, 36);
}

function drawPathTile(ctx: CanvasRenderingContext2D, x: number, y: number, isStart: boolean) {
  ctx.fillStyle = isStart ? '#d9f99d' : '#bbf7d0';
  ctx.fillRect(x, y, MAZE_TILE_SIZE, MAZE_TILE_SIZE);

  ctx.fillStyle = 'rgba(22, 101, 52, 0.16)';
  ctx.fillRect(x, y + MAZE_TILE_SIZE - 7, MAZE_TILE_SIZE, 7);

  ctx.fillStyle = 'rgba(15, 118, 110, 0.22)';
  ctx.fillRect(x + 4, y + 6, 4, 4);
  ctx.fillRect(x + 18, y + 18, 3, 3);
  ctx.fillRect(x + 24, y + 9, 2, 2);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.strokeRect(x + 0.5, y + 0.5, MAZE_TILE_SIZE - 1, MAZE_TILE_SIZE - 1);
}

function drawWallTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#14532d';
  ctx.fillRect(x, y, MAZE_TILE_SIZE, MAZE_TILE_SIZE);

  ctx.fillStyle = '#166534';
  ctx.fillRect(x + 2, y + 2, MAZE_TILE_SIZE - 4, MAZE_TILE_SIZE - 4);

  ctx.fillStyle = 'rgba(187, 247, 208, 0.16)';
  ctx.fillRect(x + 3, y + 3, MAZE_TILE_SIZE - 6, 4);

  ctx.fillStyle = 'rgba(20, 83, 45, 0.48)';
  ctx.fillRect(x + 4, y + 12, MAZE_TILE_SIZE - 8, 4);
  ctx.fillRect(x + 4, y + 22, MAZE_TILE_SIZE - 8, 4);
}

function drawPortal(ctx: CanvasRenderingContext2D, coord: MazeCoord, unlocked: boolean, time: number) {
  const { x, y } = cellToPixel(coord);
  const pulse = 1 + Math.sin(time / 220) * 0.04;

  ctx.save();
  ctx.translate(x + MAZE_TILE_SIZE / 2, y + MAZE_TILE_SIZE / 2);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = unlocked ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.3)';
  ctx.fillRect(-12, -14, 24, 28);

  ctx.strokeStyle = unlocked ? '#7dd3fc' : '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(-11, -13, 22, 26);

  if (unlocked) {
    ctx.fillStyle = 'rgba(191, 219, 254, 0.75)';
    ctx.fillRect(-7, -9, 14, 18);
  } else {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -3, 5, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-5, -2, 10, 10);
  }

  ctx.restore();
}

function drawFragment(ctx: CanvasRenderingContext2D, symbol: '0' | '4', coord: MazeCoord, time: number) {
  const { x, y } = cellToPixel(coord);
  const glow = 0.65 + (Math.sin(time / 160 + coord.x + coord.y) + 1) * 0.14;

  ctx.save();
  ctx.translate(x + MAZE_TILE_SIZE / 2, y + MAZE_TILE_SIZE / 2);

  ctx.fillStyle = `rgba(251, 191, 36, ${glow})`;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#92400e';
  ctx.font = '900 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, 0, 1);

  ctx.restore();
}

function drawTrainer(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const bob = Math.sin(time / 130) * 1.2;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(-7, -2, 14, 12);

  ctx.fillStyle = '#f87171';
  ctx.fillRect(-8, -8, 16, 6);

  ctx.fillStyle = '#111827';
  ctx.fillRect(-8, -3, 16, 2);

  ctx.fillStyle = '#fde68a';
  ctx.fillRect(-5, -2, 10, 8);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-5, 10, 4, 5);
  ctx.fillRect(1, 10, 4, 5);

  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: MazeLayout,
  game: MazeGameState,
  motion: MotionState | null,
  time: number
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MAZE_CANVAS_WIDTH, MAZE_CANVAS_HEIGHT);

  drawBackdrop(ctx);

  const foundFragmentIds = new Set(game.foundFragmentIds);

  for (let rowIndex = 0; rowIndex < layout.height; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < layout.width; columnIndex += 1) {
      const tile = layout.rows[rowIndex][columnIndex];
      const x = MAZE_OFFSET_X + columnIndex * MAZE_TILE_SIZE;
      const y = MAZE_OFFSET_Y + rowIndex * MAZE_TILE_SIZE;

      if (tile === '#') {
        drawWallTile(ctx, x, y);
      } else {
        drawPathTile(ctx, x, y, tile === 'S');
      }
    }
  }

  drawPortal(ctx, layout.exit, game.exitUnlocked, time);

  for (const fragment of layout.fragments) {
    if (foundFragmentIds.has(fragment.id)) continue;
    drawFragment(ctx, fragment.symbol, fragment.position, time);
  }

  const playerPosition = getPlayerScreenPosition(game, motion, time);
  drawTrainer(ctx, playerPosition.x, playerPosition.y, time);

  ctx.restore();
}

function noticeText(t: ReturnType<typeof useTranslation>['t'], notice: MazeNotice, exitUnlocked: boolean) {
  switch (notice) {
    case 'fragment':
      return exitUnlocked
        ? t('common.not_found_maze_fragment_complete', {
            defaultValue: '404 restored. The portal is open.',
          })
        : t('common.not_found_maze_fragment', {
            defaultValue: 'Fragment recovered. Keep exploring the maze.',
          });
    case 'blocked':
      return t('common.not_found_maze_blocked', {
        defaultValue: 'That hedge blocks the route.',
      });
    case 'locked':
      return t('common.not_found_maze_locked', {
        defaultValue: 'The portal is sealed until you recover 4-0-4.',
      });
    case 'won':
      return t('common.not_found_maze_won', {
        defaultValue: 'Route cleared. Returning to PrimeDex...',
      });
    case 'exploring':
      return exitUnlocked
        ? t('common.not_found_maze_exit_open', {
            defaultValue: 'All fragments found. Head to the portal.',
          })
        : t('common.not_found_maze_exploring', {
            defaultValue: 'Find the three glowing fragments to rebuild 4-0-4.',
          });
  }
}

export default function NotFoundMiniGame() {
  const { t } = useTranslation();
  const router = useRouter();
  const [initialRound] = useState(() => createMazeRound(null, 'playing'));
  const [layout, setLayout] = useState<MazeLayout>(() => initialRound.layout);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<MazeLayout>(initialRound.layout);
  const gameRef = useRef<MazeGameState>(initialRound.game);
  const motionRef = useRef<MotionState | null>(null);
  const keyOrderRef = useRef<string[]>([]);
  const padDirectionRef = useRef<MazeDirection | null>(null);
  const shakeForRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const lastHudAtRef = useRef(0);
  const repeatAtRef = useRef(0);

  const [hud, setHud] = useState<HudState>(() => toHud(initialRound.game, 0));

  const publishHud = useCallback((force = false) => {
    const now = performance.now();

    if (!force && now - lastHudAtRef.current < 45) {
      return;
    }

    lastHudAtRef.current = now;

    const nextHud = toHud(gameRef.current, shakeForRef.current);
    setHud((current) => (hudEquals(current, nextHud) ? current : nextHud));
  }, []);

  const resetInputs = useCallback(() => {
    keyOrderRef.current = [];
    padDirectionRef.current = null;
    repeatAtRef.current = 0;
  }, []);

  const restartGame = useCallback(() => {
    const bestSteps = gameRef.current.bestSteps;
    const nextRound = createMazeRound(bestSteps, 'playing');

    layoutRef.current = nextRound.layout;
    setLayout(nextRound.layout);
    gameRef.current = nextRound.game;
    motionRef.current = null;
    shakeForRef.current = 0;
    resetInputs();
    lastFrameAtRef.current = performance.now();
    publishHud(true);
  }, [publishHud, resetInputs]);

  const attemptMove = useCallback((direction: MazeDirection, now: number, isFreshPress = false) => {
    if (motionRef.current) return;

    if (gameRef.current.status !== 'playing') return;

    const previousPlayer = gameRef.current.player;
    const result = advanceMazeGame(gameRef.current, direction, layoutRef.current);

    gameRef.current = result.state;
    repeatAtRef.current = now + (isFreshPress ? HOLD_REPEAT_DELAY_MS : HOLD_REPEAT_INTERVAL_MS);

    if (result.outcome === 'moved' || result.outcome === 'won') {
      motionRef.current = {
        from: previousPlayer,
        to: result.state.player,
        startedAt: now,
        durationMs: MOVE_DURATION_MS,
      };
    } else {
      shakeForRef.current = BOARD_SHAKE_SECONDS;
    }

    publishHud(true);
  }, [publishHud]);

  useEffect(() => {
    const tick = (time: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      const previousTime = lastFrameAtRef.current ?? time;
      const dt = Math.min(Math.max((time - previousTime) / 1000, 0), 0.04);

      lastFrameAtRef.current = time;
      shakeForRef.current = Math.max(0, shakeForRef.current - dt);

      if (motionRef.current && time - motionRef.current.startedAt >= motionRef.current.durationMs) {
        motionRef.current = null;
      }

      const activeDirection = padDirectionRef.current ?? activeDirectionFromKeys(keyOrderRef.current);

      if (!motionRef.current && activeDirection && time >= repeatAtRef.current) {
        attemptMove(activeDirection, time, false);
      }

      if (context) {
        drawScene(context, layoutRef.current, gameRef.current, motionRef.current, time);
      }

      if (motionRef.current || shakeForRef.current > 0) {
        publishHud();
      }

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [attemptMove, publishHud]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(event.target)) return;

      const key = event.key.toLowerCase();
      const direction = KEY_TO_DIRECTION[key];
      const isRestartKey = key === 'r';

      if (!direction && !isRestartKey) {
        return;
      }

      event.preventDefault();

      if (isRestartKey) {
        restartGame();
        return;
      }

      if (!direction) return;

      if (!keyOrderRef.current.includes(key)) {
        keyOrderRef.current = [...keyOrderRef.current, key];
      }

      attemptMove(direction, performance.now(), true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keyOrderRef.current = keyOrderRef.current.filter((pressedKey) => pressedKey !== key);
    };

    const clearInputs = () => {
      resetInputs();
      publishHud(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
    };
  }, [attemptMove, publishHud, resetInputs, restartGame]);

  useEffect(() => {
    if (hud.status !== 'won') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        router.push('/');
      });
    }, REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hud.status, router]);

  const holdDirection = useCallback((direction: MazeDirection) => {
    padDirectionRef.current = direction;
    attemptMove(direction, performance.now(), true);
  }, [attemptMove]);

  const releaseDirection = useCallback(() => {
    padDirectionRef.current = null;
  }, []);

  const collectedCount = hud.foundFragmentIds.length;
  const progressPercent = `${Math.round((collectedCount / FRAGMENT_TOTAL) * 100)}%`;
  const message = noticeText(t, hud.notice, hud.exitUnlocked);
  const statusLabel = hud.status === 'won'
    ? t('common.not_found_maze_clear', { defaultValue: 'Cleared' })
    : t('common.not_found_maze_live', { defaultValue: 'Exploring' });
  const exitLabel = hud.exitUnlocked
    ? t('common.not_found_maze_exit_open_label', { defaultValue: 'Open' })
    : t('common.not_found_maze_exit_locked_label', { defaultValue: 'Locked' });
  const bestValue = hud.bestSteps === null ? '--' : hud.bestSteps;
  const foundCounts = layout.fragments.reduce<Record<'0' | '4', number>>((counts, fragment) => {
    if (hud.foundFragmentIds.includes(fragment.id)) {
      counts[fragment.symbol] += 1;
    }

    return counts;
  }, { '0': 0, '4': 0 });
  const shownCounts: Record<'0' | '4', number> = { '0': 0, '4': 0 };
  const fragmentSlots = MAZE_FRAGMENT_SYMBOLS.map((symbol, index) => {
    shownCounts[symbol] += 1;

    return {
      id: `slot-${symbol}-${index}`,
      symbol,
      found: shownCounts[symbol] <= foundCounts[symbol],
    };
  });
  const boardStyle = { '--route-progress': progressPercent } as CSSProperties;

  const moveButtons = [
    { label: t('common.up', { defaultValue: 'Up' }), direction: 'up' as const, icon: ArrowUp, className: 'col-start-2 row-start-1' },
    { label: t('common.left', { defaultValue: 'Left' }), direction: 'left' as const, icon: ArrowLeft, className: 'col-start-1 row-start-2' },
    { label: t('common.down', { defaultValue: 'Down' }), direction: 'down' as const, icon: ArrowDown, className: 'col-start-2 row-start-2' },
    { label: t('common.right', { defaultValue: 'Right' }), direction: 'right' as const, icon: ArrowRight, className: 'col-start-3 row-start-2' },
  ];

  return (
    <section className="section-frame flex min-h-[24rem] flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:min-h-[34rem]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="page-eyebrow">Route 404</p>
          <h2 className="page-title text-3xl md:text-4xl">
            {t('common.not_found_game_title', { defaultValue: 'The Lost Link Maze' })}
          </h2>
          <p className="page-subtitle max-w-xl text-sm md:text-base">
            {t('common.not_found_game_desc', {
              defaultValue: 'Recover the 4-0-4 fragments, unlock the portal, and find the way back to PrimeDex.',
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:min-w-[19rem]">
          <Metric icon={CircleDot} label={t('common.not_found_fragments', { defaultValue: 'Fragments' })} value={`${collectedCount}/${FRAGMENT_TOTAL}`} />
          <Metric icon={ArrowRight} label={t('common.not_found_steps', { defaultValue: 'Steps' })} value={hud.steps} />
          <Metric icon={Trophy} label={t('common.not_found_best', { defaultValue: 'Best' })} value={bestValue} />
          <Metric icon={hud.exitUnlocked ? LockOpen : Lock} label={t('common.not_found_exit', { defaultValue: 'Exit' })} value={exitLabel} />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div
          className={cn(
            'not-found-game-board relative aspect-[16/11] overflow-hidden rounded-2xl border border-border/60 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.95)]',
            hud.shakeFor > 0 && 'not-found-game-board--hit'
          )}
          data-maze-rows={layout.rows.join('|')}
          style={boardStyle}
        >
          <canvas
            ref={canvasRef}
            width={MAZE_CANVAS_WIDTH}
            height={MAZE_CANVAS_HEIGHT}
            className="not-found-game-canvas"
            aria-label={t('common.not_found_canvas_label', {
              defaultValue: 'Route 404 maze board',
            })}
            onPointerDown={() => {
              if (gameRef.current.status !== 'playing') {
                restartGame();
              }
            }}
          />

          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/75 backdrop-blur">
            {statusLabel}
          </div>

          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/75 backdrop-blur">
            {exitLabel}
          </div>

          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
            <div className="mb-2 rounded-full border border-white/10 bg-slate-950/65 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/75 backdrop-blur">
              {message}
            </div>
            <div className="h-2 rounded-full bg-black/35">
              <div className="not-found-game-progress h-full rounded-full bg-[linear-gradient(90deg,#34d399,#facc15,#fb923c)] transition-[width] duration-300" />
            </div>
          </div>

          {hud.status === 'won' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/54 px-5 text-center backdrop-blur-[2px]">
              <div className="max-w-sm rounded-2xl border border-white/12 bg-slate-950/76 p-5 text-white shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
                  {statusLabel}
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  {t('common.not_found_overlay_win_title', { defaultValue: 'Portal unlocked' })}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{message}</p>
                <p className="mt-3 text-sm font-bold text-white">
                  {t('common.not_found_overlay_score', {
                    defaultValue: 'Steps {{steps}} · Best {{best}}',
                    steps: hud.steps,
                    best: bestValue,
                  })}
                </p>
                <Button
                  type="button"
                  className="mt-5 w-full font-black uppercase tracking-[0.16em]"
                  onClick={restartGame}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('common.not_found_restart', { defaultValue: 'Restart' })}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="glass-card rounded-2xl p-3 md:min-h-28">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-foreground/40">
              {t('common.not_found_goal', { defaultValue: 'Goal' })}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/65">
              {t('common.not_found_goal_desc', {
                defaultValue: 'Collect the three glowing 4-0-4 fragments, then step through the portal.',
              })}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-3 md:min-h-28">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-foreground/40">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{t('common.not_found_controls', { defaultValue: 'Controls' })}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground/65">
              {t('common.not_found_controls_desc', {
                defaultValue: 'Use arrows, WASD, or hold the pad to move tile by tile. Press R to reset.',
              })}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-3 md:min-h-28">
            <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-foreground/40">
              <span>{t('common.not_found_progress', { defaultValue: 'Sequence' })}</span>
              <span>{collectedCount}/{FRAGMENT_TOTAL}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {fragmentSlots.map((fragment) => (
                <span
                  key={fragment.id}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black',
                    fragment.found
                      ? 'border-primary/50 bg-primary/15 text-foreground'
                      : 'border-border/60 bg-background/60 text-foreground/35'
                  )}
                >
                  {fragment.symbol}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-foreground/50">
              {hud.exitUnlocked
                ? t('common.not_found_score_hint_open', {
                    defaultValue: 'The portal is active. Reach it in as few steps as you can.',
                  })
                : t('common.not_found_score_hint_locked', {
                    defaultValue: 'Hedges stop movement. The portal stays locked until the full 4-0-4 is restored.',
                  })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
          <div className="grid grid-cols-3 gap-2 sm:w-40">
            {moveButtons.map(({ label, direction, icon: Icon, className }) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="icon-sm"
                className={cn('rounded-2xl touch-none', className)}
                onPointerDown={() => holdDirection(direction)}
                onPointerUp={releaseDirection}
                onPointerCancel={releaseDirection}
                onPointerLeave={releaseDirection}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <Button
            type="button"
            className="w-full rounded-full font-black uppercase tracking-[0.18em]"
            onClick={restartGame}
          >
            <RotateCcw className="h-4 w-4" />
            {t('common.not_found_restart', { defaultValue: 'Restart' })}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDot;
  label: string;
  value: number | string;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-center">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">{label}</span>
      <span className="text-lg font-black tabular-nums">{value}</span>
    </div>
  );
}
