import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { theme } from '../theme';

/**
 * Nudges web players to install Sumday.
 *
 * This matters more than it looks: Safari can clear a website's storage after
 * a week without a visit, and the streak lives in that storage. Home Screen
 * apps are exempt, but they do NOT inherit the Safari tab's storage, so the
 * earlier someone installs, the less streak they risk.
 *
 * - iOS / iPadOS: there is no install API, so we explain Share → Add to Home Screen.
 * - Chromium (Android, desktop): we capture beforeinstallprompt and offer a real button.
 * - Already installed (standalone): render nothing.
 */

const DISMISS_KEY = 'sumday.installHint.dismissedAt';
const SNOOZE_MS = 5 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Mode = { kind: 'ios' } | { kind: 'prompt'; event: BeforeInstallPromptEvent } | null;

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function snoozed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function InstallHint() {
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone() || snoozed()) return;

    if (isIOS()) {
      setMode({ kind: 'ios' });
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setMode({ kind: 'prompt', event: e as BeforeInstallPromptEvent });
    };
    const onInstalled = () => setMode(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: the hint simply comes back next visit.
    }
    setMode(null);
  }, []);

  const install = useCallback(async () => {
    if (mode?.kind !== 'prompt') return;
    try {
      await mode.event.prompt();
      const { outcome } = await mode.event.userChoice;
      if (outcome === 'dismissed') dismiss();
      else setMode(null);
    } catch {
      setMode(null);
    }
  }, [mode, dismiss]);

  if (!mode) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(380)}
      exiting={FadeOut.duration(180)}
      style={styles.card}
      accessibilityRole="summary"
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>Keep your streak safe</Text>
        <Text style={styles.body}>
          {mode.kind === 'ios'
            ? 'Tap Share, then “Add to Home Screen”. Sumday will open like an app and work offline.'
            : 'Install Sumday to play offline and keep your progress.'}
        </Text>
      </View>

      <View style={styles.actions}>
        {mode.kind === 'prompt' ? (
          <Pressable
            onPress={install}
            accessibilityRole="button"
            accessibilityLabel="Install Sumday"
            hitSlop={8}
            style={({ pressed }) => [styles.install, pressed && styles.pressed]}
          >
            <Text style={styles.installText}>Install</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss install suggestion"
          hitSlop={12}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(3),
    marginBottom: theme.space(4),
    paddingVertical: theme.space(3),
    paddingLeft: theme.space(4),
    paddingRight: theme.space(2),
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  textWrap: { flex: 1 },
  title: { color: theme.color.text, fontSize: 14, fontWeight: '800' },
  body: { color: theme.color.textDim, fontSize: 13, fontWeight: '600', marginTop: 2, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.space(1) },
  install: {
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(3),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.accent,
  },
  installText: { color: theme.color.bg, fontSize: 14, fontWeight: '800' },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  closeText: { color: theme.color.textFaint, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.6 },
});
