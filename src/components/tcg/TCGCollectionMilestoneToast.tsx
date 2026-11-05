'use client';

import { MascotGif } from '@/components/ui/MascotGif';
import { toast } from '@/lib/toast';

export type TCGCollectionMilestone = 'started' | 'completed';

interface TCGCollectionMilestoneToastOptions {
  milestone: TCGCollectionMilestone | null;
  cardAddedMessage: string;
  collectionCompleteMessage: string;
}

export function showTCGCollectionMilestoneToast({
  milestone,
  cardAddedMessage,
  collectionCompleteMessage,
}: TCGCollectionMilestoneToastOptions): void {
  if (!milestone) {
    toast.success(cardAddedMessage);
    return;
  }

  const mascot = milestone === 'started' ? 'ghost-sparkle-jump' : 'cloud-monster-thumbs-up';

  toast.success(
    <div className="flex items-center gap-3">
      <MascotGif
        mascot={mascot}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 object-contain"
      />
      <div className="min-w-0">
        <p className="font-bold">{cardAddedMessage}</p>
        {milestone === 'completed' ? (
          <p className="mt-0.5 text-sm text-foreground/70">{collectionCompleteMessage}</p>
        ) : null}
      </div>
    </div>,
  );
}
