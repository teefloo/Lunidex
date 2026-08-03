'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { TYPE_COLORS } from '@/types/pokemon';
import type { PokemonDetail } from '@/types/pokemon';

interface TeamExportButtonProps {
  pokemonData: PokemonDetail[];
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 460;
const SLOT_COUNT = 6;
const SLOT_WIDTH = CANVAS_WIDTH / SLOT_COUNT; // 200px per slot
const SPRITE_SIZE = 150;
const SPRITE_Y = 60;
const BG_COLOR = '#0f0f23';
const BG_ACCENT = '#1a1a3e';
const CARD_BG = '#1e1e3a';
const CARD_BORDER = '#2e2e5a';
const TEXT_PRIMARY = '#ffffff';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TYPE_BADGE_HEIGHT = 20;
const TYPE_BADGE_RADIUS = 10;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function buildTeamCanvas(
  pokemonData: PokemonDetail[],
  t: (key: string) => string,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  bgGradient.addColorStop(0, BG_ACCENT);
  bgGradient.addColorStop(0.5, BG_COLOR);
  bgGradient.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Title bar
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 44);

  // Title text
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Lunidex — ' + t('team.title'), 20, 28);

  // Load all sprites in parallel
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => pokemonData[i] ?? null);
  const sprites = await Promise.all(
    slots.map((p) => {
      if (!p) return Promise.resolve(null);
      const url =
        p.sprites.other?.['official-artwork']?.front_default ||
        p.sprites.front_default ||
        '';
      return url ? loadImage(url) : Promise.resolve(null);
    }),
  );

  // Draw each slot
  for (let i = 0; i < SLOT_COUNT; i++) {
    const pokemon = slots[i];
    const sprite = sprites[i];
    const x = i * SLOT_WIDTH;
    const cardX = x + 8;
    const cardW = SLOT_WIDTH - 16;
    const cardH = CANVAS_HEIGHT - 60;
    const cardY = 52;

    // Card background
    ctx.fillStyle = CARD_BG;
    roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fill();

    // Card border
    ctx.strokeStyle = CARD_BORDER;
    ctx.lineWidth = 1.5;
    roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.stroke();

    if (pokemon && sprite) {
      // Subtle glow behind sprite
      const glowGrad = ctx.createRadialGradient(
        x + SLOT_WIDTH / 2,
        cardY + SPRITE_Y + SPRITE_SIZE / 2,
        10,
        x + SLOT_WIDTH / 2,
        cardY + SPRITE_Y + SPRITE_SIZE / 2,
        SPRITE_SIZE / 1.5,
      );
      glowGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
      glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glowGrad;
      roundRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.fill();

      // Sprite
      const spriteX = x + (SLOT_WIDTH - SPRITE_SIZE) / 2;
      const spriteY = cardY + SPRITE_Y;
      ctx.drawImage(sprite, spriteX, spriteY, SPRITE_SIZE, SPRITE_SIZE);

      // Pokémon name
      const nameY = cardY + SPRITE_Y + SPRITE_SIZE + 22;
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
      ctx.fillText(displayName, x + SLOT_WIDTH / 2, nameY);

      // Type badges
      const types = pokemon.types.map((ty) => ty.type.name);
      const badgeW = 56;
      const totalBadgesW = types.length * badgeW + (types.length - 1) * 6;
      let badgeStartX = x + (SLOT_WIDTH - totalBadgesW) / 2;
      const badgeY = nameY + 14;

      for (const typeName of types) {
        const color = TYPE_COLORS[typeName] ?? '#A8A77A';
        // Badge background
        ctx.fillStyle = color;
        roundRect(ctx, badgeStartX, badgeY, badgeW, TYPE_BADGE_HEIGHT, TYPE_BADGE_RADIUS);
        ctx.fill();

        // Badge text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        const label = typeName.toUpperCase();
        ctx.fillText(label, badgeStartX + badgeW / 2, badgeY + TYPE_BADGE_HEIGHT / 2 + 4);

        badgeStartX += badgeW + 6;
      }

      // Pokédex number
      ctx.fillStyle = TEXT_DIM;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${String(pokemon.id).padStart(4, '0')}`, x + SLOT_WIDTH / 2, cardY + 20);
    } else {
      // Empty slot placeholder
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(x + SLOT_WIDTH / 2, cardY + SPRITE_Y + SPRITE_SIZE / 2, 38, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(x + SLOT_WIDTH / 2, cardY + SPRITE_Y + SPRITE_SIZE / 2, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', x + SLOT_WIDTH / 2, cardY + SPRITE_Y + SPRITE_SIZE / 2 + 10);
    }
  }

  // Footer watermark
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('primedex.vercel.app', CANVAS_WIDTH - 16, CANVAS_HEIGHT - 10);

  return canvas;
}

export function TeamExportButton({ pokemonData }: TeamExportButtonProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || pokemonData.length === 0) return;
    setIsExporting(true);
    try {
      const canvas = await buildTeamCanvas(pokemonData, t);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'my-team-primedex.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        'image/png',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting || pokemonData.length === 0}
      title={t('team.export_tooltip')}
      className="rounded-full text-[11px] sm:text-[11px] font-black uppercase border-primary/20 text-primary hover:bg-primary/10"
    >
      {isExporting ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : (
        <Download className="w-2.5 h-2.5" />
      )}
      {isExporting ? t('team.exporting') : t('team.export_image')}
    </Button>
  );
}
