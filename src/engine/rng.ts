/**
 * Deterministic seeded randomness.
 *
 * Everyone in the world must get byte-identical puzzles for a given date, so
 * nothing here may touch Math.random(), Date.now(), or platform APIs.
 */

/** String -> 32-bit seed. Public-domain xmur3. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** 32-bit seed -> uniform [0,1). Public-domain mulberry32. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Uniform float in [0,1). */
  next(): number;
  /** Uniform integer in [0,n). */
  int(n: number): number;
  /** Uniform integer in [lo,hi] inclusive. */
  range(lo: number, hi: number): number;
  /** Uniform element of a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /** Fisher-Yates, returns a new array. */
  shuffle<T>(arr: readonly T[]): T[];
}

export function makeRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)());
  const int = (n: number) => Math.floor(next() * n);
  return {
    next,
    int,
    range: (lo, hi) => lo + int(hi - lo + 1),
    pick: <T,>(arr: readonly T[]) => arr[int(arr.length)],
    shuffle: <T,>(arr: readonly T[]) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const t = out[i];
        out[i] = out[j];
        out[j] = t;
      }
      return out;
    },
  };
}
