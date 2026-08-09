'use client';

import { Trophy, Flame, Share2, Download, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';
import { toast } from '@/lib/toast';

type QuizChallenge = 'classic' | 'silhouette' | 'stats';
type GameMode = 'time-attack' | 'survival' | 'marathon';

const CHALLENGE_COLORS: Record<QuizChallenge, string> = {
  classic: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  silhouette: 'from-amber-500/20 to-amber-600/5 border-amber-500/30',
  stats: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
};

const CHALLENGE_DOT: Record<QuizChallenge, string> = {
  classic: 'bg-blue-500',
  silhouette: 'bg-amber-500',
  stats: 'bg-emerald-500',
};

interface QuizResultCardProps {
  score: number;
  total: number;
  mode: GameMode;
  challenge: QuizChallenge;
  streak: number;
  badgesEarned: number;
}

export default function QuizResultCard({
  score,
  total,
  mode,
  challenge,
  streak,
  badgesEarned,
}: QuizResultCardProps) {
  const { t } = useTranslation();

  const ogUrl = `${SITE_URL}/api/og/quiz-result?score=${score}&total=${total}&mode=${mode}&challenge=${challenge}&streak=${streak}&badges=${badgesEarned}`;
  const shareText = t('quiz.share_text', { score, total, defaultValue: `I scored ${score}/${total} in Lunidex Quiz!` });
  const shareUrl = `${SITE_URL}/quiz?score=${score}&total=${total}&mode=${mode}&challenge=${challenge}&streak=${streak}&badges=${badgesEarned}`;

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleCopyImage = async () => {
    try {
      const response = await fetch(ogUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success(t('quiz.image_copied', { defaultValue: 'Image copied to clipboard!' }));
    } catch {
      const link = document.createElement('a');
      link.href = ogUrl;
      link.download = `primedex-quiz-${score}-${total}.png`;
      link.click();
      toast.success(t('quiz.image_downloaded', { defaultValue: 'Image downloaded!' }));
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('quiz.link_copied', { defaultValue: 'Link copied to clipboard!' }));
    } catch {
      toast.error(t('quiz.copy_failed', { defaultValue: 'Failed to copy link' }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div
        className={cn(
          'relative rounded-sm border bg-gradient-to-br p-6 overflow-hidden',
          CHALLENGE_COLORS[challenge]
        )}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="px-3 py-1 bg-primary text-primary-foreground border border-primary/50 font-pixel text-sm tracking-wider">
            Lunidex
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/50">
            {t('quiz.title')}
          </span>
        </div>

        {/* Score */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-pixel text-6xl md:text-7xl text-foreground drop-shadow-lg">
              {score}
            </span>
            <span className="font-pixel text-3xl text-foreground/40">/{total}</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/50 mt-2">
            {t('quiz.correct')}
          </p>
        </div>

        {/* Mode + Challenge badges */}
        <div className="flex justify-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 border border-border/50 rounded-sm">
            <div className={cn('w-3 h-3 border border-foreground/20', CHALLENGE_DOT[challenge])} />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              {t(`quiz.${challenge}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 border border-border/50 rounded-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              {t(`quiz.${mode}`)}
            </span>
          </div>
        </div>

        {/* Streak + Badges */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/50 mb-1">
              {t('quiz.streak')}
            </p>
            <div className="flex items-baseline gap-1">
              <Flame className={cn('w-5 h-5', streak > 0 ? 'text-amber-500' : 'text-foreground/20')} />
              <span className={cn('font-pixel text-3xl', streak > 0 ? 'text-amber-500' : 'text-foreground/30')}>
                {streak}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/50 mb-1">
              {t('quiz.achievements')}
            </p>
            <div className="flex items-baseline gap-1">
              <span className={cn('font-pixel text-3xl', badgesEarned > 0 ? 'text-primary' : 'text-foreground/30')}>
                {badgesEarned}
              </span>
              <Trophy className={cn('w-5 h-5', badgesEarned > 0 ? 'text-primary' : 'text-foreground/20')} />
            </div>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleShareTwitter}
          className="flex items-center justify-center gap-2 h-10 rounded-sm bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 text-[#1DA1F2] text-xs font-bold uppercase tracking-wider hover:bg-[#1DA1F2]/20 transition-colors"
        >
          <Twitter className="w-4 h-4" />
          <span className="hidden sm:inline">Twitter</span>
        </button>
        <button
          onClick={handleCopyImage}
          className="flex items-center justify-center gap-2 h-10 rounded-sm bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{t('quiz.copy_image', { defaultValue: 'Image' })}</span>
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 h-10 rounded-sm bg-foreground/5 border border-border/50 text-foreground/60 text-xs font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">{t('quiz.share_link', { defaultValue: 'Link' })}</span>
        </button>
      </div>
    </div>
  );
}
