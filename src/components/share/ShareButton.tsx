'use client';

import { useState, type ComponentProps } from 'react';
import { Check, Share } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

type ButtonVariant = ComponentProps<typeof Button>['variant'];

interface ShareButtonProps {
  /** Relative or absolute URL to copy. Relative paths resolve against the current origin. */
  path: string;
  /** Visible button label (already translated). */
  label: string;
  /** Toast text shown after a successful copy (already translated). */
  copiedMessage: string;
  variant?: ButtonVariant;
  className?: string;
}

/**
 * Copies a share URL to the clipboard and confirms with a toast. Used on the
 * Team Builder and the TCG card modal. Kept deliberately small and stateless so
 * the caller owns the URL it wants to share.
 */
export function ShareButton({
  path,
  label,
  copiedMessage,
  variant = 'outline',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const url = /^https?:\/\//.test(path)
      ? path
      : new URL(path, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(copiedMessage);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can reject outside secure contexts; surface the URL anyway.
      window.prompt(copiedMessage, url);
    }
  };

  return (
    <Button type="button" variant={variant} onClick={handleClick} className={className}>
      {copied ? <Check className="h-4 w-4" /> : <Share className="h-4 w-4" />}
      {label}
    </Button>
  );
}
