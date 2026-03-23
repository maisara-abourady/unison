// Deep link handler — opens tracks in native apps with browser fallback.
import { Linking } from 'react-native';
import type { Track } from '../types';

// Why: canOpenURL on iOS requires declared schemes in app.json (LSApplicationQueriesSchemes).
// Without this, canOpenURL always returns false. Full testing requires an EAS dev build — not
// testable in Expo Go for all URI schemes.
export async function openTrack(track: Track): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(track.deepLinkUri);
    if (canOpen) {
      await Linking.openURL(track.deepLinkUri);
    } else {
      await Linking.openURL(track.webFallbackUrl);
    }
  } catch {
    // Why: if deep link throws (e.g., malformed URI), fall back to web URL in system browser.
    await Linking.openURL(track.webFallbackUrl);
  }
}
