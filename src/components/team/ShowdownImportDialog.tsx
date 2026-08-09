'use client';

import { useState } from 'react';
import { ClipboardPaste, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { getAllPokemonNames } from '@/lib/api/rest';
import { parseShowdownPaste, type ParsedShowdownSet } from '@/lib/showdown-parser';
import { toast } from '@/lib/toast';

interface MatchedSet {
  parsed: ParsedShowdownSet;
  pokemonId: number | null;
}

export function ShowdownImportDialog() {
  const { t } = useTranslation();
  const team = usePrimeDexStore((s) => s.team);
  const addToTeam = usePrimeDexStore((s) => s.addToTeam);
  const isInTeam = usePrimeDexStore((s) => s.isInTeam);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [matches, setMatches] = useState<MatchedSet[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;
    setIsParsing(true);
    try {
      const parsedSets = parseShowdownPaste(text);
      if (parsedSets.length === 0) {
        toast.error(t('team.import_no_sets', { defaultValue: 'No valid Pokémon sets found in the pasted text.' }));
        setMatches(null);
        return;
      }

      const allNames = await getAllPokemonNames();
      const nameIndex = new Map(allNames.map((p) => [p.name, p]));

      const resolved: MatchedSet[] = parsedSets.map((parsed) => {
        const entry = nameIndex.get(parsed.speciesSlug);
        let pokemonId: number | null = null;
        if (entry) {
          const urlParts = entry.url.split('/').filter(Boolean);
          pokemonId = parseInt(urlParts[urlParts.length - 1], 10) || null;
        }
        return { parsed, pokemonId };
      });

      setMatches(resolved);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddAll = () => {
    if (!matches) return;
    const remainingSlots = 6 - team.length;
    let added = 0;
    let skipped = 0;

    for (const { pokemonId } of matches) {
      if (added >= remainingSlots) {
        skipped++;
        continue;
      }
      if (!pokemonId || isInTeam(pokemonId)) {
        continue;
      }
      addToTeam(pokemonId);
      added++;
    }

    if (added > 0) {
      toast.success(t('team.import_added', { count: added, defaultValue: `Added ${added} Pokémon to your team.` }));
    }
    if (skipped > 0) {
      toast.warning(t('team.import_team_full', { defaultValue: 'Team is full — some Pokémon were not added.' }));
    }
    setOpen(false);
    setText('');
    setMatches(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="touch"
            className="rounded-full text-[11px] font-black uppercase border-primary/20 text-primary hover:bg-primary/10 sm:text-[11px]"
          >
            <ClipboardPaste className="h-2.5 w-2.5" />
            {t('team.import_showdown', { defaultValue: 'Import Showdown' })}
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('team.import_showdown', { defaultValue: 'Import Showdown' })}</DialogTitle>
          <DialogDescription>
            {t('team.import_showdown_desc', { defaultValue: 'Paste one or more Pokémon Showdown export sets below. Recognized species will be added to your team; item, ability, EVs, nature, and moves are shown for reference.' })}
          </DialogDescription>
        </DialogHeader>

        {!matches ? (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Landorus-Therian @ Choice Scarf\nAbility: Intimidate\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- U-turn\n- Stone Edge\n- Explosion'}
              rows={10}
              className="w-full rounded-sm border border-border/70 bg-muted/40 p-3 font-mono text-xs text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button onClick={handleParse} disabled={!text.trim() || isParsing}>
                {t('team.import_parse', { defaultValue: 'Parse' })}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {matches.map(({ parsed, pokemonId }, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-sm border border-border/60 bg-background/40 p-3"
                >
                  {pokemonId ? (
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-foreground/90">
                      {parsed.nickname ? `${parsed.nickname} (${parsed.species})` : parsed.species}
                      {!pokemonId && (
                        <span className="ml-2 text-[11px] font-bold uppercase text-yellow-500">
                          {t('team.import_unrecognized', { defaultValue: 'Species not recognized' })}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-foreground/50">
                      {[parsed.item, parsed.ability, parsed.nature && `${parsed.nature} Nature`].filter(Boolean).join(' · ')}
                    </p>
                    {parsed.moves.length > 0 && (
                      <p className="mt-1 text-[11px] text-foreground/40">{parsed.moves.join(' / ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMatches(null)}>
                <X className="w-3.5 h-3.5" />
                {t('team.import_back', { defaultValue: 'Back' })}
              </Button>
              <Button onClick={handleAddAll} disabled={matches.every((m) => !m.pokemonId)}>
                {t('team.import_add_to_team', { defaultValue: 'Add to Team' })}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
