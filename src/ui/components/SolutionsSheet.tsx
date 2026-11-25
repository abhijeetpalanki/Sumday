import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { findShortestSolution, type Puzzle, type Step } from '../../engine/puzzle';
import type { SlotResult } from '../../state/storage';
import { slotEmoji } from '../../share';
import { OP_GLYPH, OP_LABEL } from '../opGlyph';
import { theme } from '../theme';
import { Button } from './Button';
import * as Haptics from '../haptics';

interface Props {
  visible: boolean;
  puzzles: Puzzle[];
  results: (SlotResult | null)[];
  onClose: () => void;
}

function statusText(r: SlotResult | null): string {
  if (!r || r.status === 'skipped') return 'Skipped';
  if (slotEmoji(r) === '🟩') return 'Solved at par';
  return r.hints > 0 ? 'Solved with a hint' : `Solved in ${r.ops}`;
}

/**
 * One shortest route through each of today's puzzles.
 *
 * Collapsed by default, one reveal per puzzle, so a player who wants to
 * have another go at puzzle 5 in their head isn't spoiled by seeing it
 * next to puzzle 4's answer.
 */
export function SolutionsSheet({ visible, puzzles, results, onClose }: Props) {
  // The solver is a few milliseconds per puzzle; compute once per day's set.
  const solutions = useMemo(
    () => puzzles.map((p) => findShortestSolution(p.numbers, p.target)),
    [puzzles],
  );
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());

  const toggle = (i: number) => {
    void Haptics.selectionAsync();
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Solutions</Text>
            <Text style={styles.lead}>
              One shortest way through each puzzle. There are often others.
            </Text>

            {puzzles.map((p, i) => {
              const steps = solutions[i];
              const shown = open.has(i);
              return (
                <View key={i} style={styles.card}>
                  <Pressable
                    onPress={() => toggle(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Puzzle ${i + 1}, make ${p.target}. ${statusText(results[i] ?? null)}.`}
                    accessibilityHint={shown ? 'Hides the solution' : 'Shows a solution'}
                    accessibilityState={{ expanded: shown }}
                    hitSlop={4}
                    style={({ pressed }) => [styles.cardHead, pressed && styles.pressed]}
                  >
                    <View style={styles.cardHeadText}>
                      <Text style={styles.cardTitle}>
                        {i + 1}. Make <Text style={styles.target}>{p.target}</Text>
                      </Text>
                      <Text style={styles.tiles}>
                        {p.numbers.join('   ')}
                        <Text style={styles.status}>{'   ·   '}{statusText(results[i] ?? null)}</Text>
                      </Text>
                    </View>
                    <Text style={styles.toggle}>{shown ? 'Hide' : 'Show'}</Text>
                  </Pressable>

                  {shown ? <StepList steps={steps} target={p.target} /> : null}
                </View>
              );
            })}
          </ScrollView>

          <Button label="Done" variant="primary" onPress={onClose} style={styles.cta} />
        </View>
      </View>
    </Modal>
  );
}

function StepList({ steps, target }: { steps: Step[] | null; target: number }) {
  // Unreachable in practice: the generator only emits solvable puzzles.
  if (!steps || steps.length === 0) {
    return <Text style={styles.step}>No route found.</Text>;
  }
  return (
    <View style={styles.steps}>
      {steps.map((s, k) => {
        const last = k === steps.length - 1;
        return (
          <Text
            key={k}
            style={[styles.step, last && styles.stepLast]}
            accessibilityLabel={`${s.a} ${OP_LABEL[s.op]} ${s.b} equals ${s.result}`}
          >
            {s.a} {OP_GLYPH[s.op]} {s.b} = {s.result}
            {last && s.result === target ? '  ✓' : ''}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: theme.space(6),
    paddingHorizontal: theme.space(6),
    paddingBottom: theme.space(10),
    maxHeight: '88%',
    ...Platform.select({ web: { width: '100%', maxWidth: 520, alignSelf: 'center' } as const, default: {} }),
  },
  content: { paddingBottom: theme.space(4) },
  title: { color: theme.color.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  lead: {
    color: theme.color.textDim,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: theme.space(1.5),
    marginBottom: theme.space(5),
  },
  card: {
    backgroundColor: theme.color.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: theme.space(3),
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.space(3.5),
    paddingHorizontal: theme.space(4),
    minHeight: 56,
  },
  pressed: { backgroundColor: theme.color.surfaceHigh },
  cardHeadText: { flex: 1 },
  cardTitle: { color: theme.color.text, fontSize: 16, fontWeight: '800' },
  target: { color: theme.color.accent, fontVariant: ['tabular-nums'] },
  tiles: {
    color: theme.color.textDim,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  status: { color: theme.color.textFaint, fontWeight: '600' },
  toggle: { color: theme.color.accent, fontSize: 14, fontWeight: '800', marginLeft: theme.space(3) },
  steps: {
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(4),
    gap: theme.space(1),
  },
  step: {
    color: theme.color.textDim,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stepLast: { color: theme.color.accent },
  cta: { marginTop: theme.space(4) },
});
