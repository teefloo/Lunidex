import { getTCGSetIdentifiers } from '@/lib/tcg-set-label';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { TCGImageWithFallback } from './TCGImageWithFallback';

interface TCGSetOptionLabelProps {
  setId: string;
  name: string;
  logo?: string;
  symbol?: string;
  language?: string;
}

export interface TCGSetOptionArtwork {
  candidates: string[];
  kind: 'logo' | 'symbol' | null;
}

export function getTCGSetOptionArtwork({
  setId,
  name,
  logo,
  symbol,
  language,
}: TCGSetOptionLabelProps): TCGSetOptionArtwork {
  const setImages = { id: setId, name, logo, symbol };
  const logoCandidates = getTCGSetImageCandidates(setImages, 'logo', { language });
  const symbolCandidates = getTCGSetImageCandidates(setImages, 'symbol', { language });

  if (logoCandidates.length > 0) {
    return { candidates: [...logoCandidates, ...symbolCandidates], kind: 'logo' };
  }

  return {
    candidates: symbolCandidates,
    kind: symbolCandidates.length > 0 ? 'symbol' : null,
  };
}

/** Shared, compact set identity shown in both the catalog trigger and its options. */
export function TCGSetOptionLabel({ setId, name, logo, symbol, language }: TCGSetOptionLabelProps) {
  const { extensionId, printedCode } = getTCGSetIdentifiers(setId);
  const artwork = getTCGSetOptionArtwork({ setId, name, logo, symbol, language });
  const artworkSlotSize = artwork.kind === 'logo' ? 'h-7 w-14' : 'h-7 w-7';

  return (
    <span className="flex w-full min-w-0 items-center gap-2.5">
      <span className="w-[4.5rem] shrink-0 font-mono text-[10px] font-semibold tracking-[0.06em] text-foreground/60">
        {extensionId}
      </span>
      {artwork.candidates.length > 0 ? (
        <span className={`relative ${artworkSlotSize} shrink-0 overflow-hidden rounded-sm border border-border/40 bg-muted/35`}>
          <TCGImageWithFallback
            candidates={artwork.candidates}
            alt=""
            aria-hidden="true"
            fill
            sizes={artwork.kind === 'logo' ? '56px' : '28px'}
            className="object-contain p-0.5"
          />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-5 text-foreground/90">
        {name}
      </span>
      {printedCode ? (
        <span className="shrink-0 rounded-[3px] border border-border/60 bg-muted/60 px-1.5 py-1 font-mono text-[10px] font-black uppercase leading-none tracking-[0.12em] text-foreground/80">
          {printedCode}
        </span>
      ) : null}
    </span>
  );
}
