'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { 
  getAllPokemonSearchIndex,
  getPokemonDetail, 
  getPokemonByGeneration, 
  getPokemonByType 
} from '@/lib/api';
import { 
  Gamepad2, 
  Trophy, 
  Timer, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Filter,
  BarChart3,
  Calendar,
  EyeOff,
  Heart,
  Flame,
  BrainCircuit,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { PokemonDetail } from '@/types/pokemon';
import { useTranslation } from '@/lib/i18n';
import { getFormDisplayName } from '@/lib/form-names';
import { usePrimeDexStore } from '@/store/primedex';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveLanguage } from '@/lib/languages';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { submitDailyScore } from '@/lib/supabase/leaderboard-client';
import QuizLeaderboard from '@/components/dashboard/QuizLeaderboard';
import QuizResultCard from '@/components/quiz/QuizResultCard';
import type { LeaderboardChallenge, LeaderboardMode } from '@/lib/leaderboard';

type GameMode = 'time-attack' | 'survival' | 'marathon';
type QuizChallenge = 'classic' | 'silhouette' | 'stats';
type GameState = 'idle' | 'loading' | 'playing' | 'answered' | 'finished';

const GENERATIONS = [
  { id: '1', name: 'Gen 1' },
  { id: '2', name: 'Gen 2' },
  { id: '3', name: 'Gen 3' },
  { id: '4', name: 'Gen 4' },
  { id: '5', name: 'Gen 5' },
  { id: '6', name: 'Gen 6' },
  { id: '7', name: 'Gen 7' },
  { id: '8', name: 'Gen 8' },
  { id: '9', name: 'Gen 9' },
];

const TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 0x85ebca6b);
    h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const searchParams = useSearchParams();
  const targetPokemon = searchParams?.get('pokemon');

  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('marathon');
  const [quizChallenge, setQuizChallenge] = useState<QuizChallenge>('classic');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lives, setLives] = useState(3);
  const [currentPokemon, setCurrentPokemon] = useState<PokemonDetail | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [selectedGen, setSelectedGen] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filteredPool, setFilteredPool] = useState<Array<{ name: string }>>([]);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [sessionBadges, setSessionBadges] = useState(0);
  const initialBadgeCountRef = useRef(0);

  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, systemLanguage, quizHighScores, updateQuizHighScore, addBadge, badges, addQuizSession, addAction } = usePrimeDexStore();

  const resolvedLang = resolveLanguage(language, systemLanguage);

  const { data: allNames } = useQuery({
    queryKey: ['allPokemonSearchIndex'],
    queryFn: getAllPokemonSearchIndex,
    staleTime: 30 * 60 * 1000,
  });

  const getLocalizedName = useCallback((internalName: string) => {
    if (!allNames) return internalName;
    const summary = allNames.find((p) => p.name === internalName);
    if (!summary) return internalName;
    
    const speciesNames = summary.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
    const localized = speciesNames.find((sn) => sn.pokemon_v2_language?.name === resolvedLang);
    const baseName = localized?.name || internalName;
    
    if (internalName.includes('-')) {
      return getFormDisplayName(internalName, baseName, resolvedLang);
    }
    return baseName;
  }, [allNames, resolvedLang]);

  useEffect(() => {
    if (targetPokemon && gameState === 'idle' && allNames) {
      const startTargetQuiz = async () => {
        setGameState('loading');
        setQuizChallenge('classic');
        setGameMode('marathon');
        
        try {
          const detail = await getPokemonDetail(targetPokemon);
          setCurrentPokemon(detail);
          
          const otherOptions: string[] = [];
          while (otherOptions.length < 3) {
            const idx = Math.floor(Math.random() * allNames.length);
            const p = allNames[idx];
            if (p.name !== targetPokemon && !otherOptions.includes(p.name)) {
              otherOptions.push(p.name);
            }
          }
          setOptions([targetPokemon, ...otherOptions].sort(() => Math.random() - 0.5));
          setGameState('playing');
        } catch {
          toast.error(t('quiz.fetch_failed'));
          setGameState('idle');
        }
      };
      startTargetQuiz();
    }
  }, [targetPokemon, allNames, gameState, t]);

  const getNextPokemon = useCallback(() => {
    const basePool = filteredPool.length > 0 ? filteredPool : (allNames || []);
    const pool = basePool.filter((p) => !p.name.includes('-primal') && !p.name.includes('-ultra'));
    if (pool.length === 0) return null;

    if (isDaily) {
      const today = new Date().toISOString().split('T')[0];
      const rng = seededRandom(`${today}-${dailyIndex}`);
      const randomIndex = Math.floor(rng() * pool.length);
      return pool[randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * pool.length);
      return pool[randomIndex];
    }
  }, [allNames, filteredPool, isDaily, dailyIndex]);

  const startNewRound = useCallback(async () => {
    if (gameState === 'finished') return;
    if (isDaily && dailyIndex >= 9) {
      setGameState('finished');
      return;
    }

    const pokemon = getNextPokemon();
    if (!pokemon) return;
    
    setGameState('loading');
    setSelectedOption(null);
    setIsCorrect(null);
    
    try {
      const detail = await getPokemonDetail(pokemon.name);
      setCurrentPokemon(detail);

      const otherOptions: string[] = [];
      const mainPool = allNames || [];
      
      const today = new Date().toISOString().split('T')[0];
      const rngSeed = isDaily ? `${today}-${dailyIndex}` : Math.random().toString();
      const rng = seededRandom(`options-${rngSeed}`);
      
      while (otherOptions.length < 3) {
        const idx = Math.floor(rng() * mainPool.length);
        const p = mainPool[idx];
        if (p.name !== pokemon.name && !otherOptions.includes(p.name)) {
          otherOptions.push(p.name);
        }
      }

      setOptions([pokemon.name, ...otherOptions].sort(() => rng() - 0.5));
      setGameState('playing');
    } catch {
      toast.error(t('quiz.fetch_failed'));
      setGameState('idle');
    }
  }, [allNames, getNextPokemon, isDaily, dailyIndex, gameState, t]);

  const startGame = async (challenge: QuizChallenge, mode: GameMode = 'marathon', daily: boolean = false) => {
    setGameState('loading');
    setIsDaily(daily);
    setDailyIndex(0);
    setQuizChallenge(challenge);
    setGameMode(mode);
    
    let pool: Array<{ name: string; url?: string }> = allNames
      ?.map((p) => ({ name: p.name }))
      .filter((p) => !p.name.includes('-primal') && !p.name.includes('-ultra')) || [];
    
    if (selectedGen || selectedType) {
      const genPool = selectedGen ? await getPokemonByGeneration(selectedGen) : null;
      const typePool = selectedType ? await getPokemonByType(selectedType) : null;
      
      if (genPool && typePool) {
        pool = genPool.filter(p1 => typePool!.some(p2 => p2.name === p1.name));
      } else if (genPool) {
        pool = genPool;
      } else if (typePool) {
        pool = typePool;
      }
    }

    if (pool.length < 4) {
      toast.error(t('quiz.not_enough'));
      setGameState('idle');
      return;
    }

    setFilteredPool(pool);
    setScore(0);
    setLives(3);
    setTimeLeft(30);
    setWrongAnswers(0);
    setTotalQuestions(0);
    setCorrectCount(0);
    setSessionStreak(0);
    setSessionBadges(0);
    initialBadgeCountRef.current = badges.length;
    
    const today = new Date().toISOString().split('T')[0];
    const firstRng = daily ? seededRandom(`${today}-0`) : Math.random;
    const firstPokemon = pool[Math.floor((typeof firstRng === 'function' ? firstRng() : Math.random()) * pool.length)];
    
    const detail = await getPokemonDetail(firstPokemon.name);
    setCurrentPokemon(detail);

    const otherOptions: string[] = [];
    const mainPool = allNames || [];
    const optionsRng = daily ? seededRandom(`options-${today}-0`) : Math.random;

    while (otherOptions.length < 3) {
      const idx = Math.floor((typeof optionsRng === 'function' ? optionsRng() : Math.random()) * mainPool.length);
      const p = mainPool[idx];
      if (p.name !== firstPokemon.name && !otherOptions.includes(p.name)) {
        otherOptions.push(p.name);
      }
    }

    setOptions([firstPokemon.name, ...otherOptions].sort(() => (typeof optionsRng === 'function' ? optionsRng() : Math.random()) - 0.5));
    setGameState('playing');
  };

  const handleAnswer = (option: string) => {
    if (gameState !== 'playing' || !currentPokemon) return;
    
    setSelectedOption(option);
    const correct = option === currentPokemon.name;
    setIsCorrect(correct);
    setGameState('answered');
    setTotalQuestions(q => q + 1);

    if (correct) {
      setCorrectCount(c => c + 1);
      setSessionStreak(s => s + 1);
      setScore(s => {
        const newScore = s + (gameMode === 'time-attack' ? 10 : 1);
        
        if (newScore >= 10 && gameMode === 'marathon') addBadge('quiz-novice');
        if (newScore >= 50 && gameMode === 'marathon') addBadge('quiz-master');
        if (newScore >= 100 && gameMode === 'time-attack') addBadge('speed-demon');
        if (quizChallenge === 'silhouette' && newScore >= 20) addBadge('eagle-eye');
        if (quizChallenge === 'stats' && newScore >= 20) addBadge('professor');
        
        return newScore;
      });
      
      if (isDaily) {
        setDailyIndex(i => i + 1);
      }
      
      if (targetPokemon) {
        setTimeout(() => {
          setGameState('finished');
          toast.success(t('quiz.targeted_finish'));
        }, 1500);
      } else {
        setTimeout(startNewRound, 1500);
      }
    } else {
      setSessionStreak(0);
      if (isDaily) {
        setDailyIndex(i => i + 1);
      }
      if (gameMode === 'survival') {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setGameState('finished');
        } else {
          setTimeout(startNewRound, 2000);
        }
      } else if (gameMode === 'marathon') {
        const newWrong = wrongAnswers + 1;
        setWrongAnswers(newWrong);
        if (newWrong >= 5) {
          setGameState('finished');
        } else {
          setTimeout(startNewRound, 2000);
        }
      }
    }
  };

  useEffect(() => {
    if (gameState === 'finished' && !isDaily) {
      updateQuizHighScore(quizChallenge, score);
      if (gameMode === 'time-attack') {
        updateQuizHighScore('timeAttack', score);
      }
      setSessionBadges(badges.length - initialBadgeCountRef.current);
      addQuizSession({
        id: `${quizChallenge}-${Date.now()}`,
        date: new Date().toISOString(),
        challenge: quizChallenge,
        mode: gameMode,
        score,
        totalQuestions,
        correctAnswers: correctCount,
        wrongAnswers: totalQuestions - correctCount,
        streak: sessionStreak,
      });
      addAction({
        id: `quiz-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'quiz',
        label: `Played ${gameMode} ${quizChallenge} quiz`,
        details: `Score: ${score}`,
      });
    }
  }, [gameState, quizChallenge, gameMode, score, updateQuizHighScore, isDaily, addQuizSession, addAction, totalQuestions, correctCount, sessionStreak, badges.length]);

  // Submit the daily challenge score to the online leaderboard — only when the
  // daily run finishes and the user is signed in. The score is re-validated and
  // clamped server-side; no-ops entirely when Supabase is unconfigured.
  useEffect(() => {
    if (gameState !== 'finished' || !isDaily || !user) return;
    let cancelled = false;
    void submitDailyScore({
      mode: gameMode as LeaderboardMode,
      challenge: quizChallenge as LeaderboardChallenge,
      score,
    }).then((ok) => {
      if (ok && !cancelled) setLeaderboardRefresh((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [gameState, isDaily, user, gameMode, quizChallenge, score]);

  useEffect(() => {
    if (gameMode === 'time-attack' && gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setGameState('finished');
            clearInterval(timer);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, gameMode]);

  return (
    <div className="app-page relative overflow-x-hidden pb-20">
      <Header />
      
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[34rem] overflow-hidden opacity-55">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
      </div>
      
      <main className="page-shell pt-24 pb-8 relative z-10 max-w-4xl">
        {gameState === 'idle' || gameState === 'finished' ? (
          <PageHeader
            icon={Gamepad2}
            title={t('quiz.title')}
            subtitle={t('quiz.subtitle')}
            eyebrow={t('quiz.eyebrow', { defaultValue: 'PrimeDex' })}
          />
        ) : null}

        <div className="max-w-3xl mx-auto pt-4 relative">
          {gameState === 'idle' || gameState === 'finished' ? (
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="page-surface p-6 md:p-8 rounded-sm space-y-8 relative overflow-hidden"
              >
                {/* Inner decorative line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

                {gameState === 'finished' && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.5 } }}
                    className="space-y-4 relative z-10 text-center"
                  >
                    <div className="flex justify-center">
                      <div className="p-5 bg-yellow-500/10 rounded-full border border-yellow-500/30 relative hover:scale-105 transition-transform">
                        <div className="absolute inset-x-2 bottom-1 h-4 rounded-full bg-yellow-500/15" />
                        <Trophy className="w-14 h-14 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] relative z-10" />
                      </div>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black gradient-text-primary uppercase tracking-tighter">{t('quiz.game_over')}</h3>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/50">
                      {isDaily ? t('quiz.daily_score') : t('quiz.final_score')} 
                    </p>
                    <p className="text-5xl md:text-6xl font-black text-foreground drop-shadow-lg">{score}</p>
                  </motion.div>
                )}

                {gameState === 'finished' && (
                  <QuizResultCard
                    score={score}
                    total={totalQuestions || 10}
                    mode={gameMode}
                    challenge={quizChallenge}
                    streak={sessionStreak}
                    badgesEarned={sessionBadges}
                  />
                )}

                <div className="relative z-10 space-y-8">
                  {/* Daily Challenge - Premium styled button */}
                  <Button
                    onClick={() => startGame('classic', 'marathon', true)}
                    className="w-full h-18 rounded-sm font-black uppercase tracking-[0.15em] text-sm md:text-base border border-primary/25 bg-primary/90 text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    {t('quiz.daily')}
                  </Button>

                  {/* Online daily leaderboard (hidden when Supabase is unconfigured) */}
                  <QuizLeaderboard refreshKey={leaderboardRefresh} />

                  {/* Filters Section */}
                  <div className="space-y-4 bg-card/50 dark:bg-card/35 p-5 md:p-6 rounded-sm border border-border/50 dark:border-border/40">
                    <div className="flex items-center gap-2 mb-3 justify-center">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">{t('quiz.customize')}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-left relative">
                        <label htmlFor="quiz-gen-select" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-foreground/50 ml-2">{t('filters.generation')}</label>
                        <Select value={selectedGen || ''} onValueChange={(value) => setSelectedGen(value || null)}>
                          <SelectTrigger id="quiz-gen-select" className="w-full h-11 rounded-sm bg-card/50 dark:bg-card/35 border border-border/60 dark:border-border/40 px-4 text-sm font-semibold focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:bg-card/60 [&>span]:text-foreground/70 [&>span]:font-medium">
                            <SelectValue placeholder={t('quiz.all_generations')} />
                          </SelectTrigger>
                          <SelectContent className="bg-card/50 dark:bg-card/35 border border-border/60 dark:border-border/40 rounded-sm overflow-hidden">
                            <SelectItem value="" className="focus:bg-card/60">{t('quiz.all_generations')}</SelectItem>
                            {GENERATIONS.map(gen => (
                              <SelectItem key={gen.id} value={gen.id} className="focus:bg-card/60">{gen.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 text-left relative">
                        <label htmlFor="quiz-type-select" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-foreground/50 ml-2">{t('filters.types')}</label>
                        <Select value={selectedType || ''} onValueChange={(value) => setSelectedType(value || null)}>
                          <SelectTrigger id="quiz-type-select" className="w-full h-11 rounded-sm bg-card/50 dark:bg-card/35 border border-border/60 dark:border-border/40 px-4 text-sm font-semibold focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:bg-card/60 [&>span]:text-foreground/70 [&>span]:font-medium">
                            <SelectValue placeholder={t('quiz.all_types')} />
                          </SelectTrigger>
                          <SelectContent className="bg-card/50 dark:bg-card/35 border border-border/60 dark:border-border/40 rounded-sm overflow-hidden">
                            <SelectItem value="" className="focus:bg-card/60">{t('quiz.all_types')}</SelectItem>
                            {TYPES.map(type => (
                              <SelectItem key={type} value={type} className="focus:bg-card/60">{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Challenge Type Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'classic' as QuizChallenge, name: t('quiz.classic'), icon: <Gamepad2 className="w-4 h-4" />, desc: t('quiz.classic_desc') },
                      { id: 'silhouette' as QuizChallenge, name: t('quiz.silhouette'), icon: <EyeOff className="w-4 h-4" />, desc: t('quiz.silhouette_desc') },
                      { id: 'stats' as QuizChallenge, name: t('quiz.stats_mode'), icon: <BarChart3 className="w-4 h-4" />, desc: t('quiz.stats_desc') }
                    ].map((mode) => (
                      <motion.button 
                        key={mode.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startGame(mode.id)} 
                        className="h-24 md:h-26 rounded-sm flex flex-col items-center justify-center gap-2 group bg-card/50 dark:bg-card/35 border border-border/50 dark:border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-2 font-bold uppercase tracking-[0.12em] text-[10px] md:text-xs text-foreground/60 group-hover:text-primary transition-colors">
                          {mode.icon}
                          {mode.name}
                        </div>
                        <span className="text-[10px] sm:text-[11px] opacity-40 font-semibold tracking-wider">{mode.desc}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Game Mode Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => startGame(quizChallenge, 'time-attack')}
                      className="h-14 rounded-sm flex items-center justify-center gap-2 font-bold uppercase tracking-[0.1em] text-[10px] sm:text-[11px] border-border/50 dark:border-border/40 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <Timer className="w-4 h-4 text-blue-400" />
                      {t('quiz.time_attack')} <span className="opacity-50 ml-1">(30s)</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => startGame(quizChallenge, 'survival')}
                      className="h-14 rounded-sm flex items-center justify-center gap-2 font-bold uppercase tracking-[0.1em] text-[10px] sm:text-[11px] border-border/50 dark:border-border/40 hover:border-red-500/30 hover:bg-red-500/5"
                    >
                      <Heart className="w-4 h-4 text-red-400" />
                      {t('quiz.survival')} <span className="opacity-50 ml-1">(3 {t('quiz.lives')})</span>
                    </Button>
                  </div>

                  {/* High Scores */}
                  {quizHighScores && (
                    <div className="pt-6 border-t border-border/50 dark:border-border/40 grid grid-cols-3 gap-3">
                      <div className="bg-card/50 dark:bg-card/35 rounded-sm p-3 text-center border border-border/50 dark:border-border/40 hover:border-border/70 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">{t('quiz.classic')}</p>
                        <p className="text-xl md:text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(227,53,13,0.3)]">{quizHighScores.classic}</p>
                      </div>
                      <div className="bg-card/50 dark:bg-card/35 rounded-sm p-3 text-center border border-border/50 dark:border-border/40 hover:border-border/70 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">{t('quiz.silhouette')}</p>
                        <p className="text-xl md:text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(227,53,13,0.3)]">{quizHighScores.silhouette}</p>
                      </div>
                      <div className="bg-card/50 dark:bg-card/35 rounded-sm p-3 text-center border border-border/50 dark:border-border/40 hover:border-border/70 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">{t('quiz.stats_mode')}</p>
                        <p className="text-xl md:text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(227,53,13,0.3)]">{quizHighScores.stats}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Achievements Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-6 md:p-8 rounded-sm space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
                <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 text-foreground/60">
                  <div className="w-6 md:w-8 h-px bg-gradient-to-r from-transparent to-yellow-500/50" />
                  <Trophy className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  {t('quiz.achievements')}
                  <div className="w-6 md:w-8 h-px bg-gradient-to-l from-transparent to-yellow-500/50" />
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { id: 'quiz-novice', name: t('quiz.badge_novice'), icon: <Gamepad2 className="w-5 h-5" />, desc: t('quiz.badge_novice_desc') },
                    { id: 'quiz-master', name: t('quiz.badge_master'), icon: <Trophy className="w-5 h-5" />, desc: t('quiz.badge_master_desc') },
                    { id: 'speed-demon', name: t('quiz.badge_speed_demon'), icon: <Zap className="w-5 h-5" />, desc: t('quiz.badge_speed_demon_desc') },
                    { id: 'eagle-eye', name: t('quiz.badge_eagle_eye'), icon: <EyeOff className="w-5 h-5" />, desc: t('quiz.badge_eagle_eye_desc') },
                    { id: 'professor', name: t('quiz.badge_professor'), icon: <BrainCircuit className="w-5 h-5" />, desc: t('quiz.badge_professor_desc') },
                  ].map(badge => {
                    const isUnlocked = badges.includes(badge.id);
                    return (
                      <div 
                        key={badge.id}
                        className={cn(
                          "relative p-4 rounded-sm border transition-all duration-300 flex flex-col items-center gap-2 text-center overflow-hidden group",
                          isUnlocked 
                            ? "bg-primary/5 border-primary/20 text-primary shadow-[inset_0_0_20px_rgba(227,53,13,0.05)] hover:bg-primary/10" 
                            : "bg-card/50 dark:bg-card/35 border border-border/50 dark:border-border/40 text-foreground/30 hover:bg-card/60"
                        )}
                      >
                        {isUnlocked && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/35" />}
                        <div className={cn("p-2.5 rounded-sm transition-all duration-300", isUnlocked ? "bg-primary/20 shadow-[0_0_12px_rgba(227,53,13,0.25)] group-hover:scale-110" : "bg-card/60 dark:bg-card/50 grayscale")}>
                          {badge.icon}
                        </div>
                        <div className="space-y-0.5">
                          <div className={cn("text-[10px] font-bold uppercase tracking-[0.08em]", isUnlocked ? "text-primary" : "text-foreground/30")}>
                            {badge.name}
                          </div>
                          {isUnlocked && <div className="text-[9px] font-medium opacity-50 leading-tight text-foreground/60">{badge.desc}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8 animate-fade-in-up">
              {/* Game HUD */}
              <div className="page-surface px-4 md:px-6 py-4 rounded-sm flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
                
                <div className="flex gap-2 sm:gap-3 flex-wrap w-full lg:w-auto overflow-hidden justify-center lg:justify-start">
                  {/* Current Score */}
                  <div className="flex items-center gap-2 bg-card/60 dark:bg-card/50 px-4 py-2.5 rounded-[1rem] border border-border/50 dark:border-border/40 min-w-[100px] md:min-w-[120px] relative">
                    {gameMode === 'marathon' ? <Flame className="w-5 h-5 text-orange-500" /> : <Trophy className="w-5 h-5 text-yellow-500" />}
                    <div className="flex flex-col items-start leading-[1.1]">
                      <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.15em]">{t('quiz.score_current')}</span>
                      <span className="font-black text-xl md:text-2xl tabular-nums text-foreground drop-shadow-md">{score}</span>
                    </div>
                  </div>

                  {/* High Score */}
                  <div className="flex items-center gap-2 bg-card/60 dark:bg-card/50 px-4 py-2.5 rounded-[1rem] border border-border/50 dark:border-border/40 min-w-[100px] md:min-w-[120px] opacity-70">
                    <Gamepad2 className="w-5 h-5 text-primary/70" />
                    <div className="flex flex-col items-start leading-[1.1]">
                      <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.15em]">{t('quiz.score_high')}</span>
                      <span className="font-black text-xl md:text-2xl tabular-nums text-foreground/70">{isDaily ? '-' : quizHighScores[quizChallenge]}</span>
                    </div>
                  </div>
                  
                  {/* Timer (Time Attack) */}
                  {gameMode === 'time-attack' && (
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-[1rem] border min-w-[100px] md:min-w-[120px] transition-all duration-300",
                      timeLeft < 10 
                        ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" 
                        : "bg-card/60 dark:bg-card/50 border border-border/50 dark:border-border/40"
                    )}>
                      <Timer className={cn("w-5 h-5", timeLeft < 10 ? "text-red-500" : "text-blue-400")} />
                      <div className="flex flex-col items-start leading-[1.1]">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60">{t('quiz.timer')}</span>
                        <span className="font-black text-xl md:text-2xl tabular-nums tracking-tight">{timeLeft}s</span>
                      </div>
                    </div>
                  )}

                  {/* Lives (Survival) */}
                  {gameMode === 'survival' && (
                    <div className="flex items-center gap-2 bg-card/60 dark:bg-card/50 px-4 py-2.5 rounded-[1rem] border border-border/50 dark:border-border/40 h-full min-h-[52px]">
                      <div className="flex gap-1.5 items-center">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Heart 
                            key={i} 
                            className={cn(
                              "w-4 h-4 md:w-5 md:h-5 transition-all duration-300", 
                              i < lives 
                                ? "text-red-500 fill-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" 
                                : "text-foreground/10 scale-90"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors (Marathon) */}
                  {gameMode === 'marathon' && (
                    <div className="flex items-center gap-2 bg-card/60 dark:bg-card/50 px-4 py-2.5 rounded-[1rem] border border-border/50 dark:border-border/40">
                      <div className="flex flex-col items-start leading-[1.1]">
                        <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-[0.15em]">{t('quiz.errors')}</span>
                        <span className="font-black text-xl md:text-2xl tabular-nums text-red-400">{wrongAnswers}<span className="text-sm text-foreground/30">/5</span></span>
                      </div>
                    </div>
                  )}

                  {/* Daily Progress */}
                  {isDaily && (
                    <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2.5 rounded-[1rem] border border-orange-500/20">
                      <div className="flex flex-col items-start leading-[1.1]">
                        <span className="text-[10px] font-bold text-orange-500/80 uppercase tracking-[0.15em]">{t('quiz.progress')}</span>
                        <span className="font-black text-xl md:text-2xl tabular-nums text-orange-400">{dailyIndex}<span className="text-sm text-orange-500/40">/10</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Game Stage */}
              <div className="page-surface relative min-h-[20rem] md:min-h-[24rem] flex flex-col items-center justify-center p-6 md:p-8 rounded-sm overflow-hidden">
                {/* Stage background */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
                <div className="absolute inset-x-8 bottom-8 h-24 rounded-sm bg-gradient-to-t from-primary/10 to-transparent pointer-events-none transition-opacity duration-700" />
                
                <AnimatePresence mode="wait">
                  {gameState === 'loading' ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center gap-4 relative z-10"
                    >
                      <Loader2 className="w-14 h-14 animate-spin text-primary/50 drop-shadow-[0_0_15px_rgba(227,53,13,0.3)]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/40 animate-pulse">{t('quiz.loading')}</span>
                    </motion.div>
                  ) : currentPokemon ? (
                    <motion.div
                      key={currentPokemon.id}
                      initial={{ scale: 0.5, opacity: 0, y: 30 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
                      className="w-full flex flex-col items-center relative z-10"
                    >
                      {quizChallenge === 'stats' ? (
                        <div className="bg-background/90  border border-border/60 dark:border-border/40 p-5 md:p-6 rounded-sm w-full max-w-[18rem] md:max-w-md space-y-4 shadow-2xl relative">
                          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-foreground/60 mb-4 text-center">{t('quiz.who_stats')}</p>
                          {[
                            { label: t('stats.hp_short'), val: currentPokemon.stats[0].base_stat, color: '#FF4757' },
                            { label: t('stats.attack_short'), val: currentPokemon.stats[1].base_stat, color: '#FFA502' },
                            { label: t('stats.defense_short'), val: currentPokemon.stats[2].base_stat, color: '#ECCC68' },
                            { label: t('stats.special_attack_short'), val: currentPokemon.stats[3].base_stat, color: '#3742FA' },
                            { label: t('stats.special_defense_short'), val: currentPokemon.stats[4].base_stat, color: '#7BED9F' },
                            { label: t('stats.speed_short'), val: currentPokemon.stats[5].base_stat, color: '#FF6B81' },
                          ].map(s => (
                            <div key={s.label} className="space-y-1.5">
                              <div className="flex justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-foreground/80">
                                <span>{s.label}</span>
                                <span className={gameState === 'answered' ? 'text-primary drop-shadow-[0_0_5px_rgba(227,53,13,0.5)]' : 'opacity-30'}>
                                  {gameState === 'answered' ? s.val : '???'}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(s.val / 255) * 100}%` }}
                                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}80` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="relative w-52 h-52 md:w-72 md:h-72 drop-shadow-2xl flex items-center justify-center float-particle">
                          <div className={cn(
                            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 rounded-full transition-opacity duration-700",
                            gameState === 'answered' && isCorrect
                              ? "opacity-100 bg-[radial-gradient(circle,rgba(34,197,94,0.25)_0%,transparent_70%)]"
                              : "opacity-0"
                          )} />
                          <Image 
                            src={currentPokemon.sprites.other['official-artwork'].front_default || currentPokemon.sprites.front_default} 
                            alt="Mystery Pokemon"
                            fill
                            className={cn(
                              "object-contain transition-all duration-700 ease-out",
                              gameState === 'playing' && quizChallenge === 'silhouette' ? "brightness-0 contrast-100 opacity-90 drop-shadow-[0_0_15px_rgba(0,0,0,1)]" : "brightness-100 drop-shadow-[0_15px_35px_rgba(0,0,0,0.5)]"
                            )}
                          />
                        </div>
                      )}
                      
                      <div className="h-14 md:h-16 flex items-center justify-center mt-4">
                        {gameState === 'answered' && (
                          <motion.div 
                            initial={{ scale: 0, rotate: -5, y: 15 }}
                            animate={{ scale: 1, rotate: 0, y: 0 }}
                            transition={{ type: 'spring', bounce: 0.5 }}
                          >
                            {isCorrect ? (
                              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-5 md:px-6 py-2.5 md:py-3 rounded-full shadow-sm flex items-center gap-2 font-bold uppercase tracking-[0.15em] text-[10px] md:text-xs">
                                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> {t('quiz.correct')}
                              </div>
                            ) : (
                              <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-5 md:px-6 py-2.5 md:py-3 rounded-full shadow-sm flex items-center gap-2 font-bold uppercase tracking-[0.15em] text-[10px] md:text-xs">
                                <AlertCircle className="w-4 h-4 md:w-5 md:h-5" /> {t('quiz.wrong')}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Answers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isActualAnswer = option === currentPokemon?.name;
                  const isRevealed = gameState === 'answered';
                  
                  let buttonClass = "h-14 md:h-16 rounded-sm font-bold uppercase tracking-[0.15em] text-xs md:text-sm transition-all duration-300 border-2 relative overflow-hidden bg-card/50 dark:bg-card/35 border border-border/50 dark:border-border/40 hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98] shadow-lg";
                  
                  if (isRevealed) {
                    if (isActualAnswer) {
                      buttonClass = "h-14 md:h-16 rounded-sm font-black uppercase tracking-[0.15em] text-xs md:text-sm transition-all duration-300 border-2 relative overflow-hidden bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.15)]";
                    } else if (isSelected) {
                      buttonClass = "h-14 md:h-16 rounded-sm font-black uppercase tracking-[0.15em] text-xs md:text-sm transition-all duration-300 border-2 relative overflow-hidden bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]";
                    } else {
                      buttonClass = "h-14 md:h-16 rounded-sm font-black uppercase tracking-[0.15em] text-xs md:text-sm transition-all duration-300 border-2 relative overflow-hidden bg-secondary/10 border-border/40 text-foreground/30 cursor-default opacity-50";
                    }
                  }

                  return (
                    <motion.button
                      key={option}
                      initial={{ opacity: 0, x: idx % 2 === 0 ? -15 : 15 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.08, duration: 0.4, ease: "easeOut" } }}
                      disabled={gameState !== 'playing'}
                      onClick={() => handleAnswer(option)}
                      className={buttonClass}
                    >
                      {!isRevealed && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out pointer-events-none" />
                      )}
                      <span className="relative z-10 drop-shadow-md">{getLocalizedName(option)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
