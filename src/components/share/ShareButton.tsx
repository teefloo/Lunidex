'use client';

import { useState, useRef, useEffect, type ComponentProps } from 'react';
import { Share, Link2, Check, ChevronDown } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';

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
  /** Render only the share icon while keeping the label available to assistive tech. */
  iconOnly?: boolean;
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
 * - Falls back to a small dropdown with a single copy-link action.
 */
export function ShareButton({
  url,
  title,
  description,
  label,
  iconOnly = false,
  variant = 'outline',
  className,
  // legacy compat
  path,
  copiedMessage,
}: ShareButtonProps) {
  const { t } = useTranslation();
  const resolvedUrl = url || path || '';
  const resolvedLabel = label ?? copiedMessage ?? t('share_menu.label', { defaultValue: 'Share' });

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
      toast.success(t('share_menu.toast_copied', { defaultValue: 'Link copied!' }));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('share_menu.prompt_copy', { defaultValue: 'Copy this link:' }), absoluteUrl);
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
        aria-label={iconOnly ? resolvedLabel : undefined}
        title={iconOnly ? resolvedLabel : undefined}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share className="h-4 w-4" />}
        {!iconOnly && resolvedLabel}
        {/* Dropdown indicator only when Web Share is unavailable — rendered
            server-side as hidden to avoid hydration mismatch, then shown via
            the open state after mount. */}
        {!iconOnly && (
          <ChevronDown
            className="h-3 w-3 opacity-50 ml-0.5"
            aria-hidden="true"
          />
        )}
      </Button>

      {open && (
        <div
          role="menu"
          aria-label={resolvedLabel}
          className="absolute right-0 mt-1 z-50 min-w-[180px] rounded-sm border border-border/60 bg-popover shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors text-left"
          >
            <Link2 className="h-4 w-4 text-foreground/60" />
            {t('share_menu.copy_link', { defaultValue: 'Copy link' })}
          </button>
        </div>
      )}
    </div>
  );
}
