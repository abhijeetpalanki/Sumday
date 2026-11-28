import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import type { ShareCardModel } from './share';
import type { ShareOutcome } from './shareResult';

export type ImageOutcome = ShareOutcome | 'saved';

/** What the image button says on this platform. */
export function imageShareLabel(): string {
  return 'Share image';
}

/**
 * Captures the off-screen ShareCard at 3x and hands the PNG to the share
 * sheet. Android's Share API takes text only, so files go through
 * expo-sharing. The PNG lives in the cache directory and never leaves the
 * device unless the player picks an app to send it to.
 */
export async function shareImage(opts: {
  view: RefObject<View | null>;
  card: ShareCardModel;
  filename: string;
}): Promise<ImageOutcome> {
  const node = opts.view.current;
  if (!node) return 'failed';
  try {
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    const uri = await captureRef(node, { format: 'png', result: 'tmpfile', width: 1080, height: 1350 });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: opts.card.title });
    // expo-sharing resolves the same way whether the player sent it or backed out.
    return 'shared';
  } catch {
    return 'failed';
  }
}
