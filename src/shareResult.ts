import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Hands the share card to whatever the platform does best.
 *
 * Native: the OS share sheet. Web: the share sheet on touch devices that have
 * one (iOS/Android browsers), otherwise copy to clipboard, which is what
 * desktop players expect and what react-native-web's Share cannot do (it
 * rejects outright when navigator.share is missing, e.g. desktop Firefox).
 */
export async function shareResult(message: string): Promise<ShareOutcome> {
  if (Platform.OS !== 'web') {
    try {
      const res = await Share.share({ message });
      return res.action === Share.dismissedAction ? 'cancelled' : 'shared';
    } catch {
      return 'cancelled';
    }
  }

  if (typeof navigator === 'undefined') return 'failed';

  const touch =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: message });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Fall through to the clipboard (e.g. NotAllowedError in an in-app webview).
    }
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(message);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}
