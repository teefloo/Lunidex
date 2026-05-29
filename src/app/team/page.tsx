'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { usePrimeDexStore } from '@/store/primedex';
import { useQueries } from '@tanstack/react-query';
import { getPokemonDetail, getPokemonSpecies, getTypeRelations, getAllPokemonDetailed } from '@/lib/api';
import { TYPE_COLORS } from '@/types/pokemon';
import { TypeRelations } from '@/lib/api/rest';
import { 
  Users, 
  ShieldCheck, 
  Info,
  Sword,
  X,
  Plus,
  Zap,
  BarChart3,
  Loader2,
  Share,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useMemo, useEffect, useState, SVGProps } from 'react';
import { useTranslation } from '@/lib/i18n';
import { resolveLanguage } from '@/lib/languages';
import { toast } from 'sonner';
import { analyzeTeam, calculateSynergyScore } from '@/lib/team-analysis';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy charting library
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const RadarChart = dynamic(
  () => import('recharts').then(m => m.RadarChart),
  { ssr: false, loading: () => <div className="h-[250px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary/40" /></div> }
);
const PolarGrid = dynamic(() => import('recharts').then(m => m.PolarGrid), { ssr: false });
const PolarAngleAxis = dynamic(() => import('recharts').then(m => m.PolarAngleAxis), { ssr: false });
const Radar = dynamic(() => import('recharts').then(m => m.Radar), { ssr: false });
const RechartsTooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

import Image from 'next/image';

