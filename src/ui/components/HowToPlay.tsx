import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * First-run rules.
 *
 * Shown automatically on first launch and reachable from Home afterwards.
 * App Review rejects games whose rules aren't discoverable in-app, so this
 * screen is a submission requirement as much as a UX one.
 */
export function HowToPlay({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>How to play</Text>

            <Rule
              n="1"
              title="Hit the target"
              body="You get five number tiles and one target. Combine tiles until a tile equals the target."
            />
            <Rule
              n="2"
              title="Tap, operator, tap"
              body="Tap a tile, choose + − × ÷, then tap a second tile. The two tiles merge into their result."
            />
            <Rule
              n="3"
              title="Whole numbers only"
              body="Every result must be a positive whole number. 3 − 8 and 7 ÷ 2 are not allowed."
            />
            <Rule
              n="4"
              title="Beat par"
              body="Par is the fewest moves possible. Solve at par for a green square, over par for yellow. You don't have to use every tile."
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>If you get stuck</Text>
            <Text style={styles.body}>
              You get three hints a day. The first points at the two tiles to combine; tap again
              and it names the operator too. A hinted puzzle scores yellow rather than green.
              {'\n\n'}
              If you combine tiles into a position the target can't be reached from, the board
              tells you straight away — undo and try another route. That warning is always free.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Your daily</Text>
            <Text style={styles.body}>
              Five puzzles, getting harder. Everyone in the world gets the same five. Come back
              tomorrow to keep your streak alive.
            </Text>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleLabel}>EXAMPLE</Text>
              <Text style={styles.exampleTiles}>3   7   25   2   50</Text>
              <Text style={styles.exampleTarget}>Target 174</Text>
              <Text style={styles.exampleSolve}>
                25 × 7 = 175{'\n'}
                175 − 3 = 172{'\n'}
                172 + 2 = 174{'  '}✓
              </Text>
            </View>
          </ScrollView>

          <Button label="Got it" variant="primary" onPress={onClose} style={styles.cta} />
        </View>
      </View>
    </Modal>
  );
}

function Rule({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View style={styles.rule}>
      <View style={styles.bullet}>
        <Text style={styles.bulletText}>{n}</Text>
      </View>
      <View style={styles.ruleText}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
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
  },
  content: { paddingBottom: theme.space(4) },
  title: {
    color: theme.color.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: theme.space(5),
  },
  rule: { flexDirection: 'row', marginBottom: theme.space(4.5) },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.space(3),
  },
  bulletText: { color: theme.color.bg, fontWeight: '900', fontSize: 14 },
  ruleText: { flex: 1 },
  ruleTitle: { color: theme.color.text, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  body: { color: theme.color.textDim, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  divider: {
    height: 1,
    backgroundColor: theme.color.border,
    marginVertical: theme.space(3),
  },
  sectionTitle: {
    color: theme.color.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: theme.space(1.5),
  },
  exampleBox: {
    backgroundColor: theme.color.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space(4),
    marginTop: theme.space(5),
  },
  exampleLabel: {
    color: theme.color.textFaint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: theme.space(2),
  },
  exampleTiles: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  exampleTarget: {
    color: theme.color.accent,
    fontSize: 16,
    fontWeight: '800',
    marginTop: theme.space(1),
    marginBottom: theme.space(2.5),
  },
  exampleSolve: {
    color: theme.color.textDim,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cta: { marginTop: theme.space(4) },
});
