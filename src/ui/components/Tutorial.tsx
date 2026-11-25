import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyMove, newBoard, OPS, type Board, type Op, type Puzzle } from '../../engine/puzzle';
import { OP_GLYPH } from '../opGlyph';
import { theme } from '../theme';
import { useMotionOff } from '../SettingsContext';
import * as Haptics from '../haptics';
import { Button } from './Button';
import { OpButton } from './OpButton';
import { TargetDisplay } from './TargetDisplay';
import { Tile, TILE_SIZE } from './Tile';

interface Props {
  visible: boolean;
  /** Close and go straight into today's daily. */
  onPlay: () => void;
  /** Close and open the full written rules. */
  onRules: () => void;
  /** Close without playing (the Skip link, or Android back). */
  onClose: () => void;
}

/**
 * A two-move puzzle small enough to read at a glance: 3 + 5 = 8, 8 × 2 = 16.
 * Small numbers on purpose. The point is the tap, operator, tap gesture, not
 * the arithmetic, and a first win inside ten seconds.
 */
const PUZZLE: Puzzle = {
  numbers: [3, 5, 2],
  target: 16,
  parOps: 2,
  solutionPaths: 1,
  needsSubDiv: false,
  difficulty: 1,
};

/** Tile ids are deterministic: the deal is 0, 1, 2 and the first merge makes 3. */
const PLAN: readonly { a: number; op: Op; b: number }[] = [
  { a: 0, op: '+', b: 1 }, // 3 + 5 = 8, lands in the 5's slot
  { a: 3, op: '*', b: 2 }, // 8 × 2 = 16
];

type Phase = 'pickA' | 'pickOp' | 'pickB';

function instruction(step: number, phase: Phase, board: Board): string {
  const { a, op, b } = PLAN[step];
  const va = board.tiles.find((t) => t.id === a)?.value;
  const vb = board.tiles.find((t) => t.id === b)?.value;
  if (step === 0) {
    if (phase === 'pickA') return `Tap the ${va} to pick it up.`;
    if (phase === 'pickOp') return `Now tap ${OP_GLYPH[op]} to add.`;
    return `Tap the ${vb}. The two tiles become one.`;
  }
  if (phase === 'pickA') return `${va}! One more move. Tap the ${va}.`;
  if (phase === 'pickOp') return `Tap ${OP_GLYPH[op]} to multiply.`;
  return `Tap the ${vb} to make the target.`;
}

/**
 * First-run tutorial, played on the real tiles.
 *
 * Replaces the wall of rules for new players: they learn tap, operator, tap
 * by doing it, and only then see the short version of the rules. The written
 * rules stay one tap away under "How to play".
 */
