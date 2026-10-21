import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { classifyRecoverableError } from '@/lib/error-feedback';

interface RecoverableErrorProps {
  title: string;
  description: string;
  retryLabel: string;
  retryingLabel?: string;
  retrying?: boolean;
  onRetry: () => void;
  className?: string;
  error?: unknown;
  compact?: boolean;
}

export function RecoverableError({
  title,
  description,
  retryLabel,
  retryingLabel,
  retrying = false,
  onRetry,
  className,
  error,
  compact = false,
}: RecoverableErrorProps) {
  const { t } = useTranslation();
  const category = error === undefined ? null : classifyRecoverableError(error);
  const resolvedDescription = category ? t(`common.error_${category}`) : description;
  return (
    <section
      role="alert"
      aria-busy={retrying}
      className={`glass-card flex flex-col items-center justify-center rounded-sm border border-destructive/30 border-dashed text-center ${compact ? 'gap-1 px-3 py-3' : 'px-6 py-12'} ${className ?? ''}`}
    >
      <h2 className={compact ? 'text-sm font-black text-foreground/90' : 'text-xl font-black text-foreground/90'}>{title}</h2>
      <p className={`${compact ? 'max-w-full text-xs' : 'mt-3 max-w-xl text-sm leading-6'} text-muted-foreground`}>{resolvedDescription}</p>
      <Button className={`${compact ? 'mt-2 min-h-11 px-3' : 'mt-6 min-h-11 px-5'}`} size={compact ? 'sm' : 'default'} onClick={onRetry} disabled={retrying} aria-busy={retrying}>
        <RefreshCw className={`h-4 w-4 ${retrying ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
        {retrying ? (retryingLabel ?? retryLabel) : retryLabel}
      </Button>
    </section>
  );
}
