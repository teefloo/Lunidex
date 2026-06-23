'use client';

import { useState, useRef, useEffect, type ComponentProps } from 'react';
import { Share, Link2, Twitter, MessageSquare, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

type ButtonVariant = ComponentProps<typeof Button>['variant'];

export interface ShareButtonProps {
  /** Absolute or relative URL to share. Relative paths resolve against the current origin. */
  url: string;
  /** Share / tweet title text. */
  title: string;
  /** Optional description for Web Share API. */
  description?: string;
  /** Optional OG image URL (passed to Web Share API when supported). */
  imageUrl?: string;
  /** Button label. Falls back to "Share" when omitted. */
  label?: string;
  variant?: ButtonVariant;
  className?: string;
  /** @deprecated Use `url` instead. Legacy prop kept for backward-compat with team page. */
  path?: string;
  /** @deprecated Use `title` instead. Legacy prop kept for backward-compat. */
  copiedMessage?: string;
}

/**
 * Unified share button.
 *
 * - Uses `navigator.share` (Web Share API) when the browser supports it
 *   (mobile / PWA contexts).
 * - Falls back to a small dropdown with three options:
 *   1. Copy link (Clipboard API)
 *   2. Share on Twitter/X
 *   3. Copy Discord-formatted link `[title](url)`
 */
export function ShareButton({
  url,
  title,
  description,
  label,
  variant = 'outline',
  className,
  // legacy compat
  path,
  copiedMessage,
}: ShareButtonProps) {
  const resolvedUrl = url || path || '';
  const resolvedLabel = label ?? copiedMessage ?? 'Share';

  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /** Resolve relative URL against current origin. */
  function buildAbsoluteUrl(raw: string): string {
    if (/^https?:\/\//.test(raw)) return raw;
    if (typeof window === 'undefined') return raw;
    return new URL(raw, window.location.origin).toString();
  }

  async function handleClick() {
    const absoluteUrl = buildAbsoluteUrl(resolvedUrl);

    // Native share sheet (mobile / PWA)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: absoluteUrl,
        });
      } catch {
        // User cancelled — treat as a no-op
      }
      return;
    }

    // Desktop fallback: toggle dropdown
    setOpen((prev) => !prev);
  }

  async function handleCopyLink() {
    const absoluteUrl = buildAbsoluteUrl(resolvedUrl);
    setOpen(false);
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success('Link copied!');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', absoluteUrl);
    }
  }

  function handleTwitter() {
    const absoluteUrl = buildAbsoluteUrl(resolvedUrl);
    setOpen(false);
    const text = description ? `${title} — ${description}` : title;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(absoluteUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }

  async function handleDiscord() {
    const absoluteUrl = buildAbsoluteUrl(resolvedUrl);
    setOpen(false);
    const formatted = `[${title}](${absoluteUrl})`;
    try {
      await navigator.clipboard.writeText(formatted);
      toast.success('Discord link copied!');
    } catch {
      window.prompt('Copy this Discord link:', formatted);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant={variant}
        onClick={handleClick}
        className={className}
        aria-haspopup={
          typeof navigator !== 'undefined' && !navigator.share ? 'listbox' : undefined
        }
        aria-expanded={open || undefined}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share className="h-4 w-4" />}
        {resolvedLabel}
        {/* Dropdown indicator only when Web Share is unavailable — rendered
            server-side as hidden to avoid hydration mismatch, then shown via
            the open state after mount. */}
        <ChevronDown
          className="h-3 w-3 opacity-50 ml-0.5"
          aria-hidden="true"
        />
      </Button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1 z-50 min-w-[180px] rounded-sm border border-border/60 bg-popover shadow-lg overflow-hidden"
        >
          <button
            role="option"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors text-left"
          >
            <Link2 className="h-4 w-4 text-foreground/60" />
            Copy link
          </button>
          <button
            role="option"
            onClick={handleTwitter}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors text-left text-[#1DA1F2]"
          >
            <Twitter className="h-4 w-4" />
            Share on X / Twitter
          </button>
          <button
            role="option"
            onClick={handleDiscord}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors text-left text-indigo-400"
          >
            <MessageSquare className="h-4 w-4" />
            Copy for Discord
          </button>
        </div>
      )}
    </div>
  );
}
