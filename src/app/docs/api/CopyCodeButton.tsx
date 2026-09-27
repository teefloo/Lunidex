'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyCodeButtonProps = {
  code: string;
  copyLabel: string;
  copiedLabel: string;
  copyPrompt: string;
};

export function CopyCodeButton({ code, copyLabel, copiedLabel, copyPrompt }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(copyPrompt, code);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copyCode}
        aria-label={copied ? copiedLabel : copyLabel}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-white/15 px-2.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#07144f]"
      >
        {copied
          ? <Check aria-hidden="true" className="h-3.5 w-3.5" />
          : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
        <span>{copied ? copiedLabel : copyLabel}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? copiedLabel : ''}</span>
    </>
  );
}
