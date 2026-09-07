import { Platform } from 'react-native';

/**
 * One place for every colour, radius and type ramp. Keeping the palette here
 * (rather than inline) is what lets the whole app be re-skinned for a seasonal
 * event later without hunting through screens.
 */
export const theme = {
  color: {
    bg: '#08090D',
    surface: '#12141C',
    surfaceHigh: '#1B1F2A',
    tile: '#1E2330',
    tileActive: '#2C3444',
    border: '#252B39',

    /** Brand accent. Electric lime reads as "correct" without being literal. */
    accent: '#C6F24E',
    accentDim: '#7E9B2E',

    success: '#4ADE80',
    warn: '#FF6B6B',
    gold: '#FFC64B',

    text: '#F2F4F8',
    textDim: '#8B93A7',
    textFaint: '#565E70',
  },

  radius: { sm: 10, md: 16, lg: 22, pill: 999 },

  space: (n: number) => n * 4,

  font: {
    /** Tabular figures stop the timer and target from jittering as they tick. */
    numeric: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },

  /** Consistent shadow so raised surfaces agree across platforms. */
  lift: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

export type Theme = typeof theme;
