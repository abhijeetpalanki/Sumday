import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import type { ShareCardModel } from '../../share';

/** Card size in points. Captured at 3x, so the image is 1080 x 1350 (4:5, feed friendly). */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 450;

interface Props {
  card: ShareCardModel;
}

/**
 * The share image on Android. It is laid out off screen and captured to a
 * PNG; the web build draws the same layout on a canvas (shareImage.web.ts),
 * so changes here belong there too.
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard({ card }, ref) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.wordmark}>
        SUM<Text style={styles.accent}>DAY</Text>
      </Text>
      <Text style={styles.title}>{card.subtitle}</Text>

      <View style={styles.grid}>
        {card.squares.map((s, i) => (
          <View key={i} style={[styles.square, { backgroundColor: s.color }]} />
        ))}
      </View>

      <Text style={styles.score}>{card.score}</Text>
      {card.meta ? <Text style={styles.meta}>{card.meta}</Text> : null}

      <View style={styles.spacer} />
      <Text style={styles.url}>{card.url}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: theme.color.bg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 28,
  },
  wordmark: { color: theme.color.text, fontSize: 34, fontWeight: '900', letterSpacing: 5 },
  accent: { color: theme.color.accent },
  title: {
    color: theme.color.textFaint,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  grid: { flexDirection: 'row', gap: 10, marginTop: 52 },
  square: { width: 50, height: 50, borderRadius: 10 },
  score: { color: theme.color.text, fontSize: 28, fontWeight: '900', marginTop: 34 },
  meta: { color: theme.color.textDim, fontSize: 16, fontWeight: '700', marginTop: 10 },
  spacer: { flex: 1 },
  url: { color: theme.color.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