export function Tutorial({ visible, onPlay, onRules, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const motionOff = useMotionOff();

  const [board, setBoard] = useState<Board>(() => newBoard(PUZZLE));
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('pickA');
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [selectedOp, setSelectedOp] = useState<Op | null>(null);
  const [freshId, setFreshId] = useState<number | null>(null);
  const [nudge, setNudge] = useState<{ id: number; n: number }>({ id: -1, n: 0 });
  const [done, setDone] = useState(false);

  // Start from the top every time it opens, including Replay tutorial.
  useEffect(() => {
    if (!visible) return;
    setBoard(newBoard(PUZZLE));
    setStep(0);
    setPhase('pickA');
    setSelectedTile(null);
    setSelectedOp(null);
    setFreshId(null);
    setDone(false);
  }, [visible]);

  const expected = done ? null : PLAN[step];

  const wrong = useCallback((tileId: number | null) => {
    if (tileId !== null) setNudge((prev) => ({ id: tileId, n: prev.n + 1 }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const handleTile = useCallback(
    (id: number) => {
      if (!expected) return;
      if (phase === 'pickA') {
        if (id !== expected.a) return wrong(id);
        void Haptics.selectionAsync();
        setSelectedTile(id);
        setPhase('pickOp');
        return;
      }
      if (phase === 'pickB') {
        if (id !== expected.b) return wrong(id);
        const result = applyMove(board, expected.a, expected.op, expected.b);
        if (!result) return wrong(id);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBoard(result.board);
        setFreshId(result.created.id);
        setSelectedTile(null);
        setSelectedOp(null);
        if (step + 1 < PLAN.length) {
          setStep(step + 1);
          setPhase('pickA');
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setDone(true);
        }
        return;
      }
      // pickOp: a tile tap here is a slip, not a new selection.
      wrong(id);
    },
    [board, expected, phase, step, wrong],
  );

  const handleOp = useCallback(
    (op: Op) => {
      if (!expected || phase !== 'pickOp') return;
      if (op !== expected.op) return wrong(null);
      void Haptics.selectionAsync();
      setSelectedOp(op);
      setPhase('pickB');
    },
    [expected, phase, wrong],
  );

  // Fixed slots, the same as the real board.
  const slots = useMemo(() => {
    const map = new Map<number, Board['tiles'][number]>();
    for (const t of board.tiles) map.set(t.slot, t);
    return [0, 1, 2].map((s) => map.get(s) ?? null);
  }, [board]);

  const distance = Math.min(...board.tiles.map((t) => Math.abs(t.value - board.target)));
  const glowTile = expected && phase === 'pickA' ? expected.a : expected && phase === 'pickB' ? expected.b : null;
  const glowOp = expected && phase === 'pickOp' ? expected.op : null;
  const enter = (delay: number) => (motionOff ? undefined : FadeInDown.delay(delay).duration(320));

  return (
    <Modal visible={visible} animationType={motionOff ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={[styles.wrap, { paddingTop: insets.top + theme.space(4), paddingBottom: insets.bottom + theme.space(6) }]}>
        <View style={styles.topBar}>
          <Text style={styles.kicker}>HOW TO PLAY</Text>
          {!done ? (
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip tutorial">
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.headline} accessibilityRole="header">
          Make the target number
        </Text>

        <TargetDisplay target={board.target} distance={done ? 0 : distance} solved={done} />

        <View style={styles.tiles}>
          {slots.map((t, slot) => (
            <View key={slot} style={styles.slot}>
              {t ? (
                <Tile
                  key={t.id}
                  value={t.value}
                  selected={selectedTile === t.id}
                  dimmed={false}
                  fresh={freshId === t.id}
                  hinted={glowTile === t.id}
                  nudge={nudge.id === t.id ? nudge.n : 0}
                  onPress={() => handleTile(t.id)}
                />
              ) : (
                <View style={styles.emptySlot} accessibilityElementsHidden importantForAccessibility="no" />
              )}
            </View>
          ))}
        </View>

        <View style={styles.ops}>
          {OPS.map((op) => (
            <OpButton
              key={op}
              op={op}
              selected={selectedOp === op}
              hinted={glowOp === op}
              disabled={done || phase !== 'pickOp'}
              onPress={() => handleOp(op)}
            />
          ))}
        </View>

        {!done && expected ? (
          <Animated.View key={`${step}-${phase}`} entering={motionOff ? undefined : FadeIn.duration(180)} style={styles.coach}>
            <Text style={styles.coachText} accessibilityLiveRegion="polite">
              {instruction(step, phase, board)}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.after}>
            <Animated.Text entering={enter(0)} style={styles.win} accessibilityLiveRegion="polite">
              You made 16. That’s the whole game.
            </Animated.Text>
            <Animated.View entering={enter(80)} style={styles.rules}>
              <Rule text="Combine any two tiles with + − × ÷." />
              <Rule text="Results must be whole numbers, so no fractions or negatives." />
              <Rule text="Use as few moves as you can. You don’t need every tile." />
              <Rule text="Five puzzles a day, the same for everyone." />
            </Animated.View>
            <Animated.View entering={enter(160)} style={styles.actions}>
              <Button label="Play today’s puzzles" variant="primary" onPress={onPlay} />
              <Button label="Read the full rules" variant="ghost" onPress={onRules} />
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.rule}>
      <View style={styles.dot} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.color.bg, paddingHorizontal: theme.space(6), alignItems: 'center' },
  topBar: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  kicker: { color: theme.color.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  skip: { color: theme.color.textDim, fontSize: 15, fontWeight: '700' },
  headline: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: theme.space(4),
    marginBottom: theme.space(2),
  },
  tiles: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.space(3) },
  slot: { width: TILE_SIZE, height: TILE_SIZE, margin: theme.space(1.5) },
  emptySlot: {
    flex: 1,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.color.border,
    opacity: 0.5,
  },
  ops: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.space(5) },
  coach: {
    marginTop: theme.space(6),
    paddingVertical: theme.space(3.5),
    paddingHorizontal: theme.space(5),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.accentDim,
    backgroundColor: 'rgba(198,242,78,0.08)',
    alignSelf: 'stretch',
  },
  coachText: { color: theme.color.accent, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  after: { alignSelf: 'stretch', marginTop: theme.space(5), flex: 1 },
  win: { color: theme.color.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  rules: { marginTop: theme.space(4), gap: theme.space(2.5) },
  rule: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color.accent,
    marginTop: 8,
    marginRight: theme.space(3),
  },
  ruleText: { flex: 1, color: theme.color.textDim, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  actions: { marginTop: 'auto', gap: theme.space(2), paddingTop: theme.space(5) },
});
