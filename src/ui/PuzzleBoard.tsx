import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  applyMove,
  bestDistance,
  hintFor,
  isSolved,
  newBoard,
  OPS,
  resetBoard,
  undoMove,
  type Board,
  type Hint,
  type Op,
  type Puzzle,
} from '../engine/puzzle';
import { theme } from './theme';
import { OP_GLYPH } from './opGlyph';
import { Tile } from './components/Tile';
import { OpButton } from './components/OpButton';
import { TargetDisplay } from './components/TargetDisplay';

interface Props {
  puzzle: Puzzle;
  /** Changes whenever the parent advances to a new puzzle; resets the board. */
  puzzleId: string;
  onSolved: (ops: number) => void;
  onSkip: () => void;
  skipLabel: string;
  /** Hints the player may still spend. 0 disables the button. */
  hintsLeft: number;
  /** Rendered on the hint button, e.g. "Hint · 2 left" or "Hint −10s". */
  hintLabel: string;
  onUseHint: () => void;
}

/**
 * The board itself: tiles, operators, and the tap-op-tap interaction.
 *
 * Owns only in-puzzle state. Timing, scoring and persistence belong to the
 * parent screen so the same board serves both Daily and Endless.
 */
export function PuzzleBoard({
  puzzle,
  puzzleId,
  onSolved,
  onSkip,
  skipLabel,
  hintsLeft,
  hintLabel,
  onUseHint,
}: Props) {
  const [board, setBoard] = useState<Board>(() => newBoard(puzzle));
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [selectedOp, setSelectedOp] = useState<Op | null>(null);
  const [freshId, setFreshId] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  // Hint state. Level 1 points at the two tiles; level 2 also names the
  // operator. Each level costs one hint.
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [deadEnd, setDeadEnd] = useState(false);

  const shake = useSharedValue(0);

  // Pending "advance to the next puzzle" timer, so leaving the screen
  // mid-celebration cannot score a puzzle the player never finished.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  /** Any board change invalidates the current hint and re-tests reachability. */
  const settleBoard = useCallback((next: Board) => {
    setBoard(next);
    setSelectedTile(null);
    setSelectedOp(null);
    setHint(null);
    setHintLevel(0);
    // Warn as soon as the target becomes unreachable, unprompted and for
    // free. Combining tiles into a dead position is where players actually
    // get stranded, and no amount of staring gets them out of it.
    setDeadEnd(!isSolved(next) && hintFor(next).kind === 'dead-end');
  }, []);

  // A new puzzle arrives as a new puzzleId; rebuild from scratch.
  useEffect(() => {
    clearAdvance();
    setBoard(newBoard(puzzle));
    setSelectedTile(null);
    setSelectedOp(null);
    setFreshId(null);
    setSolved(false);
    setHint(null);
    setHintLevel(0);
    setDeadEnd(false);
  }, [puzzleId, puzzle, clearAdvance]);

  useEffect(() => clearAdvance, [clearAdvance]);

  const reject = useCallback(() => {
    shake.value = withSequence(
      withTiming(-9, { duration: 55 }),
      withTiming(9, { duration: 55 }),
      withTiming(-6, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shake]);

  const handleTile = useCallback(
    (id: number) => {
      if (solved) return;

      // Tapping the selected tile clears the whole in-progress move.
      if (selectedTile === id) {
        setSelectedTile(null);
        setSelectedOp(null);
        void Haptics.selectionAsync();
        return;
      }

      if (selectedTile === null || selectedOp === null) {
        setSelectedTile(id);
        setSelectedOp(null);
        void Haptics.selectionAsync();
        return;
      }

      const result = applyMove(board, selectedTile, selectedOp, id);
      if (!result) {
        reject();
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFreshId(result.created.id);
      settleBoard(result.board);

      if (isSolved(result.board)) {
        setSolved(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Let the solve animation land before the parent advances.
        advanceTimer.current = setTimeout(() => {
          advanceTimer.current = null;
          onSolved(result.board.opsUsed);
        }, 900);
      }
    },
    [board, onSolved, reject, selectedOp, selectedTile, settleBoard, solved],
  );

  const handleOp = useCallback(
    (op: Op) => {
      if (solved || selectedTile === null) return;
      setSelectedOp((prev) => (prev === op ? null : op));
      void Haptics.selectionAsync();
    },
    [selectedTile, solved],
  );

  const handleUndo = useCallback(() => {
    if (solved || board.history.length === 0) return;
    setFreshId(null);
    settleBoard(undoMove(board));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [board, settleBoard, solved]);

  const handleReset = useCallback(() => {
    if (solved || board.history.length === 0) return;
    setFreshId(null);
    settleBoard(resetBoard(board));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [board, settleBoard, solved]);

  const handleHint = useCallback(() => {
    if (solved || hintsLeft <= 0 || hintLevel >= 2) return;

    if (hintLevel === 0) {
      const next = hintFor(board);
      if (next.kind === 'dead-end') {
        // Nothing to point at. Surface it, but don't charge for the bad news.
        setDeadEnd(true);
        reject();
        return;
      }
      setHint(next);
      setHintLevel(1);
    } else {
      setHintLevel(2);
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUseHint();
  }, [board, hintLevel, hintsLeft, onUseHint, reject, solved]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const distance = useMemo(() => bestDistance(board), [board]);
  const canUndo = board.history.length > 0 && !solved;
  const hintedMove = hint?.kind === 'move' ? hint : null;

  return (
    <View style={styles.wrap}>
      <TargetDisplay target={board.target} distance={distance} solved={solved} />

      <Animated.View style={[styles.tiles, shakeStyle]}>
        {board.tiles.map((t) => (
          <Tile
            key={t.id}
            value={t.value}
            selected={selectedTile === t.id}
            dimmed={selectedTile !== null && selectedTile !== t.id && selectedOp === null}
            fresh={freshId === t.id}
            hinted={
              !solved && hintedMove !== null && (t.id === hintedMove.aId || t.id === hintedMove.bId)
            }
            onPress={() => handleTile(t.id)}
          />
        ))}
      </Animated.View>

      <View style={styles.ops}>
        {OPS.map((op) => (
          <OpButton
            key={op}
            op={op}
            selected={selectedOp === op}
            hinted={hintLevel === 2 && hintedMove?.op === op}
            disabled={selectedTile === null || solved}
            onPress={() => handleOp(op)}
          />
        ))}
      </View>

      <MessageStrip
        deadEnd={deadEnd && !solved}
        hintLevel={solved ? 0 : hintLevel}
        move={hintedMove}
      />

      <View style={styles.footer}>
        <FooterAction label="Undo" onPress={handleUndo} disabled={!canUndo} />
        <FooterAction label="Reset" onPress={handleReset} disabled={!canUndo} />
        <FooterAction
          label={hintLevel >= 2 ? 'Hint shown' : hintLabel}
          onPress={handleHint}
          disabled={solved || hintsLeft <= 0 || hintLevel >= 2}
          tone="accent"
        />
        <FooterAction label={skipLabel} onPress={onSkip} disabled={solved} tone="warn" />
      </View>

      <Text style={styles.par}>
        {solved
          ? `Solved in ${board.opsUsed} ${board.opsUsed === 1 ? 'move' : 'moves'}`
          : `Par ${puzzle.parOps} · ${board.opsUsed} used`}
      </Text>
    </View>
  );
}

/** The one place the board talks to the player in words. */
function MessageStrip({
  deadEnd,
  hintLevel,
  move,
}: {
  deadEnd: boolean;
  hintLevel: 0 | 1 | 2;
  move: Extract<Hint, { kind: 'move' }> | null;
}) {
  let text: string | null = null;
  let tone: 'warn' | 'accent' = 'accent';

  if (deadEnd) {
    text = 'No way to reach the target from here — undo or reset.';
    tone = 'warn';
  } else if (hintLevel === 2 && move) {
    text = `Try ${move.a} ${OP_GLYPH[move.op]} ${move.b}`;
  } else if (hintLevel === 1) {
    text = 'Start with the two highlighted tiles.';
  }

  if (!text) return <View style={styles.stripSpacer} />;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.strip, tone === 'warn' ? styles.stripWarn : styles.stripAccent]}
    >
      <Text style={[styles.stripText, tone === 'warn' && styles.stripTextWarn]}>{text}</Text>
    </Animated.View>
  );
}

function FooterAction({
  label,
  onPress,
  disabled,
  tone,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'warn' | 'accent';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      style={({ pressed }) => [styles.footerAction, pressed && !disabled && styles.footerPressed]}
    >
      <Text
        style={[
          styles.footerText,
          tone === 'warn' && styles.footerWarn,
          tone === 'accent' && styles.footerAccent,
          disabled && styles.footerDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    marginTop: theme.space(3),
  },
  ops: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.space(5) },

  // Reserved height keeps the footer from jumping when a message appears.
  stripSpacer: { height: 46, marginTop: theme.space(4) },
  strip: {
    height: 46,
    justifyContent: 'center',
    marginTop: theme.space(4),
    marginHorizontal: theme.space(4),
    paddingHorizontal: theme.space(4),
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  stripAccent: { backgroundColor: 'rgba(198,242,78,0.08)', borderColor: theme.color.accentDim },
  stripWarn: { backgroundColor: 'rgba(255,107,107,0.10)', borderColor: theme.color.warn },
  stripText: {
    color: theme.color.accent,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stripTextWarn: { color: theme.color.warn },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space(5),
    marginTop: theme.space(5),
    paddingHorizontal: theme.space(4),
  },
  footerAction: { paddingVertical: theme.space(2), paddingHorizontal: theme.space(1) },
  footerPressed: { opacity: 0.6 },
  footerText: {
    color: theme.color.textDim,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  footerWarn: { color: theme.color.warn },
  footerAccent: { color: theme.color.accent },
  footerDisabled: { color: theme.color.textFaint, opacity: 0.5 },
  par: {
    color: theme.color.textFaint,
    fontSize: 13,
    fontWeight: '600',
    marginTop: theme.space(3),
    fontVariant: ['tabular-nums'],
  },
});