export default function TeamPage() {
  const { language, systemLanguage, team, addToTeam, removeFromTeam, clearTeam } = usePrimeDexStore();
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const { t } = useTranslation();

  const resolvedLang = resolveLanguage(language, systemLanguage);

  // Team sharing logic: Check for team code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const teamCode = urlParams.get('code');
    if (teamCode && team.length === 0) {
      const ids = teamCode.split('-').map(Number).filter(id => !isNaN(id));
      if (ids.length > 0) {
        ids.forEach(id => addToTeam(id));
        toast.success(t('team.toast_loaded'));
        // Clear URL param without reloading
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [addToTeam, team.length, t]);

  const pokemonQueries = useQueries({
    queries: team.map(id => ({
      queryKey: ['pokemon-team', id],
      queryFn: async () => {
        const [pokemon, species] = await Promise.all([
          getPokemonDetail(id.toString()),
          getPokemonSpecies(id.toString()).catch(() => null)
        ]);
        return { pokemon, species };
      },
      staleTime: 10 * 60 * 1000,
    }))
  });

  const pokemonData = pokemonQueries.map(q => q.data).filter((d): d is { pokemon: NonNullable<typeof d>['pokemon']; species: NonNullable<typeof d>['species'] } => !!d?.pokemon).map(d => d.pokemon);
  const teamData = pokemonQueries.map(q => q.data).filter((d): d is { pokemon: NonNullable<typeof d>['pokemon']; species: NonNullable<typeof d>['species'] } => !!d?.pokemon);

  // Type relations for the whole team
  const typeRelationsQueries = useQueries({
    queries: pokemonData.flatMap(p => 
      p.types.map(t => ({
        queryKey: ['typeRelations', t.type.name],
        queryFn: () => getTypeRelations(t.type.name),
        staleTime: 24 * 60 * 60 * 1000,
      }))
    )
  });

  const analysis = useMemo(() => {
    if (pokemonData.length === 0 || typeRelationsQueries.some(q => q.isLoading)) return null;

    const relationsMap: Record<string, TypeRelations> = {};
    const uniqueTypes = [...new Set(pokemonData.flatMap(p => p.types.map(t => t.type.name)))];
    
    typeRelationsQueries.forEach((q, i) => {
      if (q.data) {
        const typeName = uniqueTypes[i];
        if (typeName) relationsMap[typeName] = q.data;
      }
    });

    return analyzeTeam(pokemonData, relationsMap);
  }, [pokemonData, typeRelationsQueries]);

  const radarData = useMemo(() => {
    if (!analysis) return [];
    return [
      { subject: t('stats.hp'), A: analysis.stats.avgHp, fullMark: 255 },
      { subject: t('stats.attack'), A: analysis.stats.avgAtk, fullMark: 255 },
      { subject: t('stats.defense'), A: analysis.stats.avgDef, fullMark: 255 },
      { subject: t('stats.sp_attack'), A: analysis.stats.avgSpAtk, fullMark: 255 },
      { subject: t('stats.sp_defense'), A: analysis.stats.avgSpDef, fullMark: 255 },
      { subject: t('stats.speed'), A: analysis.stats.avgSpe, fullMark: 255 },
    ];
  }, [analysis, t]);

  const handleAutoComplete = async () => {
    if (!analysis || team.length >= 6) return;
    
    setIsAutoCompleting(true);
    try {
      const allPokemon = await getAllPokemonDetailed();
      const currentTeamIds = new Set(team);
      
      // Filter for pokemon that match suggested types and have good stats
      const candidates = allPokemon.filter(p => 
        !currentTeamIds.has(p.id) &&
        p.pokemon_v2_pokemontypes.some(t => analysis.suggestions.types.includes(t.pokemon_v2_type.name))
      ).sort((a, b) => {
        const totalA = a.pokemon_v2_pokemonstats.reduce((sum, s) => sum + s.base_stat, 0);
        const totalB = b.pokemon_v2_pokemonstats.reduce((sum, s) => sum + s.base_stat, 0);
        return totalB - totalA;
      });

      const toAdd = candidates.slice(0, 6 - team.length);
      if (toAdd.length > 0) {
        toAdd.forEach(p => addToTeam(p.id));
        toast.success(t('team.added_suggestions', { count: toAdd.length }));
      } else {
        toast.info(t('team.no_suggestions'));
      }
    } catch {
      toast.error(t('team.fetch_failed'));
    } finally {
      setIsAutoCompleting(false);
    }
  };

  const handleShareTeam = () => {
    if (team.length === 0) return;
    const teamCode = team.join('-');
    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${teamCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: t('team.share_title'),
        text: t('team.share_text'),
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('team.share_copied'));
    }
  };

  const synergyScore = useMemo(() => {
    if (!analysis || pokemonData.length === 0) return 0;
    return calculateSynergyScore(pokemonData, analysis);
  }, [analysis, pokemonData]);

  const scoreColor = synergyScore > 70 ? 'bg-green-500' : synergyScore > 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="app-page text-foreground pb-20 overflow-x-hidden">
      <Header />
      
      <main className="page-shell py-8 relative z-10">
        <PageHeader
          icon={Users}
          title={t('team.title')}
          subtitle={`${t('team.subtitle')} (${pokemonData.length}/6)`}
          eyebrow={t('team.eyebrow', { defaultValue: 'PrimeDex' })}
          className="mt-16 md:mt-20"
          badge={(
            <div className="flex flex-wrap items-center justify-end gap-3">
              {team.length > 0 && team.length < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoComplete}
                  disabled={isAutoCompleting}
                  className="rounded-full text-[10px] sm:text-[11px] font-black uppercase border-primary/20 text-primary hover:bg-primary/10"
                >
                  {isAutoCompleting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
                  {t('team.auto_complete')}
                </Button>
              )}
              {pokemonData.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleShareTeam}
                  className="rounded-full font-black uppercase tracking-widest gap-2 bg-secondary/30 border-border/60"
                >
                  <Share className="w-4 h-4" />
                  {t('detail.share')}
                </Button>
              )}
              {pokemonData.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={clearTeam}
                  className="rounded-full font-black uppercase tracking-widest gap-2"
                >
                  <Trash2CustomIcon className="w-4 h-4" />
                  {t('team.disband')}
                </Button>
              )}
            </div>
          )}
        />

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Team Slots */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => {
                const d = teamData[idx];
                const p = d?.pokemon;
                const s_data = d?.species;
                const displayName = s_data?.names?.find((n) => n.language.name === resolvedLang)?.name || p?.name;

                return (
                  <div key={idx} className="h-64">
                    {p ? (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-panel h-full p-4 rounded-2xl flex flex-col items-center relative group"
                      >
                        <button 
                          onClick={() => removeFromTeam(p.id)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-secondary/50 text-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all z-20"
                          aria-label={t('card.remove_team')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        <div className="relative w-28 h-28 mb-4">
                          <div className="absolute inset-x-5 bottom-3 top-10 rounded-2xl bg-gradient-to-t from-primary/10 to-transparent transition-opacity group-hover:opacity-80" />
                        <Image 
                          src={p.sprites.other['official-artwork'].front_default || p.sprites.front_default} 
                          alt={displayName || ''} 
                          width={112}
                          height={112}
                          sizes="112px"
                          className="w-full h-full object-contain relative z-10 drop-shadow-xl group-hover:scale-110 transition-transform"
                        />
                        </div>
                        
                        <h3 className="text-lg font-black capitalize mb-2">{displayName}</h3>
                        <div className="flex gap-1 justify-center">
                        {p.types.map((typeItem) => (
                          <span 
                            key={typeItem.type.name} 
                            className="px-2 py-0.5 rounded-lg border border-border/40 text-[10px] sm:text-[11px] font-black uppercase"
                            style={{ backgroundColor: `${TYPE_COLORS[typeItem.type.name]}cc`, color: 'white' }}
                          >
                            {t(`types.${typeItem.type.name}`)}
                          </span>
                        ))}
                        </div>
                        
                        <Link
                          href={`/pokemon/${p.name}`}
                          className="mt-auto inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/10 hover:text-primary h-8 text-[10px] font-black uppercase tracking-widest"
                        >
                          {t('team.details')}
                        </Link>
                      </motion.div>
                    ) : (
                      <Link href="/" className="block h-full">
                        <div className="h-full rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center text-foreground/20 hover:border-primary/30 hover:text-primary/40 hover:bg-primary/5 transition-all group">
                          <div className="p-4 rounded-full bg-secondary/30 mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="w-8 h-8" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest">{t('team.add')}</span>
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {pokemonData.length > 0 && analysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Synergy Score */}
                  <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col h-full">
                    <div className="flex items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl text-primary-foreground shadow-lg shadow-black/20", scoreColor)}>
                          <Zap className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{t('team.synergy')}</h3>
                          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{t('team.cohesion')}</p>
                        </div>
                      </div>
                      <div className="text-3xl font-black tracking-tighter">
                        <span className={cn("text-transparent bg-clip-text bg-gradient-to-br", 
                          synergyScore > 70 ? 'from-green-400 to-green-600' : synergyScore > 40 ? 'from-orange-400 to-orange-600' : 'from-red-400 to-red-600'
                        )}>
                          {synergyScore}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full h-3 bg-card/50 rounded-full overflow-hidden mb-8 border border-border/40">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${synergyScore}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn("h-full", scoreColor)}
                      />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <p className="text-xs text-foreground/60 leading-relaxed font-medium">
                          {synergyScore > 80 ? t('team.synergy_excellent') :
                          synergyScore > 60 ? t('team.synergy_good') :
                          synergyScore > 40 ? t('team.synergy_average') :
                          t('team.synergy_low')}
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 mb-3">{t('team.main_weaknesses')}</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.weaknesses.slice(0, 3).map(([type]) => (
                            <div 
                              key={type} 
                              className="px-3 py-1.5 rounded-xl border border-border/40 shadow-sm text-primary-foreground flex items-center gap-2"
                              style={{ backgroundColor: TYPE_COLORS[type] }}
                            >
                              <span className="text-[10px] font-black uppercase">{t(`types.${type}`)}</span>
                            </div>
                          ))}
                          {analysis.weaknesses.length === 0 && <p className="text-[10px] italic text-foreground/30">{t('team.no_major_weaknesses')}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Radar Chart */}
                  <div className="glass-panel p-6 md:p-8 rounded-2xl h-full flex flex-col">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      {t('team.stat_balance')}
                    </h3>
                    <div className="flex-1 min-h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} 
                          />
                          <Radar
                            name="Team"
                            dataKey="A"
                            stroke="#FF3E3E"
                            fill="#FF3E3E"
                            fillOpacity={0.5}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(0,0,0,0.8)', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 md:p-8 rounded-2xl">
                  <h3 className="text-2xl font-black mb-8 border-b border-border/60 pb-4 flex items-center gap-3">
                    <Sword className="w-6 h-6 text-primary" />
                    {t('team.type_analysis')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Defensive Analysis */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-500" /> {t('team.defensive')}
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-red-500/60 uppercase mb-2">{t('team.weaknesses')}</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.weaknesses.map(([type, val]) => (
                              <div key={type} className="px-3 py-1.5 rounded-xl border border-red-500/10 bg-red-500/5 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                                <span className="text-[10px] font-bold opacity-40">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-green-500/60 uppercase mb-2">{t('team.resistances')}</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.resistances.map(([type, val]) => (
                              <div key={type} className="px-3 py-1.5 rounded-xl border border-green-500/10 bg-green-500/5 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                                <span className="text-[10px] font-bold opacity-40">+{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Offensive Analysis */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" /> {t('team.offensive')}
                      </h4>
                      
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-yellow-500/60 uppercase mb-2">{t('team.super_effective_coverage')}</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.coverage.map(([type, val]) => (
                            <div key={type} className="px-3 py-1.5 rounded-xl border border-yellow-500/10 bg-yellow-500/5 flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                              <span className="text-[10px] font-bold opacity-40">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar / Suggestions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-black mb-6 border-b border-border/60 pb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                {t('team.type_coverage')}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3">{t('team.types_present')}</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(analysis?.typeCoverage || []).map(t_name => (
                      <span key={t_name} className="px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase text-primary-foreground shadow-sm" style={{ backgroundColor: TYPE_COLORS[t_name] }}>
                        {t(`types.${t_name}`)}
                      </span>
                    ))}
                    {(analysis?.typeCoverage.size || 0) === 0 && <span className="text-[10px] text-foreground/20 italic">{t('team.no_pokemon')}</span>}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3">{t('team.missing_types')}</p>
                  <div className="flex flex-wrap gap-2 opacity-40">
                    {analysis?.missingTypes.slice(0, 12).map(t_name => (
                      <span key={t_name} className="px-2 py-1 rounded-lg border border-border/60 text-[10px] sm:text-[11px] font-bold uppercase">
                        {t(`types.${t_name}`)}
                      </span>
                    ))}
                    {(analysis?.missingTypes.length || 0) > 12 && <span className="text-[10px] sm:text-[11px] font-bold">...</span>}
                  </div>
                </div>

                {analysis && (
                  <div className="pt-4 border-t border-border/40 space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3">{t('team.coverage_gaps')}</p>
                      <p className="text-[10px] text-foreground/50 mb-4">{t('team.coverage_gaps_desc')}</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.suggestions.types.map(type => (
                          <div key={type} className="flex-1 min-w-[80px] p-3 rounded-2xl bg-secondary/20 border border-border/40 text-center group hover:border-primary/30 transition-all cursor-default">
                            <span className="text-[10px] font-black uppercase" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                          </div>
                        ))}
                        {analysis.suggestions.types.length === 0 && <p className="text-[10px] italic text-foreground/30">{t('team.no_type_weaknesses')}</p>}
                      </div>
                    </div>

                    {analysis.suggestions.statFocus.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/60 mb-3">{t('team.stat_deficiencies')}</p>
                        <p className="text-[10px] text-foreground/50 mb-4">{t('team.stat_deficiencies_desc')}</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.suggestions.statFocus.map(stat => (
                            <div key={stat} className="px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10 text-center">
                              <span className="text-[10px] font-black uppercase text-orange-500">{t(`stats.${stat.toLowerCase().replace(' ', '_')}`)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent" />
              <h3 className="text-lg font-black mb-4 relative z-10">{t('team.export_title')}</h3>
              <p className="text-xs text-foreground/50 mb-6 leading-relaxed relative z-10">
                {t('team.export_desc')}
              </p>
              <div className="bg-background/50 p-3 rounded-xl border border-border/40 font-mono text-[10px] text-foreground/60 break-all mb-4 relative z-10">
                {team.length > 0 ? team.join('-') : t('team.empty_team')}
              </div>
              <Button 
                disabled={team.length === 0} 
                onClick={() => {
                  navigator.clipboard.writeText(team.join('-'));
                  toast.success(t('detail.copied'));
                }}
                className="w-full rounded-xl font-black uppercase tracking-widest h-12 shadow-lg shadow-primary/20"
              >
                {t('team.copy_code')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Trash2CustomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-labelledby="trash-title"
    >
      <title id="trash-title">Delete</title>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

