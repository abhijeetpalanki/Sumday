import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  dailySet,
  dayKey,
  msUntilNextLocalMidnight,
  puzzleNumber as puzzleNumberFor,
} from './src/engine/daily';
import {
  emptyProgress,
  emptyStats,
  loadProgress,
  loadStats,
  recordDaily,
  recordEndless,
  saveProgress,
  saveStats,
  type DailyProgress,
  type Stats,
} from './src/state/storage';
import { theme } from './src/ui/theme';
import { HomeScreen } from './src/ui/HomeScreen';
import { DailyScreen } from './src/ui/DailyScreen';
import { EndlessScreen } from './src/ui/EndlessScreen';
import { ResultsScreen } from './src/ui/ResultsScreen';
import { StatsScreen } from './src/ui/StatsScreen';
import { HowToPlay } from './src/ui/components/HowToPlay';

type Screen = 'home' | 'daily' | 'endless' | 'results' | 'stats';

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [showHowTo, setShowHowTo] = useState(false);

  const [today, setToday] = useState(() => dayKey());
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [progress, setProgress] = useState<DailyProgress>(() => emptyProgress(dayKey()));

  // Bumped when the midnight timer fires without the date actually changing,
  // purely to re-arm the next timer.
  const [rollCheck, setRollCheck] = useState(0);

  const puzzles = useMemo(() => dailySet(today), [today]);
  const number = useMemo(() => puzzleNumberFor(), [today]);

  /* Initial load ------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = dayKey();
      const [s, p] = await Promise.all([loadStats(), loadProgress(key)]);
      if (cancelled) return;
      setToday(key);
      setStats(s);
      setProgress(p);
      setShowHowTo(!s.seenIntro);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Midnight rollover -------------------------------------------------- */
  const rollTo = useCallback((key: string) => {
    setToday(key);
    setScreen('home');
    void loadProgress(key).then(setProgress);
  }, []);

  useEffect(() => {
    // Case 1: the app was backgrounded across midnight.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const key = dayKey();
      if (key !== today) rollTo(key);
    });
    return () => sub.remove();
  }, [today, rollTo]);

  useEffect(() => {
    // Case 2: the app is sitting in the foreground when midnight passes —
    // most likely on the Results screen, which invites the player to wait for
    // it. Without this timer no 'change' event ever arrives and the app keeps
    // serving yesterday's puzzle.
    const id = setTimeout(() => {
      const key = dayKey();
      if (key !== today) rollTo(key);
      else setRollCheck((n) => n + 1); // clock skew; just re-arm
    }, msUntilNextLocalMidnight() + 1500);
    return () => clearTimeout(id);
  }, [today, rollCheck, rollTo]);

  /* Actions ------------------------------------------------------------ */
  const persistProgress = useCallback((next: DailyProgress) => {
    setProgress(next);
    void saveProgress(next);
  }, []);

  const handleFinishDaily = useCallback(
    (final: DailyProgress) => {
      const next = recordDaily(stats, final.key, final.results);
      setStats(next);
      void saveStats(next);
      setScreen('results');
    },
    [stats],
  );

  const handleEndEndless = useCallback(
    (score: number) => {
      const next = recordEndless(stats, score);
      setStats(next);
      void saveStats(next);
    },
    [stats],
  );

  const handleCloseHowTo = useCallback(() => {
    setShowHowTo(false);
    if (!stats.seenIntro) {
      const next = { ...stats, seenIntro: true };
      setStats(next);
      void saveStats(next);
    }
  }, [stats]);

  const handlePlayDaily = useCallback(() => {
    setScreen(progress.finished ? 'results' : 'daily');
  }, [progress.finished]);

  /* Render ------------------------------------------------------------- */
  if (!ready) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />

        {screen === 'home' && (
          <HomeScreen
            puzzleNumber={number}
            todayKey={today}
            stats={stats}
            progress={progress}
            onPlayDaily={handlePlayDaily}
            onPlayEndless={() => setScreen('endless')}
            onStats={() => setScreen('stats')}
            onHowTo={() => setShowHowTo(true)}
          />
        )}

        {screen === 'daily' && (
          <DailyScreen
            puzzles={puzzles}
            progress={progress}
            onProgress={persistProgress}
            onFinish={handleFinishDaily}
            onExit={() => setScreen('home')}
          />
        )}

        {screen === 'endless' && (
          <EndlessScreen
            best={stats.endlessBest}
            onEnd={handleEndEndless}
            onExit={() => setScreen('home')}
          />
        )}

        {screen === 'results' && (
          <ResultsScreen
            puzzleNumber={number}
            todayKey={today}
            progress={progress}
            stats={stats}
            onStats={() => setScreen('stats')}
            onExit={() => setScreen('home')}
          />
        )}

        {screen === 'stats' && (
          <StatsScreen stats={stats} todayKey={today} onExit={() => setScreen('home')} />
        )}

        <HowToPlay visible={showHowTo} onClose={handleCloseHowTo} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  loading: {
    flex: 1,
    backgroundColor: theme.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
